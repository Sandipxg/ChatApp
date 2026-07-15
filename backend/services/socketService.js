import mongoose from 'mongoose'
import { Server } from 'socket.io'
import { auth } from '../config/auth.js'
import { User } from '../models/userModel.js'
import { Message } from '../models/messageModel.js'
import { Conversation } from '../models/conversationModel.js'

let io = null

// Keep track of online users: Map<userId, Set<socketId>>
const activeConnections = new Map()

export function init(server) {
  const allowedOrigins = [
    process.env.FRONTEND_URL,
    'http://localhost:5173',
    'http://localhost:4173'
  ].filter(Boolean)

  io = new Server(server, {
    cors: {
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
          return callback(null, true)
        }
        return callback(new Error('Not allowed by CORS'))
      },
      credentials: true
    }
  })

  // Middleware to authenticate socket connections with Better Auth session cookies
  io.use(async (socket, next) => {
    try {
      const session = await auth.api.getSession({
        headers: socket.handshake.headers
      })

      if (!session || !session.user) {
        return next(new Error('Unauthorized: Session not found'))
      }

      socket.userId = session.user.id
      socket.username = session.user.username || session.user.name || 'User'
      next()
    } catch (err) {
      console.error('Socket authentication error:', err.message)
      next(new Error('Unauthorized: Session verification failed'))
    }
  })

  io.on('connection', (socket) => {
    const userId = socket.userId
    // console.log(`User connected: ${userId} (${socket.username}) via socket ${socket.id}`)

    // Register active connection
    if (!activeConnections.has(userId)) {
      activeConnections.set(userId, new Set())
    }
    activeConnections.get(userId).add(socket.id)

    // Join a private room unique to this user ID
    socket.join(userId)

    // Fetch and join all group conversation rooms for the user
    Conversation.find({ 'members.userId': userId })
      .then((convoList) => {
        convoList.forEach((convo) => {
          socket.join(convo._id.toString())
        })
      })
      .catch((err) => console.error('Error auto-joining conversation rooms:', err))

    // Broadcast online status if this is the user's first socket (tab)
    if (activeConnections.get(userId).size === 1) {
      io.emit('user_online', { userId })
      deliverOfflineMessages(userId)
    }

    // Send the current list of online user IDs to the connected client
    socket.emit('online_users', Array.from(activeConnections.keys()))

    // Support dynamic room joining on UI creation/update
    socket.on('join_group_rooms', (chatIds = []) => {
      chatIds.forEach((chatId) => {
        if (mongoose.Types.ObjectId.isValid(chatId)) {
          socket.join(chatId)
        }
      })
    })

    // Handle incoming message sent via WebSocket
    socket.on('send_message', async (payload, callback) => {
      try {
        const { receiverId, text, parentMessageId } = payload
        if (!receiverId || !text) {
          if (callback) callback({ error: 'Receiver ID and text are required' })
          return
        }

        let chatId = null
        let conversation = null
        let isGroup = false

        // Check if receiverId is a group ID or user ID
        conversation = await Conversation.findById(receiverId)
        if (conversation && conversation.isGroup) {
          isGroup = true
          chatId = conversation._id.toString()
        } else {
          // Standard 1-to-1 conversation lookup
          conversation = await Conversation.findOne({
            isGroup: false,
            'members.userId': { $all: [userId, receiverId] },
            members: { $size: 2 }
          })

          if (!conversation) {
            conversation = await Conversation.create({
              isGroup: false,
              members: [
                { userId, role: 'member' },
                { userId: receiverId, role: 'member' }
              ]
            })
          }
          chatId = conversation._id.toString()
        }

        const message = await Message.create({
          chatId,
          senderId: userId,
          receiverId: isGroup ? null : receiverId,
          text,
          parentMessageId: parentMessageId || null,
          status: isGroup ? 'sent' : (isUserOnline(receiverId) ? 'delivered' : 'sent'),
        })

        // Update lastMessage on conversation
        conversation.lastMessage = message._id
        await conversation.save()

        // Populate parentMessageId for rendering quoted reply preview on other clients
        const populatedMessage = await Message.findById(message._id)
          .populate({
            path: 'parentMessageId',
            select: 'text messageType senderId isDeleted fileAttachment',
            populate: {
              path: 'senderId',
              select: 'name username'
            }
          })

        if (isGroup) {
          // Broadcast message to group room, including the senderName
          io.to(chatId).emit('new_message', {
            ...populatedMessage.toObject(),
            senderName: socket.username
          })
        } else {
          // Broadcast new message to both participants
          io.to(userId).to(receiverId).emit('new_message', populatedMessage)
        }

        if (callback) callback({ success: true, message: populatedMessage })
      } catch (error) {
        console.error('Error saving or sending socket message:', error)
        if (callback) callback({ error: error.message || 'Failed to send message' })
      }
    })

    // Handle user typing indicators
    socket.on('typing', async ({ receiverId }) => {
      const isGroup = await Conversation.exists({ _id: receiverId, isGroup: true })
      if (isGroup) {
        socket.to(receiverId).emit('typing', { senderId: userId, chatId: receiverId })
      } else {
        io.to(receiverId).emit('typing', { senderId: userId })
      }
    })

    socket.on('stop_typing', async ({ receiverId }) => {
      const isGroup = await Conversation.exists({ _id: receiverId, isGroup: true })
      if (isGroup) {
        socket.to(receiverId).emit('stop_typing', { senderId: userId, chatId: receiverId })
      } else {
        io.to(receiverId).emit('stop_typing', { senderId: userId })
      }
    })

    // Handle marking messages as read
    socket.on('mark_as_read', async ({ chatId }, callback) => {
      try {
        if (!chatId) return

        // Fetch the conversation to verify participation and find other participant
        let otherUserId = null
        let isGroup = false
        if (chatId.includes('_')) {
          // Fallback compatibility for old dynamic ID format
          const participants = chatId.split('_')
          if (!participants.includes(userId)) {
            if (callback) callback({ error: 'Unauthorized' })
            return
          }
          otherUserId = participants.find((id) => id !== userId)
        } else {
          // Standard mongoose conversationId
          const conversation = await Conversation.findById(chatId)
          if (!conversation || !conversation.members.some(m => m.userId.toString() === userId)) {
            if (callback) callback({ error: 'Unauthorized' })
            return
          }
          isGroup = conversation.isGroup
          if (!isGroup) {
            const otherMember = conversation.members.find(m => m.userId.toString() !== userId)
            if (otherMember) otherUserId = otherMember.userId.toString()
          }
        }

        if (isGroup) {
          await Message.updateMany(
            { chatId, senderId: { $ne: userId }, 'readBy.userId': { $ne: userId } },
            { $addToSet: { readBy: { userId, readAt: new Date() } } }
          )
          io.to(chatId).emit('messages_read', { chatId, readerId: userId })
        } else {
          await Message.updateMany(
            { chatId, receiverId: userId, status: { $ne: 'read' } },
            { $set: { status: 'read' } }
          )
          if (otherUserId) {
            io.to(otherUserId).emit('messages_read', { chatId, readerId: userId })
          }
        }

        if (callback) callback({ success: true })
      } catch (err) {
        console.error('Error in mark_as_read socket event:', err)
        if (callback) callback({ error: err.message })
      }
    })

    // Handle adding/removing emoji reactions
    socket.on('message_reaction', async ({ chatId, messageId, emoji }, callback) => {
      try {
        if (!chatId || !messageId || !emoji) {
          if (callback) callback({ error: 'chatId, messageId, and emoji are required' })
          return
        }

        const ALLOWED_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏']
        if (!ALLOWED_EMOJIS.includes(emoji)) {
          if (callback) callback({ error: 'Invalid emoji reaction' })
          return
        }

        // Verify conversation membership
        const conversation = await Conversation.findOne({
          _id: chatId,
          'members.userId': userId
        })
        if (!conversation) {
          if (callback) callback({ error: 'Unauthorized: You are not a member of this chat' })
          return
        }

        // Find the message
        const message = await Message.findOne({ _id: messageId, chatId })
        if (!message) {
          if (callback) callback({ error: 'Message not found' })
          return
        }

        if (message.isDeleted) {
          if (callback) callback({ error: 'Cannot react to deleted messages' })
          return
        }

        // Check if user has already reacted to this message
        const existingReactionIndex = message.reactions.findIndex(
          (r) => r.userId.toString() === userId
        )

        let updatedReactions = [...message.reactions]

        if (existingReactionIndex > -1) {
          const currentEmoji = updatedReactions[existingReactionIndex].emoji
          if (currentEmoji === emoji) {
            // Clicked the same emoji -> remove it (toggle off)
            updatedReactions.splice(existingReactionIndex, 1)
          } else {
            // Clicked a different emoji -> update it
            updatedReactions[existingReactionIndex].emoji = emoji
            updatedReactions[existingReactionIndex].reactedAt = new Date()
          }
        } else {
          // No reaction by this user -> add new reaction
          updatedReactions.push({
            userId,
            emoji,
            reactedAt: new Date()
          })
        }

        message.reactions = updatedReactions
        await message.save()

        // Broadcast updated reactions
        if (conversation.isGroup) {
          io.to(chatId).emit('message_reaction_updated', {
            chatId,
            messageId,
            reactions: message.reactions
          })
        } else {
          const otherMember = conversation.members.find(m => m.userId.toString() !== userId)
          const target = io.to(userId)
          if (otherMember) {
            target.to(otherMember.userId.toString())
          }
          target.emit('message_reaction_updated', {
            chatId,
            messageId,
            reactions: message.reactions
          })
        }

        if (callback) callback({ success: true, reactions: message.reactions })
      } catch (err) {
        console.error('Error in message_reaction socket handler:', err)
        if (callback) callback({ error: err.message || 'Failed to process reaction' })
      }
    })

    // Handle toggling pinned status of a message
    socket.on('message_pin_toggle', async ({ chatId, messageId }, callback) => {
      try {
        if (!chatId || !messageId) {
          if (callback) callback({ error: 'chatId and messageId are required' })
          return
        }

        // Find conversation and verify user membership
        const conversation = await Conversation.findOne({
          _id: chatId,
          'members.userId': userId
        })
        if (!conversation) {
          if (callback) callback({ error: 'Unauthorized: You are not a member of this chat' })
          return
        }

        // If it's a group chat, verify user has owner or admin role
        if (conversation.isGroup) {
          const userMember = conversation.members.find(m => m.userId.toString() === userId)
          if (!userMember || (userMember.role !== 'owner' && userMember.role !== 'admin')) {
            if (callback) callback({ error: 'Unauthorized: Only admins or owners can pin messages in groups' })
            return
          }
        }

        // Find the message and make sure it belongs to the chatId
        const message = await Message.findOne({ _id: messageId, chatId })
        if (!message) {
          if (callback) callback({ error: 'Message not found' })
          return
        }

        if (message.isDeleted) {
          if (callback) callback({ error: 'Cannot pin deleted messages' })
          return
        }

        // Check if already pinned
        const existingPinIndex = conversation.pinnedMessages.findIndex(
          (p) => p.messageId.toString() === messageId
        )

        let updatedPinnedMessages = [...conversation.pinnedMessages]
        let action = ''

        if (existingPinIndex > -1) {
          // Already pinned -> unpin it
          updatedPinnedMessages.splice(existingPinIndex, 1)
          action = 'unpinned'
        } else {
          // Not pinned -> pin it (enforce limit of 5)
          if (updatedPinnedMessages.length >= 5) {
            if (callback) callback({ error: 'Pin limit reached: You can pin up to 5 messages' })
            return
          }
          updatedPinnedMessages.push({
            messageId,
            pinnedBy: userId,
            pinnedAt: new Date()
          })
          action = 'pinned'
        }

        conversation.pinnedMessages = updatedPinnedMessages
        await conversation.save()

        // Populate pinnedMessages.messageId to send message details (sender details, text, etc.)
        const populatedConversation = await Conversation.findById(chatId)
          .populate({
            path: 'pinnedMessages.messageId',
            model: 'Message',
            populate: {
              path: 'senderId',
              model: 'User',
              select: 'username name image'
            }
          })

        // Broadcast updated list to the chat room
        if (conversation.isGroup) {
          io.to(chatId).emit('conversation_pins_updated', {
            chatId,
            pinnedMessages: populatedConversation.pinnedMessages
          })
        } else {
          const otherMember = conversation.members.find(m => m.userId.toString() !== userId)
          const target = io.to(userId)
          if (otherMember) {
            target.to(otherMember.userId.toString())
          }
          target.emit('conversation_pins_updated', {
            chatId,
            pinnedMessages: populatedConversation.pinnedMessages
          })
        }

        if (callback) callback({ success: true, action, pinnedMessages: populatedConversation.pinnedMessages })
      } catch (err) {
        console.error('Error in message_pin_toggle socket handler:', err)
        if (callback) callback({ error: err.message || 'Failed to toggle pin' })
      }
    })

    // Handle disconnection
    socket.on('disconnect', async () => {
      const userSockets = activeConnections.get(userId)
      if (userSockets) {
        userSockets.delete(socket.id)

        // If user has closed all tabs (no remaining active sockets)
        if (userSockets.size === 0) {
          activeConnections.delete(userId)
          const lastSeen = new Date()

          try {
            await User.findByIdAndUpdate(userId, { lastSeen })
          } catch (err) {
            console.error(`Failed to update lastSeen in DB for user ${userId}:`, err)
          }

          // Broadcast offline event containing user's final lastSeen timestamp
          io.emit('user_offline', { userId, lastSeen })
        }
      }
    })
  })

  return io
}

export function getIo() {
  return io
}

export function isUserOnline(userId) {
  return activeConnections.has(userId)
}

async function deliverOfflineMessages(receiverId) {
  try {
    const unsentMessages = await Message.find({ receiverId, status: 'sent' })
    if (unsentMessages.length === 0) return

    await Message.updateMany(
      { receiverId, status: 'sent' },
      { $set: { status: 'delivered' } }
    )

    // Notify each sender that their messages were delivered
    for (const msg of unsentMessages) {
      io.to(msg.senderId.toString()).emit('messages_delivered', {
        receiverId,
        chatId: msg.chatId.toString()
      })
    }
  } catch (err) {
    console.error('Error delivering offline messages:', err)
  }
}
