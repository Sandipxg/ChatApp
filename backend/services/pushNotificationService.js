import webpush from 'web-push'
import PushSubscription from '../models/pushSubscriptionModel.js'
import { User } from '../models/userModel.js'
import { Conversation } from '../models/conversationModel.js'
import { isUserOnline } from './socketService.js'

if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    'mailto:mrsandipgodhani@gmail.com',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  )
}

/**
 * Sends a push notification to offline users involved in a conversation.
 * @param {Object} message - The created message document
 */
export async function notifyOfflineUsers(message) {
  try {
    const { chatId, senderId, receiverId, text, messageType } = message

    const sender = await User.findById(senderId).select('name username')
    const senderName = sender ? (sender.name || sender.username) : 'Someone'

    const conversation = await Conversation.findById(chatId)
    if (!conversation) return

    let messagePreview = text
    if (messageType === 'image') {
      messagePreview = '📷 Sent an image'
    } else if (messageType === 'video') {
      messagePreview = '🎥 Sent a video'
    } else if (messageType === 'audio') {
      messagePreview = '🎙️ Sent a voice note'
    } else if (messageType === 'file') {
      messagePreview = '📁 Sent a file'
    }

    let offlineUserIds = []

    if (conversation.isGroup) {
      const members = conversation.members || []
      members.forEach((member) => {
        const userIdStr = member.userId.toString()
        if (userIdStr !== senderId.toString() && !isUserOnline(userIdStr)) {
          offlineUserIds.push(member.userId)
        }
      })
    } else {
      const receiverIdStr = receiverId.toString()
      if (!isUserOnline(receiverIdStr)) {
        offlineUserIds.push(receiverId)
      }
    }

    if (offlineUserIds.length === 0) return

    for (const userId of offlineUserIds) {
      const subscriptions = await PushSubscription.find({ userId })
      if (subscriptions.length === 0) continue

      const payload = JSON.stringify({
        title: conversation.isGroup 
          ? `${senderName} in ${conversation.name}` 
          : senderName,
        body: messagePreview,
        url: `/?chat=${conversation.isGroup ? conversation._id : senderId}`
      })

      for (const sub of subscriptions) {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.keys.p256dh,
            auth: sub.keys.auth
          }
        }

        try {
          await webpush.sendNotification(pushSubscription, payload)
        } catch (error) {
          console.error(`[Push Notification] Error sending to user ${userId} endpoint ${sub.endpoint}:`, error.statusCode)
          if (error.statusCode === 410 || error.statusCode === 404) {
            await PushSubscription.findByIdAndDelete(sub._id)
          }
        }
      }
    }
  } catch (error) {
    console.error('[Push Notification] Error in notifyOfflineUsers:', error)
  }
}
