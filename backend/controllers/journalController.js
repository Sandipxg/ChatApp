import * as journalService from '../services/journalService.js'
import AppError from '../utils/AppError.js'

export async function getByUser(req, res) {
  const userId = req.userId
  const journals = await journalService.getByUser(userId)
  res.json(journals)
}

export async function getById(req, res) {
  const journal = await journalService.getById(req.params.id)
  if (journal.userId !== req.userId) {
    throw new AppError('Unauthorized access to this journal', 403)
  }
  res.json(journal)
}

export async function create(req, res) {
  const { title } = req.body
  const userId = req.userId
  if (!title) {
    throw new AppError('title required', 400)
  }

  const journal = await journalService.create(userId, title)
  res.status(201).json(journal)
}

export async function update(req, res) {
  const journal = await journalService.getById(req.params.id)
  if (journal.userId !== req.userId) {
    throw new AppError('Unauthorized to update this journal', 403)
  }

  const updated = await journalService.update(req.params.id, req.body)
  res.json(updated)
}

export async function remove(req, res) {
  const journal = await journalService.getById(req.params.id)
  if (journal.userId !== req.userId) {
    throw new AppError('Unauthorized to delete this journal', 403)
  }

  await journalService.remove(req.params.id)
  res.json({ message: 'Deleted' })
}
