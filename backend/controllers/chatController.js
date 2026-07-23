import mongoose from 'mongoose'
import { User } from '../models/userModel.js'
import { Message } from '../models/messageModel.js'
import { Conversation } from '../models/conversationModel.js'
import AppError from '../utils/AppError.js'
import { isUserOnline, getIo } from '../services/socketService.js'
import { v2 as cloudinary } from 'cloudinary'
import { notifyOfflineUsers } from '../services/pushNotificationService.js'

/**
 * Fetches all registered users in the database (excluding the logged-in user).
 */
export async function getContacts(req, res, next) {
  try {
    const currentUserId = req.userId
    const contacts = await User.find({ _id: { $ne: currentUserId } }).select('email name image username lastSeen publicKey')
    
    const clientContacts = contacts.map((user) => ({
      id: user._id.toString(),
      name: user.name || '',
      email: user.email,
      image: user.image,
      username: user.username || user.name || 'User',
      isOnline: isUserOnline(user._id.toString()),
      lastSeen: user.lastSeen,
      publicKey: user.publicKey || null,
    }))

    res.json(clientContacts)
  } catch (error) {
    next(error)
  }
}

/**
 * Fetches unique contacts (partners) with whom the current user has sent or received messages,
 * along with the latest message metadata.
 */
export async function getChatPartners(req, res, next) {
  try {
    const currentUserId = req.userId

    // Find all conversations where the user is a participant
    const conversations = await Conversation.find({
      'members.userId': currentUserId
    }).populate('lastMessage')

    const result = await Promise.all(conversations.map(async (convo) => {
      if (convo.isGroup) {
        const unreadCount = await Message.countDocuments({
          chatId: convo._id,
          senderId: { $ne: currentUserId },
          'readBy.userId': { $ne: currentUserId }
        })

        const memberInfo = convo.members.find(m => m.userId.toString() === currentUserId)
        const myRole = memberInfo ? memberInfo.role : 'member'

        return {
          id: convo._id.toString(),
          chatId: convo._id.toString(),
          name: convo.name || 'Group Chat',
          email: `${convo.members.length} members`,
          image: convo.avatar,
          username: convo.name || 'Group Chat',
          isGroup: true,
          isOnline: false,
          unreadCount,
          myRole,
          members: convo.members,
          latestMessage: convo.lastMessage
            ? {
                id: convo.lastMessage._id.toString(),
                chatId: convo.lastMessage.chatId.toString(),
                text: convo.lastMessage.isDeleted
                  ? 'This message was deleted'
                  : (convo.lastMessage.deletedBy && convo.lastMessage.deletedBy.some(id => id.toString() === currentUserId)
                    ? 'Message deleted'
                    : convo.lastMessage.text),
                isEncrypted: !!convo.lastMessage.isEncrypted,
                iv: convo.lastMessage.iv || null,
                senderId: convo.lastMessage.senderId.toString(),
                receiverId: convo.lastMessage.receiverId ? convo.lastMessage.receiverId.toString() : null,
                createdAt: convo.lastMessage.createdAt,
                status: convo.lastMessage.status,
              }
            : null,
        }
      }

      // Find the other participant in this 1-to-1 conversation
      const partnerMember = convo.members.find(m => m.userId.toString() !== currentUserId)
      if (!partnerMember) return null

      const partnerId = partnerMember.userId
      const user = await User.findById(partnerId).select('email name image username lastSeen publicKey')
      if (!user) return null

      const chatId = convo._id.toString()

      // Count unread messages in this conversation sent to current user
      const unreadCount = await Message.countDocuments({
        chatId,
        receiverId: currentUserId,
        status: { $ne: 'read' }
      })

      return {
        id: user._id.toString(),
        chatId,
        name: user.name || '',
        email: user.email,
        image: user.image,
        username: user.username || user.name || 'User',
        isOnline: isUserOnline(user._id.toString()),
        lastSeen: user.lastSeen,
        publicKey: user.publicKey || null,
        unreadCount,
        latestMessage: convo.lastMessage
          ? {
              id: convo.lastMessage._id.toString(),
              chatId: convo.lastMessage.chatId.toString(),
              text: convo.lastMessage.isDeleted
                ? 'This message was deleted'
                : (convo.lastMessage.deletedBy && convo.lastMessage.deletedBy.some(id => id.toString() === currentUserId)
                  ? 'Message deleted'
                  : convo.lastMessage.text),
              isEncrypted: !!convo.lastMessage.isEncrypted,
              iv: convo.lastMessage.iv || null,
              senderId: convo.lastMessage.senderId.toString(),
              receiverId: convo.lastMessage.receiverId ? convo.lastMessage.receiverId.toString() : null,
              createdAt: convo.lastMessage.createdAt,
              status: convo.lastMessage.status,
            }
          : null,
      }
    }))

    // Filter out any null partners
    const filteredResult = result.filter(Boolean)

    // Sort partners by the timestamp of their latest message in descending order
    filteredResult.sort((a, b) => {
      const timeA = a.latestMessage ? new Date(a.latestMessage.createdAt).getTime() : 0
      const timeB = b.latestMessage ? new Date(b.latestMessage.createdAt).getTime() : 0
      return timeB - timeA
    })

    res.json(filteredResult)
  } catch (error) {
    next(error)
  }
}

