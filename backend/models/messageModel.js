import mongoose from 'mongoose'

const messageSchema = new mongoose.Schema(
  {
    chatId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null, // Nullable to support Group Chats (Phase 3)
    },
    text: {
      type: String,
      required: false, // Optional to support image/file messages later
      trim: true,
    },
    messageType: {
      type: String,
      enum: ['text', 'image', 'video', 'audio', 'file', 'system'],
      default: 'text',
    },
    fileAttachment: {
      url: { type: String, default: null },
      name: { type: String, default: null },
      size: { type: Number, default: null },
      mimeType: { type: String, default: null },
    },
    status: {
      type: String,
      enum: ['sent', 'delivered', 'read'],
      default: 'sent',
      index: true,
    },
    readBy: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        readAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
)

// Compound index for optimized chat history retrieval
messageSchema.index({ chatId: 1, createdAt: 1 })

// Individual indexes for query performance
messageSchema.index({ senderId: 1 })
messageSchema.index({ receiverId: 1 })

const Message = mongoose.model('Message', messageSchema)

export { Message }
