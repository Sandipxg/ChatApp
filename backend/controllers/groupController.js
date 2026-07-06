import mongoose from 'mongoose'
import { Conversation } from '../models/conversationModel.js'
import { User } from '../models/userModel.js'
import { Message } from '../models/messageModel.js'
import AppError from '../utils/AppError.js'
import { getIo } from '../services/socketService.js'

/**
 * Utility to verify group membership and retrieve the requester's role
 */
async function getGroupAndUserRole(chatId, userId) {
  if (!mongoose.Types.ObjectId.isValid(chatId)) {
    throw new AppError('Invalid chat ID', 400)
  }

  const conversation = await Conversation.findById(chatId)
  if (!conversation) {
    throw new AppError('Group conversation not found', 404)
  }

  if (!conversation.isGroup) {
    throw new AppError('This is not a group conversation', 400)
  }

  const member = conversation.members.find((m) => m.userId.toString() === userId)
  if (!member) {
    throw new AppError('Forbidden: You are not a member of this group', 403)
  }

  return { conversation, userRole: member.role }
}

/**
 * Helper to create, save, and broadcast a system event log inside the chat
 */
async function createSystemMessage(chatId, senderId, text) {
  try {
    const message = await Message.create({
      chatId,
      senderId,
      text,
      messageType: 'system',
      status: 'sent'
    })
    
    await Conversation.findByIdAndUpdate(chatId, { lastMessage: message._id })
    
    const io = getIo()
    if (io) {
      io.to(chatId).emit('new_message', {
        ...message.toObject(),
        senderName: 'System'
      })
    }
    return message
  } catch (error) {
    console.error('Failed to create system message:', error)
  }
}

/**
 * Creates a new group conversation.
 * POST /api/chat/groups
 * Payload: { name, memberIds, avatar }
 */
export async function createGroup(req, res, next) {
  try {
    const { name, memberIds = [], avatar = null } = req.body
    const creatorId = req.userId

    if (!name || !name.trim()) {
      throw new AppError('Group name is required', 400)
    }

    // Build the members list starting with the owner
    const members = [{ userId: creatorId, role: 'owner' }]

    // Filter out duplicate or invalid member IDs, and exclude the creator
    const uniqueIds = Array.from(new Set(memberIds)).filter(
      (id) => mongoose.Types.ObjectId.isValid(id) && id !== creatorId
    )

    // Verify all requested members exist in database
    if (uniqueIds.length > 0) {
      const existingCount = await User.countDocuments({ _id: { $in: uniqueIds } })
      if (existingCount !== uniqueIds.length) {
        throw new AppError('One or more group members do not exist', 404)
      }
      uniqueIds.forEach((id) => {
        members.push({ userId: id, role: 'member' })
      })
    }

    const newGroup = await Conversation.create({
      name: name.trim(),
      avatar,
      isGroup: true,
      members,
    })

    // Create system message for group creation
    try {
      const creator = await User.findById(creatorId).select('name username')
      const creatorName = creator ? (creator.username || creator.name) : 'Someone'
      await createSystemMessage(newGroup._id, creatorId, `${creatorName} created group "${newGroup.name}"`)
    } catch (e) {
      console.error('Error creating group creation system message:', e)
    }

    // Notify online members via socket room joins if they are connected
    const io = getIo()
    if (io) {
      // Broadcast update so online members can refresh their sidebar
      members.forEach((m) => {
        io.to(m.userId.toString()).emit('group_created', { chatId: newGroup._id.toString() })
      })
    }

    res.status(201).json(newGroup)
  } catch (error) {
    next(error)
  }
}

/**
 * Adds new members to an existing group.
 * POST /api/chat/groups/:chatId/members
 * Payload: { memberIds }
 */
