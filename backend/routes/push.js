import express from 'express'
import * as pushController from '../controllers/pushController.js'
import auth from '../middleware/auth.js'

const router = express.Router()

// PUBLIC ROUTE: Expose VAPID public key so client can register push notifications
router.get('/vapid-public-key', pushController.getVapidPublicKey)

// PROTECTED ROUTES: Apply auth middleware to protect these routes
router.use(auth)

// Save or update subscription
router.post('/subscribe', pushController.subscribe)

// Delete a subscription when notifications are disabled
router.post('/unsubscribe', pushController.unsubscribe)

// Trigger a test push notification to all stored devices for the logged-in user
router.post('/send', pushController.sendTestNotification)

export default router
