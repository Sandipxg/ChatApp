import { User } from '../models/userModel.js'
import { Message } from '../models/messageModel.js'
import AppError from '../utils/AppError.js'
import { isUserOnline } from '../services/socketService.js'

/**
 * Fetches all registered users in the database (excluding the logged-in user).
 */
export async function getContacts(req, res, next) {
  try {
    const currentUserId = req.userId
    const contacts = await User.find({ _id: { $ne: currentUserId } }).select('email name image username lastSeen')
    
    const clientContacts = contacts.map((user) => ({
      id: user._id.toString(),
      name: user.name || '',
      email: user.email,
      image: user.image,
      username: user.username || user.name || 'User',
      isOnline: isUserOnline(user._id.toString()),
      lastSeen: user.lastSeen,
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

    // Find all messages involving the current user
    const messages = await Message.find({
      $or: [
        { senderId: currentUserId },
        { receiverId: currentUserId }
      ]
    }).sort({ createdAt: -1 })

    const partnerIds = new Set()
    const latestMessagesMap = new Map()

    for (const msg of messages) {
      const partnerId = msg.senderId === currentUserId ? msg.receiverId : msg.senderId
      if (!partnerIds.has(partnerId)) {
        partnerIds.add(partnerId)
        latestMessagesMap.set(partnerId, msg)
      }
    }

    // Fetch user details for these partners
    const partners = await User.find({ _id: { $in: Array.from(partnerIds) } }).select('email name image username lastSeen')

    const result = await Promise.all(partners.map(async (user) => {
      const partnerId = user._id.toString()
      const latestMsg = latestMessagesMap.get(partnerId)
      const chatId = [currentUserId, partnerId].sort().join('_')

      const unreadCount = await Message.countDocuments({
        chatId,
        receiverId: currentUserId,
        status: { $ne: 'read' }
      })

      return {
        id: partnerId,
        name: user.name || '',
        email: user.email,
        image: user.image,
        username: user.username || user.name || 'User',
        isOnline: isUserOnline(partnerId),
        lastSeen: user.lastSeen,
        unreadCount,
        latestMessage: latestMsg
          ? {
              id: latestMsg._id.toString(),
              chatId: latestMsg.chatId,
              text: latestMsg.text,
              senderId: latestMsg.senderId,
              receiverId: latestMsg.receiverId,
              createdAt: latestMsg.createdAt,
              status: latestMsg.status,
            }
          : null,
      }
    }))

    // Sort partners by the timestamp of their latest message in descending order
    result.sort((a, b) => {
      const timeA = a.latestMessage ? new Date(a.latestMessage.createdAt).getTime() : 0
      const timeB = b.latestMessage ? new Date(b.latestMessage.createdAt).getTime() : 0
      return timeB - timeA
    })

    res.json(result)
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

    // Verify recipient user exists
    const receiverExists = await User.exists({ _id: receiverId })
    if (!receiverExists) {
      throw new AppError('Recipient user not found', 404)
    }

    // Generate unique chatId by sorting user IDs alphabetically
    const chatId = [senderId, receiverId].sort().join('_')

    const message = await Message.create({
      chatId,
      senderId,
      receiverId,
      text,
      status: isUserOnline(receiverId) ? 'delivered' : 'sent',
    })

    res.status(201).json(message)
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

    const participants = chatId.split('_')
    if (!participants.includes(currentUserId)) {
      throw new AppError('Unauthorized: You are not a participant in this chat thread', 403)
    }

    // Fetch messages sorted ascending by creation date
    const messages = await Message.find({ chatId }).sort({ createdAt: 1 })

    // Mark messages sent to the current user in this chat as read
    await Message.updateMany(
      { chatId, receiverId: currentUserId, status: { $ne: 'read' } },
      { $set: { status: 'read' } }
    )

    res.json(messages)
  } catch (error) {
    next(error)
  }
}