/**
 * Sends a message from the current user to a recipient.
 * Format of payload: { receiverId, text }
 */
export async function sendMsg(req, res, next) {
  try {
    const { receiverId, text } = req.body
    const senderId = req.userId

    if (!receiverId || !text) {
      throw new AppError('Receiver ID and text content are required', 400)
    }

    let conversation = await Conversation.findById(receiverId)
    let isGroup = false

    if (conversation && conversation.isGroup) {
      isGroup = true
    } else {
      const receiverExists = await User.exists({ _id: receiverId })
      if (!receiverExists) {
        throw new AppError('Recipient user or group not found', 404)
      }

      conversation = await Conversation.findOne({
        isGroup: false,
        'members.userId': { $all: [senderId, receiverId] },
        members: { $size: 2 }
      })

      if (!conversation) {
        conversation = await Conversation.create({
          isGroup: false,
          members: [
            { userId: senderId, role: 'member' },
            { userId: receiverId, role: 'member' }
          ]
        })
      }
    }

    const chatId = conversation._id.toString()
    const message = await Message.create({
      chatId,
      senderId,
      receiverId: isGroup ? null : receiverId,
      text,
      status: isGroup ? 'sent' : (isUserOnline(receiverId) ? 'delivered' : 'sent')
    })

    conversation.lastMessage = message._id
    await conversation.save()

    const populatedMessage = await Message.findById(message._id)
      .populate({
        path: 'parentMessageId',
        select: 'text messageType senderId isDeleted fileAttachment',
        populate: {
          path: 'senderId',
          select: 'name username'
        }
      })

    const io = getIo()
    if (io) {
      if (isGroup) {
        const sender = await User.findById(senderId).select('name')
        io.to(chatId).emit('new_message', {
          ...populatedMessage.toObject(),
          senderName: sender ? sender.name : 'User'
        })
      } else {
        io.to(senderId).to(receiverId).emit('new_message', populatedMessage)
      }
    }
    notifyOfflineUsers(populatedMessage).catch(console.error)

    res.status(201).json(populatedMessage)
  } catch (error) {
    next(error)
  }
}

/**
 * Fetches chat message history for a specific chatId.
 * Verifies that the requesting user is one of the participants.
 */
