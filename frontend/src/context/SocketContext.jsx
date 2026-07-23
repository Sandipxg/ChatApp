import { createContext, useContext, useEffect, useState } from 'react'
import { io } from 'socket.io-client'
import { useAuth } from './AuthContext'

const SocketContext = createContext(null)

export function SocketProvider({ children }) {
  const { currentUser } = useAuth()
  const [socket, setSocket] = useState(null)
  const [onlineUsers, setOnlineUsers] = useState([])
  const [typingStatus, setTypingStatus] = useState({})
  const [isSocketConnected, setIsSocketConnected] = useState(false)

  useEffect(() => {
    if (!currentUser) {
      if (socket) {
        socket.disconnect()
        setSocket(null)
      }
      setOnlineUsers([])
      setTypingStatus({})
      setIsSocketConnected(false)
      return
    }

    const socketUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000'
    const newSocket = io(socketUrl, {
      withCredentials: true,
      autoConnect: true,
    })

    setSocket(newSocket)

    // Setup listeners
    newSocket.on('connect', () => {
      setIsSocketConnected(true)
    })

    newSocket.on('online_users', (users) => {
      setOnlineUsers(users)
    })

    newSocket.on('user_online', ({ userId }) => {
      setOnlineUsers((prev) => {
        if (prev.includes(userId)) return prev
        return [...prev, userId]
      })
    })

    newSocket.on('user_offline', ({ userId }) => {
      setOnlineUsers((prev) => prev.filter((id) => id !== userId))
      setTypingStatus((prev) => {
        const next = { ...prev }
        delete next[userId]
        return next
      })
    })

    newSocket.on('typing', ({ senderId, chatId }) => {
      const key = chatId || senderId
      setTypingStatus((prev) => ({ ...prev, [key]: true }))
    })

    newSocket.on('stop_typing', ({ senderId, chatId }) => {
      const key = chatId || senderId
      setTypingStatus((prev) => ({ ...prev, [key]: false }))
    })

    newSocket.on('disconnect', () => {
      setIsSocketConnected(false)
    })

    return () => {
      newSocket.disconnect()
      setSocket(null)
      setOnlineUsers([])
      setTypingStatus({})
      setIsSocketConnected(false)
    }
  }, [currentUser])

  // Helper method to emit and await message send status
  const sendMessageViaSocket = (receiverId, text, parentMessageId = null) => {
    return new Promise((resolve, reject) => {
      if (!socket) {
        return reject(new Error('Socket connection is offline'))
      }
      socket.emit('send_message', { receiverId, text, parentMessageId }, (response) => {
        if (response.error) {
          reject(new Error(response.error))
        } else {
          resolve(response.message)
        }
      })
    })
  }

  // Helper method to broadcast typing status
  const sendTypingStatus = (receiverId, isTyping) => {
    if (!socket) return
    if (isTyping) {
      socket.emit('typing', { receiverId })
    } else {
      socket.emit('stop_typing', { receiverId })
    }
  }

  // Helper method to mark messages as read
  const markChatAsRead = (chatId) => {
    if (!socket) return
    socket.emit('mark_as_read', { chatId })
  }

  // Helper method to send a reaction to a message
  const sendReaction = (chatId, messageId, emoji) => {
    if (!socket) return
    socket.emit('message_reaction', { chatId, messageId, emoji })
  }

  return (
    <SocketContext.Provider
      value={{
        socket,
        onlineUsers,
        typingStatus,
        isSocketConnected,
        sendMessageViaSocket,
        sendTypingStatus,
        markChatAsRead,
        sendReaction,
      }}
    >
      {children}
    </SocketContext.Provider>
  )
}

export function useSocket() {
  const context = useContext(SocketContext)
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider')
  }
  return context
}

export default SocketContext