export async function addMembers(req, res, next) {
  try {
    const { chatId } = req.params
    const { memberIds = [] } = req.body
    const requesterId = req.userId

    const { conversation, userRole } = await getGroupAndUserRole(chatId, requesterId)

    // Authorization check: Only Owner and Admin can add members
    if (userRole !== 'owner' && userRole !== 'admin') {
      throw new AppError('Forbidden: Only owners and admins can add members', 403)
    }

    // Filter unique valid inputs that are not already in the group
    const existingMemberIds = new Set(conversation.members.map((m) => m.userId.toString()))
    const newIds = Array.from(new Set(memberIds)).filter(
      (id) => mongoose.Types.ObjectId.isValid(id) && !existingMemberIds.has(id)
    )

    if (newIds.length === 0) {
      return res.json(conversation)
    }

    // Verify added users exist
    const existingCount = await User.countDocuments({ _id: { $in: newIds } })
    if (existingCount !== newIds.length) {
      throw new AppError('One or more user IDs do not exist', 404)
    }

    newIds.forEach((id) => {
      conversation.members.push({ userId: id, role: 'member' })
    })

    await conversation.save()

    // Create system message
    try {
      const requester = await User.findById(requesterId).select('name username')
      const addedUsers = await User.find({ _id: { $in: newIds } }).select('name username')
      const requesterName = requester ? (requester.username || requester.name) : 'Someone'
      const addedNames = addedUsers.map((u) => u.username || u.name || 'User').join(', ')
      await createSystemMessage(chatId, requesterId, `${requesterName} added ${addedNames} to the group`)
    } catch (e) {
      console.error('Error creating add members system message:', e)
    }

    // Notify members via socket
    const io = getIo()
    if (io) {
      newIds.forEach((id) => {
        io.to(id).emit('group_added', { chatId })
      })
      io.to(chatId).emit('group_members_updated', { chatId, members: conversation.members })
    }

    res.json(conversation)
  } catch (error) {
    next(error)
  }
}

/**
 * Removes a member from a group.
 * DELETE /api/chat/groups/:chatId/members/:memberId
 */
export async function removeMember(req, res, next) {
  try {
    const { chatId, memberId } = req.params
    const requesterId = req.userId

    const { conversation, userRole } = await getGroupAndUserRole(chatId, requesterId)

    // Authorization check: Only Owner and Admin can remove members
    if (userRole !== 'owner' && userRole !== 'admin') {
      throw new AppError('Forbidden: Only owners and admins can remove members', 403)
    }

    // Find the member to remove
    const memberIndex = conversation.members.findIndex((m) => m.userId.toString() === memberId)
    if (memberIndex === -1) {
      throw new AppError('Member not found in this group', 404)
    }

    const targetMember = conversation.members[memberIndex]

    // Owners cannot be removed
    if (targetMember.role === 'owner') {
      throw new AppError('Bad Request: Cannot remove the owner of the group', 400)
    }

    // Admins cannot remove other admins
    if (userRole === 'admin' && targetMember.role === 'admin') {
      throw new AppError('Forbidden: Admins cannot remove other admins', 403)
    }

    conversation.members.splice(memberIndex, 1)
    await conversation.save()

    // Create system message
    try {
      const requester = await User.findById(requesterId).select('name username')
      const targetUser = await User.findById(memberId).select('name username')
      const requesterName = requester ? (requester.username || requester.name) : 'Someone'
      const targetName = targetUser ? (targetUser.username || targetUser.name) : 'User'
      await createSystemMessage(chatId, requesterId, `${requesterName} removed ${targetName} from the group`)
    } catch (e) {
      console.error('Error creating remove member system message:', e)
    }

    // Notify via socket
    const io = getIo()
    if (io) {
      io.to(memberId).emit('group_removed', { chatId })
      io.to(chatId).emit('group_members_updated', { chatId, members: conversation.members })
    }

    res.json(conversation)
  } catch (error) {
    next(error)
  }
}

/**
 * Updates a user's role in a group (Promote/Demote).
 * PATCH /api/chat/groups/:chatId/role
 * Payload: { memberId, role }
 */
