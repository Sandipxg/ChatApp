import cron from 'node-cron'
import webpush from 'web-push'
import { User } from '../models/userModel.js'
import PushSubscription from '../models/pushSubscriptionModel.js'

// Configure web-push with VAPID details from environment variables
webpush.setVapidDetails(
  'mailto:mrsandipgodhani@gmail.com', // Admin contact email required by push service providers
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
)

/**
 * Initializes the background cron scheduler.
 * Runs once every minute (* * * * *) to scan user preferences and trigger push notifications.
 */
export function initScheduler() {
  console.log('[Cron Service] Initializing Daily Reminder Cron Job (Every minute)')

  // Schedule task to run at the start of every minute
  cron.schedule('* * * * *', async () => {
    try {
      const now = new Date()
      console.log(`[Cron Service] Running check for: ${now.toISOString()}`)

      // 1. Fetch all users who have enabled reminders (reminderTime is not null)
      const activeUsers = await User.find({ reminderTime: { $ne: null } })
      if (activeUsers.length === 0) return

      // 2. Loop through users and check if their local time matches their reminderTime
      for (const user of activeUsers) {
        try {
          // Format current UTC time into the user's local timezone
          const formatter = new Intl.DateTimeFormat('en-US', {
            timeZone: user.timezone || 'UTC',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
          })

          // Extract hour and minute parts safely to construct "HH:MM"
          const parts = formatter.formatToParts(now)
          const hour = parts.find(p => p.type === 'hour').value
          const minute = parts.find(p => p.type === 'minute').value
          const userLocalTime = `${hour}:${minute}`

          // If the user's local time matches their target reminderTime, dispatch notification
          if (userLocalTime === user.reminderTime) {
            console.log(`[Cron Service] Time matches for user: ${user.username || user.name} (${userLocalTime})`)
            await sendReminderToUser(user._id)
          }
        } catch (timezoneError) {
          console.error(`[Cron Service] Time conversion failed for user ${user.username || user.name} with timezone ${user.timezone}:`, timezoneError)
        }
      }
    } catch (dbError) {
      console.error('[Cron Service] Database read error inside cron job:', dbError)
    }
  })
}

/**
 * Helper function to retrieve subscriptions and send the push payload
 * to all devices registered by the specified user.
 */
async function sendReminderToUser(userId) {
  // 1. Fetch all active device subscriptions for this user
  const subscriptions = await PushSubscription.find({ userId })
  if (subscriptions.length === 0) {
    console.log(`[Cron Service] User ${userId} has reminders enabled but no active device subscriptions.`)
    return
  }

  // 2. Notification payload config
  const payload = JSON.stringify({
    title: 'Daily Journal Reminder! ✍️',
    body: 'Time to record your daily thoughts. Keep your streak alive!',
    url: '/journals'
  })

  // 3. Dispatch to all active endpoints
  subscriptions.forEach(async (sub) => {
    const pushSubscription = {
      endpoint: sub.endpoint,
      keys: {
        p256dh: sub.keys.p256dh,
        auth: sub.keys.auth
      }
    }

    try {
      await webpush.sendNotification(pushSubscription, payload)
      console.log(`[Cron Service] Notification sent to endpoint: ${sub.endpoint}`)
    } catch (error) {
      console.error(`[Cron Service] Failed to send to endpoint: ${sub.endpoint}`, error.statusCode)
      
      // Clean up dead subscriptions (e.g. app deleted or permission denied)
      if (error.statusCode === 410 || error.statusCode === 404) {
        console.log(`[Cron Service] Removing invalid subscription: ${sub._id}`)
        await PushSubscription.findByIdAndDelete(sub._id)
      }
    }
  })
}
