import webpush from 'web-push'
import PushSubscription from '../models/pushSubscriptionModel.js'
import AppError from '../utils/AppError.js'

// Configure web-push with VAPID details from environment variables
// VAPID keys authenticate our server to the browser push services
webpush.setVapidDetails(
  'mailto:mrsandipgodhani@gmail.com', // Admin contact email required by push service providers
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
)

/**
 * Exposes the public VAPID key so the client-side code can fetch it
 * dynamically instead of hardcoding.
 */
export async function getVapidPublicKey(req, res) {
  const publicKey = process.env.VAPID_PUBLIC_KEY
  if (!publicKey) {
    throw new AppError('VAPID public key not configured on server', 500)
  }
  res.json({ publicKey })
}

/**
 * Stores a new push subscription for the logged-in user.
 * If the subscription already exists for this endpoint, it will update it.
 */
export async function subscribe(req, res) {
  const { endpoint, keys } = req.body
  const userId = req.userId

  // Basic validation of the subscription payload
  if (!endpoint || !keys || !keys.p256dh || !keys.auth) {
    throw new AppError('Invalid subscription payload: endpoint and keys are required', 400)
  }

  // Save the subscription to the database. We use findOneAndUpdate with upsert: true
  // to prevent duplicate subscriptions if the user registers the same device twice.
  const subscription = await PushSubscription.findOneAndUpdate(
    { endpoint },
    { userId, keys },
    { new: true, upsert: true }
  )

  res.status(201).json({
    message: 'Subscription saved successfully',
    subscriptionId: subscription._id
  })
}

/**
 * Deletes a push subscription when the user disables notifications in the UI.
 */
export async function unsubscribe(req, res) {
  const { endpoint } = req.body
  const userId = req.userId

  if (!endpoint) {
    throw new AppError('Endpoint is required to unsubscribe', 400)
  }

  // Remove the subscription matching this user and endpoint
  const result = await PushSubscription.findOneAndDelete({ userId, endpoint })

  if (!result) {
    throw new AppError('Subscription not found', 404)
  }

  res.json({ message: 'Subscription removed successfully' })
}

/**
 * Sends a test push notification to all devices registered by the logged-in user.
 * Helps verify end-to-end integration instantly.
 */
export async function sendTestNotification(req, res) {
  const userId = req.userId

  // Fetch all active subscriptions registered for this user
  const subscriptions = await PushSubscription.find({ userId })

  if (subscriptions.length === 0) {
    throw new AppError('No active subscriptions found for this user', 404)
  }

  // The payload that will be sent to the Service Worker (in JSON format)
  const notificationPayload = JSON.stringify({
    title: 'Journal Reminder! ✍️',
    body: 'Time to record your daily thoughts. Keep your streak alive!',
    url: '/journals' // Tells the service worker where to redirect the user on click
  })

  // Track success and failure counts
  let sentCount = 0
  const promises = subscriptions.map(async (sub) => {
    // Transform the Mongoose model to the format web-push library expects
    const pushSubscription = {
      endpoint: sub.endpoint,
      keys: {
        p256dh: sub.keys.p256dh,
        auth: sub.keys.auth
      }
    }

    try {
      await webpush.sendNotification(pushSubscription, notificationPayload)
      sentCount++
    } catch (error) {
      console.error(`[Push Notification] Error sending to endpoint: ${sub.endpoint}`, error.statusCode)
      
      // If the push service returns 404 (Not Found) or 410 (Gone), the subscription
      // has expired or been revoked by the user, so we should clean it up from the database.
      if (error.statusCode === 410 || error.statusCode === 404) {
        console.log(`[Push Notification] Removing expired subscription for user: ${userId}`)
        await PushSubscription.findByIdAndDelete(sub._id)
      }
    }
  })

  // Wait for all push notification attempts to complete
  await Promise.all(promises)

  res.json({
    message: `Test notifications sent successfully`,
    totalSubscribers: subscriptions.length,
    successfulDeliveries: sentCount
  })
}
