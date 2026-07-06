import mongoose from 'mongoose'

const memberSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    role: {
      type: String,
      enum: ['owner', 'admin', 'member'],
      default: 'member',
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
)

const conversationSchema = new mongoose.Schema(
  {
    members: [memberSchema],
    isGroup: {
      type: Boolean,
      default: false,
    },
    name: {
      type: String, // Group name
      default: null,
      trim: true,
    },
    avatar: {
      type: String, // Group avatar URL
      default: null,
    },
    lastMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
      default: null,
    }
  },
  {
    timestamps: true,
  }
)

const Conversation = mongoose.model('Conversation', conversationSchema)
export { Conversation }
