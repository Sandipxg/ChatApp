import { User } from '../models/userModel.js'
import { Message } from '../models/messageModel.js'
import { Conversation } from '../models/conversationModel.js'
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

    // Find all conversations where the user is a participant
    const conversations = await Conversation.find({
      participants: currentUserId
    }).populate('lastMessage')

    const result = await Promise.all(conversations.map(async (convo) => {
      // Find the other participant in this 1-to-1 conversation
      const partnerId = convo.participants.find(p => p.toString() !== currentUserId)
      if (!partnerId) return null // Edge case: self-chat or group chats (handled later)

      const user = await User.findById(partnerId).select('email name image username lastSeen')
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
        unreadCount,
        latestMessage: convo.lastMessage
          ? {
              id: convo.lastMessage._id.toString(),
              chatId: convo.lastMessage.chatId.toString(),
              text: convo.lastMessage.text,
              senderId: convo.lastMessage.senderId.toString(),
              receiverId: convo.lastMessage.receiverId.toString(),
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

    // Verify recipient user exists
    const receiverExists = await User.exists({ _id: receiverId })
    if (!receiverExists) {
      throw new AppError('Recipient user not found', 404)
    }

    // Find or create the conversation
    let conversation = await Conversation.findOne({
      isGroup: false,
      participants: { $all: [senderId, receiverId], $size: 2 }
    })

    if (!conversation) {
      conversation = await Conversation.create({
        participants: [senderId, receiverId],
        isGroup: false
      })
    }

    const chatId = conversation._id.toString()
    const message = await Message.create({
      chatId,
      senderId,
      receiverId,
      text,
      status: isUserOnline(receiverId) ? 'delivered' : 'sent',
    })

    // Update lastMessage on conversation
    conversation.lastMessage = message._id
    await conversation.save()

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

    let targetChatId = chatId

    if (chatId.includes('_')) {
      // Fallback compatibility: look up by old dynamic ID format (split and find conversation)
      const participants = chatId.split('_')
      if (!participants.includes(currentUserId)) {
        throw new AppError('Unauthorized: You are not a participant in this chat thread', 403)
      }

      // Check if there is an active conversation document for these participants
      const conversation = await Conversation.findOne({
        isGroup: false,
        participants: { $all: participants, $size: 2 }
      })

      if (conversation) {
        targetChatId = conversation._id.toString()
      } else {
        // Return empty message history if conversation hasn't been created yet
        return res.json([])
      }
    } else {
      // Standard mongoose conversationId
      const conversation = await Conversation.findById(chatId)
      if (!conversation) {
        throw new AppError('Conversation thread not found', 404)
      }

      if (!conversation.participants.some(p => p.toString() === currentUserId)) {
        throw new AppError('Unauthorized: You are not a participant in this chat thread', 403)
      }
    }

    // Fetch messages sorted ascending by creation date
    const messages = await Message.find({ chatId: targetChatId }).sort({ createdAt: 1 })

    // Mark messages sent to the current user in this chat as read
    await Message.updateMany(
      { chatId: targetChatId, receiverId: currentUserId, status: { $ne: 'read' } },
      { $set: { status: 'read' } }
    )

    res.json(messages)
  } catch (error) {
    next(error)
  }
}
