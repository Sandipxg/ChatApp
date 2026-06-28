import mongoose from 'mongoose'
import AppError from '../utils/AppError.js'

const journalSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    date: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
)

const Journal = mongoose.model('Journal', journalSchema)

function assertValidJournalId(id) {
  if (!mongoose.isValidObjectId(id)) {
    throw new AppError('Journal not found', 404)
  }
}

function toClientJournal(journal) {
  if (!journal) return null
  return {
    id: journal._id.toString(),
    userId: journal.userId,
    title: journal.title,
    date: journal.date,
  }
}

export async function getByUser(userId) {
  const journals = await Journal.find({ userId }).sort({ createdAt: -1 })
  return journals.map(toClientJournal)
}

export async function getById(id) {
  assertValidJournalId(id)
  const journal = await Journal.findById(id)
  if (!journal) throw new AppError('Journal not found', 404)
  return toClientJournal(journal)
}

export async function create(userId, title) {
  const journal = await Journal.create({
    userId,
    title,
    date: new Date().toISOString().split('T')[0],
  })
  return toClientJournal(journal)
}

export async function update(id, changes) {
  assertValidJournalId(id)
  const allowedChanges = {}
  if (changes.title !== undefined) allowedChanges.title = changes.title

  const journal = await Journal.findByIdAndUpdate(id, allowedChanges, {
    new: true,
    runValidators: true,
  })
  if (!journal) throw new AppError('Journal not found', 404)

  return toClientJournal(journal)
}

export async function remove(id) {
  assertValidJournalId(id)
  const journal = await Journal.findByIdAndDelete(id)
  if (!journal) throw new AppError('Journal not found', 404)
}

export async function removeByUser(userId) {
  await Journal.deleteMany({ userId })
}

export { Journal }
