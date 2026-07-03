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

    // Broadcast online status if this is the user's first socket (tab)
    if (activeConnections.get(userId).size === 1) {
      io.emit('user_online', { userId })
      deliverOfflineMessages(userId)
    }

    // Send the current list of online user IDs to the connected client
    socket.emit('online_users', Array.from(activeConnections.keys()))

    // Handle incoming message sent via WebSocket
    socket.on('send_message', async (payload, callback) => {
      try {
        const { receiverId, text } = payload
        if (!receiverId || !text) {
          if (callback) callback({ error: 'Receiver ID and text are required' })
          return
        }

        // Find or create the conversation
        let conversation = await Conversation.findOne({
          isGroup: false,
          participants: { $all: [userId, receiverId], $size: 2 }
        })

        if (!conversation) {
          conversation = await Conversation.create({
            participants: [userId, receiverId],
            isGroup: false
          })
        }

        const chatId = conversation._id.toString()
        const isReceiverOnline = isUserOnline(receiverId)

        const message = await Message.create({
          chatId,
          senderId: userId,
          receiverId,
          text,
          status: isReceiverOnline ? 'delivered' : 'sent',
        })

        // Update lastMessage on conversation
        conversation.lastMessage = message._id
        await conversation.save()

        // Broadcast new message to both participants (handles synchronization across multiple open tabs)
        io.to(userId).to(receiverId).emit('new_message', message)

        if (callback) callback({ success: true, message })
      } catch (error) {
        console.error('Error saving or sending socket message:', error)
        if (callback) callback({ error: error.message || 'Failed to send message' })
      }
    })

    // Handle user typing indicators
    socket.on('typing', ({ receiverId }) => {
      io.to(receiverId).emit('typing', { senderId: userId })
    })

    socket.on('stop_typing', ({ receiverId }) => {
      io.to(receiverId).emit('stop_typing', { senderId: userId })
    })

    // Handle marking messages as read
    socket.on('mark_as_read', async ({ chatId }, callback) => {
      try {
        if (!chatId) return

        // Fetch the conversation to verify participation and find other participant
        let otherUserId = null
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
          if (!conversation || !conversation.participants.some(p => p.toString() === userId)) {
            if (callback) callback({ error: 'Unauthorized' })
            return
          }
          otherUserId = conversation.participants.find(p => p.toString() !== userId).toString()
        }

        await Message.updateMany(
          { chatId, receiverId: userId, status: { $ne: 'read' } },
          { $set: { status: 'read' } }
        )

        if (otherUserId) {
          io.to(otherUserId).emit('messages_read', { chatId, readerId: userId })
        }

        if (callback) callback({ success: true })
      } catch (err) {
        console.error('Error in mark_as_read socket event:', err)
        if (callback) callback({ error: err.message })
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
      io.to(msg.senderId).emit('messages_delivered', {
        receiverId,
        chatId: msg.chatId
      })
    }
  } catch (err) {
    console.error('Error delivering offline messages:', err)
  }
}