export async function updateGroupRole(req, res, next) {
  try {
    const { chatId } = req.params
    const { memberId, role } = req.body
    const requesterId = req.userId

    if (!memberId || !['admin', 'member'].includes(role)) {
      throw new AppError('Valid member ID and role (admin/member) are required', 400)
    }

    const { conversation, userRole } = await getGroupAndUserRole(chatId, requesterId)

    // Find target member
    const targetMember = conversation.members.find((m) => m.userId.toString() === memberId)
    if (!targetMember) {
      throw new AppError('Member not found in this group', 404)
    }

    // Authorization checks:
    // 1. Only owner can promote/demote admins or change roles
    if (userRole !== 'owner') {
      throw new AppError('Forbidden: Only the group owner can manage roles', 403)
    }

    // 2. Owner cannot demote themselves
    if (memberId === requesterId) {
      throw new AppError('Bad Request: You cannot demote yourself', 400)
    }

    const actionText = role === 'admin' ? 'promoted to admin' : 'demoted to member'
    targetMember.role = role
    await conversation.save()

    // Create system message
    try {
      const requester = await User.findById(requesterId).select('name username')
      const targetUser = await User.findById(memberId).select('name username')
      const requesterName = requester ? (requester.username || requester.name) : 'Someone'
      const targetName = targetUser ? (targetUser.username || targetUser.name) : 'User'
      
      await createSystemMessage(
        chatId, 
        requesterId, 
        `${targetName} is being ${actionText} by ${requesterName}`
      )
    } catch (e) {
      console.error('Error creating role update system message:', e)
    }

    // Notify group room of role update
    const io = getIo()
    if (io) {
      io.to(chatId).emit('group_members_updated', { chatId, members: conversation.members })
    }

    res.json(conversation)
  } catch (error) {
    next(error)
  }
}

/**
 * Updates group name or avatar image.
 * PATCH /api/chat/groups/:chatId/details
 * Payload: { name, avatar }
 */
export async function updateGroupDetails(req, res, next) {
  try {
    const { chatId } = req.params
    const { name, avatar } = req.body
    const requesterId = req.userId

    const { conversation, userRole } = await getGroupAndUserRole(chatId, requesterId)

    // Authorization: Owner and Admin only
    if (userRole !== 'owner' && userRole !== 'admin') {
      throw new AppError('Forbidden: Only owners and admins can edit group details', 403)
    }

    let detailChanges = []

    if (name !== undefined) {
      if (!name || !name.trim()) {
        throw new AppError('Group name cannot be empty', 400)
      }
      if (conversation.name !== name.trim()) {
        conversation.name = name.trim()
        detailChanges.push(`renamed the group to "${conversation.name}"`)
      }
    }

    if (avatar !== undefined) {
      if (conversation.avatar !== avatar) {
        conversation.avatar = avatar
        detailChanges.push('updated the group avatar')
      }
    }

    await conversation.save()

    // Create system message if there are metadata updates
    if (detailChanges.length > 0) {
      try {
        const requester = await User.findById(requesterId).select('name username')
        const requesterName = requester ? (requester.username || requester.name) : 'Someone'
        const changeStr = detailChanges.join(' and ')
        await createSystemMessage(chatId, requesterId, `${requesterName} ${changeStr}`)
      } catch (e) {
        console.error('Error creating details update system message:', e)
      }
    }

    // Notify group via socket of changed metadata
    const io = getIo()
    if (io) {
      io.to(chatId).emit('group_details_updated', {
        chatId,
        name: conversation.name,
        avatar: conversation.avatar,
      })
    }

    res.json(conversation)
  } catch (error) {
    next(error)
  }
}

/**
 * Allows a member to leave the group.
 * POST /api/chat/groups/:chatId/leave
 */
export async function leaveGroup(req, res, next) {
  try {
    const { chatId } = req.params
    const requesterId = req.userId

    const { conversation, userRole } = await getGroupAndUserRole(chatId, requesterId)

    // If owner leaves, they must transfer ownership first or be the last member
    if (userRole === 'owner') {
      const otherMembers = conversation.members.filter((m) => m.userId.toString() !== requesterId)
      if (otherMembers.length > 0) {
        throw new AppError(
          'Bad Request: You must promote another member to owner before leaving',
          400
        )
      }
    }

    // Remove the user
    conversation.members = conversation.members.filter((m) => m.userId.toString() !== requesterId)

    if (conversation.members.length === 0) {
      // No members left: delete conversation document
      await Conversation.findByIdAndDelete(chatId)
      res.json({ message: 'Left successfully and group deleted' })
    } else {
      await conversation.save()

      // Create system message
      try {
        const requester = await User.findById(requesterId).select('name username')
        const requesterName = requester ? (requester.username || requester.name) : 'Someone'
        await createSystemMessage(chatId, requesterId, `${requesterName} left the group`)
      } catch (e) {
        console.error('Error creating leave group system message:', e)
      }

      // Notify via socket
      const io = getIo()
      if (io) {
        io.to(chatId).emit('group_members_updated', { chatId, members: conversation.members })
      }

      res.json({ message: 'Left successfully' })
    }
  } catch (error) {
    next(error)
  }
}
