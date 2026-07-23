import mongoose from 'mongoose'

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
    },
    emailVerified: {
      type: Boolean,
      default: false,
    },
    name: {
      type: String,
    },
    image: {
      type: String,
    },
    username: {
      type: String,
      unique: true,
      sparse: true,
    },
    reminderTime: {
      type: String, // Format: "HH:MM", or null if notifications are disabled
      default: null,
    },
    timezone: {
      type: String, // Local timezone of the device, e.g. "Asia/Kolkata"
      default: 'UTC',
    },
    lastSeen: {
      type: Date,
      default: null,
    },
    publicKey: {
      type: mongoose.Schema.Types.Mixed, // Stores exported ECDH public key JWK object
      default: null,
    },
  },
  {
    timestamps: true,
    collection: 'user', // Align with Better Auth's default singular user table
  }
)

// Force connection to singular 'user' collection
const User = mongoose.model('User', userSchema, 'user')

function toClientUser(user) {
  if (!user) return null
  return {
    id: user._id.toString(),
    username: user.username || user.name || '',
    email: user.email,
    reminderTime: user.reminderTime,
    timezone: user.timezone,
    publicKey: user.publicKey || null,
  }
}

export async function removeById(userId) {
  await User.findByIdAndDelete(userId)
}

export async function updateReminder(userId, reminderTime, timezone) {
  const user = await User.findByIdAndUpdate(
    userId,
    { reminderTime, timezone },
    { new: true }
  )
  return toClientUser(user)
}

export { User }