export async function getMsgByChatid(req, res, next) {
  try {
    const { chatId } = req.params
    const currentUserId = req.userId
    const { cursor, limit = 20 } = req.query

    // Validate limit (default 20, clamp between 1 and 100)
    const parsedLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100)

    let targetChatId = chatId
    let conversation = null

    if (chatId.includes('_')) {
      // Fallback compatibility: look up by old dynamic ID format (split and find conversation)
      const participants = chatId.split('_')
      if (!participants.includes(currentUserId)) {
        throw new AppError('Unauthorized: You are not a participant in this chat thread', 403)
      }

      // Check if there is an active conversation document for these participants
      conversation = await Conversation.findOne({
        isGroup: false,
        'members.userId': { $all: participants },
        members: { $size: 2 }
      })

      if (conversation) {
        targetChatId = conversation._id.toString()
      } else {
        // Return empty message history if conversation hasn't been created yet
        return res.json([])
      }
    } else {
      // Standard mongoose conversationId
      conversation = await Conversation.findById(chatId)
      if (!conversation) {
        throw new AppError('Conversation thread not found', 404)
      }

      if (!conversation.members.some(m => m.userId.toString() === currentUserId)) {
        throw new AppError('Unauthorized: You are not a participant in this chat thread', 403)
      }
    }

    // Build keyset pagination query
    const query = {
      chatId: targetChatId,
      deletedBy: { $ne: currentUserId } // Exclude messages deleted by current user
    }
    if (cursor && mongoose.Types.ObjectId.isValid(cursor)) {
      query._id = { $lt: cursor }
    }

    // Fetch messages in reverse chronological order (newest first)
    const messages = await Message.find(query)
      .sort({ _id: -1 })
      .limit(parsedLimit)
      .populate({
        path: 'parentMessageId',
        select: 'text messageType senderId isDeleted fileAttachment',
        populate: {
          path: 'senderId',
          select: 'name username'
        }
      })

    // Reverse documents in memory so that the final returned array is chronological (oldest first)
    messages.reverse()

    // Mark messages sent to the current user in this chat as read
    if (conversation.isGroup) {
      await Message.updateMany(
        {
          chatId: targetChatId,
          senderId: { $ne: currentUserId },
          'readBy.userId': { $ne: currentUserId }
        },
        { $addToSet: { readBy: { userId: currentUserId, readAt: new Date() } } }
      )
    } else {
      await Message.updateMany(
        { chatId: targetChatId, receiverId: currentUserId, status: { $ne: 'read' } },
        { $set: { status: 'read' } }
      )
    }

    // Sanitize soft-deleted messages
    const sanitizedMessages = messages.map(msg => {
      if (msg.isDeleted) {
        return {
          _id: msg._id,
          chatId: msg.chatId,
          senderId: msg.senderId,
          receiverId: msg.receiverId,
          isDeleted: true,
          deletedAt: msg.deletedAt,
          text: 'This message was deleted',
          messageType: 'text',
          fileAttachment: { url: null, name: null, size: null, mimeType: null },
          status: msg.status,
          readBy: msg.readBy,
          createdAt: msg.createdAt,
          updatedAt: msg.updatedAt
        }
      }
      return msg
    })

    res.json(sanitizedMessages)
  } catch (error) {
    next(error)
  }
}

/**
 * Fetches or creates a 1-to-1 conversation between the logged-in user and a partner.
 */
