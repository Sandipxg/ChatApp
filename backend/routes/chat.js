import express from 'express'
import * as chatController from '../controllers/chatController.js'
import * as groupController from '../controllers/groupController.js'
import auth from '../middleware/auth.js'

const router = express.Router()

// Ensure all chat routes require authentication
router.use(auth)

// Get contacts (excluding logged-in user)
router.get('/contacts', chatController.getContacts)

// Get chat partners (users with conversation history)
router.get('/partners', chatController.getChatPartners)

// Get or create conversation with a specific partner
router.get('/conversations/:partnerId', chatController.getOrCreateConversation)

// Send a message
router.post('/messages', chatController.sendMsg)

// Get messages by chatId
router.get('/messages/:chatId', chatController.getMsgByChatid)

// Group Chat management routes
router.post('/groups', groupController.createGroup)
router.post('/groups/:chatId/members', groupController.addMembers)
router.delete('/groups/:chatId/members/:memberId', groupController.removeMember)
router.patch('/groups/:chatId/role', groupController.updateGroupRole)
router.patch('/groups/:chatId/details', groupController.updateGroupDetails)
router.post('/groups/:chatId/leave', groupController.leaveGroup)

export default router
