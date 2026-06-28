import express from 'express'
import * as journalController from '../controllers/journalController.js'
import auth from '../middleware/auth.js'
import validate from '../middleware/validate.js'
import { createJournalSchema, updateJournalSchema } from '../validators/journalValidator.js'

const router = express.Router()

router.use(auth)

router.get('/', journalController.getByUser)
router.get('/:id', journalController.getById)
router.post('/', validate(createJournalSchema), journalController.create)
router.put('/:id', validate(updateJournalSchema), journalController.update)
router.delete('/:id', journalController.remove)

export default router;