export async function getOrCreateConversation(req, res, next) {
  try {
    const currentUserId = req.userId
    const { partnerId } = req.params

    if (!partnerId || !mongoose.Types.ObjectId.isValid(partnerId)) {
      throw new AppError('Invalid partner ID', 400)
    }

    // Verify recipient user exists
    const partnerExists = await User.exists({ _id: partnerId })
    if (!partnerExists) {
      throw new AppError('Partner user not found', 404)
    }

    // Find existing conversation
    let conversation = await Conversation.findOne({
      isGroup: false,
      'members.userId': { $all: [currentUserId, partnerId] },
      members: { $size: 2 }
    }).populate('lastMessage')

    // If it doesn't exist, create it
    if (!conversation) {
      conversation = await Conversation.create({
        isGroup: false,
        members: [
          { userId: currentUserId, role: 'member' },
          { userId: partnerId, role: 'member' }
        ]
      })
    }

    res.json({
      chatId: conversation._id.toString(),
      isGroup: conversation.isGroup,
      participants: conversation.members.map(m => m.userId),
      lastMessage: conversation.lastMessage
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Generates a cryptographic signature for direct frontend-to-Cloudinary uploads.
 * If Cloudinary keys are missing, returns { mock: true }.
 */
export async function getUploadSignature(req, res, next) {
  try {
    const isConfigured = process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET
    
    if (!isConfigured) {
      return res.json({ mock: true })
    }

    const timestamp = Math.round(new Date().getTime() / 1000)
    const folder = 'chatapp-media'
    
    // Generate api signature
    const signature = cloudinary.utils.api_sign_request(
      {
        timestamp,
        folder
      },
      process.env.CLOUDINARY_API_SECRET
    )

    res.json({
      signature,
      timestamp,
      apiKey: process.env.CLOUDINARY_API_KEY,
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
      folder
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Saves a message referencing a directly-uploaded media file on Cloudinary.
 * Request format: JSON body: { receiverId, text, messageType, fileAttachment }
 */
export async function createMediaMessage(req, res, next) {
  try {
    const senderId = req.userId
    const { receiverId, text, messageType, fileAttachment, parentMessageId } = req.body

    if (!receiverId) {
      throw new AppError('Receiver ID is required', 400)
    }

    if (!messageType || !['image', 'video', 'audio'].includes(messageType)) {
      throw new AppError('Invalid or missing messageType', 400)
    }

    if (!fileAttachment || !fileAttachment.url || !fileAttachment.name || !fileAttachment.size || !fileAttachment.mimeType) {
      throw new AppError('Complete fileAttachment metadata is required', 400)
    }

    // 1. Find or create conversation
    let conversation = await Conversation.findById(receiverId)
    let isGroup = false
    let chatId = null

    if (conversation && conversation.isGroup) {
      isGroup = true
      chatId = conversation._id.toString()
    } else {
      // 1-to-1 conversation setup
      const receiverExists = await User.exists({ _id: receiverId })
      if (!receiverExists) {
        throw new AppError('Recipient user not found', 404)
      }

      conversation = await Conversation.findOne({
        isGroup: false,
        'members.userId': { $all: [senderId, receiverId] },
        members: { $size: 2 }
      })

      if (!conversation) {
        conversation = await Conversation.create({
          isGroup: false,
          members: [
            { userId: senderId, role: 'member' },
            { userId: receiverId, role: 'member' }
          ]
        })
      }
      chatId = conversation._id.toString()
    }

    // 2. Create message in database
    const message = await Message.create({
      chatId,
      senderId,
      receiverId: isGroup ? null : receiverId,
      text: text || '',
      messageType,
      fileAttachment,
      parentMessageId: parentMessageId || null,
      status: isGroup ? 'sent' : (isUserOnline(receiverId) ? 'delivered' : 'sent'),
    })

    // 3. Update lastMessage on conversation
    conversation.lastMessage = message._id
    await conversation.save()

    // Populate parentMessageId before broadcasting and responding
    const populatedMessage = await Message.findById(message._id)
      .populate({
        path: 'parentMessageId',
        select: 'text messageType senderId isDeleted fileAttachment',
        populate: {
          path: 'senderId',
          select: 'name username'
        }
      })

    // 4. Broadcast in real time via Socket.IO
    const io = getIo()
    if (io) {
      if (isGroup) {
        // Find sender's name to match standard group socket payload
        const sender = await User.findById(senderId).select('name')
        io.to(chatId).emit('new_message', {
          ...populatedMessage.toObject(),
          senderName: sender ? sender.name : 'User'
        })
      } else {
        io.to(senderId).to(receiverId).emit('new_message', populatedMessage)
      }
    }
    notifyOfflineUsers(populatedMessage).catch(console.error)

    res.status(201).json(populatedMessage)
  } catch (error) {
    next(error)
  }
}

/**
 * Edits an existing text message.
 * Constraints:
 * 1. Must be the sender.
 * 2. Message type must be 'text'.
 * 3. Within 10 minutes of sending.
 * 4. Can only be edited once.
 */
export async function editMsg(req, res, next) {
  try {
    const { messageId } = req.params
    const { text } = req.body
    const userId = req.userId

    if (!text || !text.trim()) {
      throw new AppError('Message text is required', 400)
    }

    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000)

    const updatedMessage = await Message.findOneAndUpdate(
      {
        _id: messageId,
        senderId: userId,
        messageType: 'text',
        createdAt: { $gte: tenMinutesAgo },
        isEdited: false,
        isDeleted: false // Prevent editing deleted messages
      },
      {
        $set: {
          text: text.trim(),
          isEdited: true,
          editedAt: new Date()
        }
      },
      { new: true }
    )

    if (!updatedMessage) {
      const message = await Message.findById(messageId)
      if (!message) {
        throw new AppError('Message not found', 404)
      }
      if (message.senderId.toString() !== userId) {
        throw new AppError('Unauthorized: You can only edit your own messages', 403)
      }
      if (message.isDeleted) {
        throw new AppError('Deleted messages cannot be edited', 400)
      }
      if (message.messageType !== 'text') {
        throw new AppError('Only text messages can be edited', 400)
      }
      if (message.isEdited) {
        throw new AppError('Messages can only be edited once', 400)
      }
      if (new Date() - new Date(message.createdAt) > 10 * 60 * 1000) {
        throw new AppError('Messages can only be edited within 10 minutes of sending', 400)
      }
      throw new AppError('Failed to edit message', 400)
    }

    // Broadcast the message edit in real time
    const io = getIo()
    if (io) {
      if (updatedMessage.receiverId) {
        // 1-to-1 chat: notify both users
        io.to(updatedMessage.senderId.toString())
          .to(updatedMessage.receiverId.toString())
          .emit('message_edit', updatedMessage)
      } else {
        // Group chat: notify the group room
        io.to(updatedMessage.chatId.toString()).emit('message_edit', updatedMessage)
      }
    }

    res.json(updatedMessage)
  } catch (error) {
    next(error)
  }
}

/**
 * Deletes a message for everyone (global soft delete).
 * Constraints:
 * 1. Must be the sender.
 * 2. Within 24 hours of sending.
 * 3. Message is not already deleted.
 */
export async function deleteMessageForEveryone(req, res, next) {
  try {
    const { messageId } = req.params
    const userId = req.userId

    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)

    const updatedMessage = await Message.findOneAndUpdate(
      {
        _id: messageId,
        senderId: userId,
        isDeleted: false,
        createdAt: { $gte: twentyFourHoursAgo }
      },
      {
        $set: {
          isDeleted: true,
          deletedAt: new Date(),
          text: '', // clear text content
          fileAttachment: { url: null, name: null, size: null, mimeType: null } // clear attachment references
        }
      },
      { new: true }
    )

    if (!updatedMessage) {
      const message = await Message.findById(messageId)
      if (!message) {
        throw new AppError('Message not found', 404)
      }
      if (message.senderId.toString() !== userId) {
        throw new AppError('Unauthorized: You can only delete your own messages', 403)
      }
      if (message.isDeleted) {
        throw new AppError('Message is already deleted', 400)
      }
      if (new Date() - new Date(message.createdAt) > 24 * 60 * 60 * 1000) {
        throw new AppError('Messages can only be deleted for everyone within 24 hours of sending', 400)
      }
      throw new AppError('Failed to delete message', 400)
    }

    // Broadcast the message delete in real time
    const io = getIo()
    if (io) {
      if (updatedMessage.receiverId) {
        // 1-to-1 chat: notify both users
        io.to(updatedMessage.senderId.toString())
          .to(updatedMessage.receiverId.toString())
          .emit('message_deleted_everyone', {
            messageId: updatedMessage._id,
            chatId: updatedMessage.chatId,
            isDeleted: true,
            deletedAt: updatedMessage.deletedAt
          })
      } else {
        // Group chat: notify the group room
        io.to(updatedMessage.chatId.toString()).emit('message_deleted_everyone', {
          messageId: updatedMessage._id,
          chatId: updatedMessage.chatId,
          isDeleted: true,
          deletedAt: updatedMessage.deletedAt
        })
      }
    }

    res.json(updatedMessage)
  } catch (error) {
    next(error)
  }
}

/**
 * Deletes a message for the current user (individual soft delete).
 * The message will be hidden from their view but remains visible to other participants.
 */
export async function deleteMessageForMe(req, res, next) {
  try {
    const { messageId } = req.params
    const userId = req.userId

    const updatedMessage = await Message.findByIdAndUpdate(
      messageId,
      {
        $addToSet: { deletedBy: userId }
      },
      { new: true }
    )

    if (!updatedMessage) {
      throw new AppError('Message not found', 404)
    }

    res.json({ success: true, messageId: updatedMessage._id })
  } catch (error) {
    next(error)
  }
}



