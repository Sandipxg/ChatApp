import mongoose from 'mongoose'

// Schema representing a web push subscription for a user device
const pushSubscriptionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    endpoint: {
      type: String,
      required: true,
      unique: true // Ensure each subscription endpoint is unique to prevent duplicate pushes
    },
    keys: {
      p256dh: {
        type: String,
        required: true
      },
      auth: {
        type: String,
        required: true
      }
    }
  },
  {
    timestamps: true
  }
)

const PushSubscription = mongoose.model('PushSubscription', pushSubscriptionSchema)

export default PushSubscription
