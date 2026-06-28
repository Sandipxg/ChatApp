import * as journalModel from '../models/journalModel.js'

export async function getByUser(userId) {
  return await journalModel.getByUser(userId)
}

export async function getById(id) {
  return await journalModel.getById(id)
}

export async function create(userId, title) {
  return await journalModel.create(userId, title)
}

export async function update(id, changes) {
  return await journalModel.update(id, changes)
}

export async function remove(id) {
  return await journalModel.remove(id)
}
