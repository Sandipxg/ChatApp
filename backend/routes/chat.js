import express from 'express'
import * as chatController from '../controllers/chatController.js'
import auth from '../middleware/auth.js'

const router = express.Router()

// Ensure all chat routes require authentication
router.use(auth)

// Get contacts (excluding logged-in user)
router.get('/contacts', chatController.getContacts)

// Get chat partners (users with conversation history)
router.get('/partners', chatController.getChatPartners)

// Send a message
router.post('/messages', chatController.sendMsg)

// Get messages by chatId
router.get('/messages/:chatId', chatController.getMsgByChatid)

export default router
