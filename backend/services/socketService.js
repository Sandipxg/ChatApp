import { Server } from 'socket.io'
import { auth } from '../config/auth.js'
import { User } from '../models/userModel.js'
import { Message } from '../models/messageModel.js'

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

        // Generate unique chatId by sorting user IDs alphabetically
        const chatId = [userId, receiverId].sort().join('_')

        const isReceiverOnline = isUserOnline(receiverId)

        const message = await Message.create({
          chatId,
          senderId: userId,
          receiverId,
          text,
          status: isReceiverOnline ? 'delivered' : 'sent',
        })

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

        const participants = chatId.split('_')
        if (!participants.includes(userId)) {
          if (callback) callback({ error: 'Unauthorized' })
          return
        }

        await Message.updateMany(
          { chatId, receiverId: userId, status: { $ne: 'read' } },
          { $set: { status: 'read' } }
        )

        const otherUserId = participants.find((id) => id !== userId)
        io.to(otherUserId).emit('messages_read', { chatId, readerId: userId })

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

    const senderIds = Array.from(new Set(unsentMessages.map((m) => m.senderId)))
    for (const senderId of senderIds) {
      io.to(senderId).emit('messages_delivered', {
        receiverId,
        chatId: [senderId, receiverId].sort().join('_')
      })
    }
  } catch (err) {
    console.error('Error delivering offline messages:', err)
  }
}
