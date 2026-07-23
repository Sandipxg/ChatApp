import Dexie from 'dexie'

const db = new Dexie('chatapp-offline-db')

db.version(1).stores({
  'offline-actions': '++id',
  contacts: 'id',
  partners: 'chatId',
  messages: 'chatId'
})

export const addOfflineAction = async (action) => {
  return await db['offline-actions'].add(action)
}

export const getOfflineActions = async () => {
  return await db['offline-actions'].toArray()
}

export const deleteOfflineAction = async (id) => {
  return await db['offline-actions'].delete(id)
}

export const clearOfflineActions = async () => {
  return await db['offline-actions'].clear()
}

export const getCachedContacts = async () => {
  return await db.contacts.toArray()
}

export const saveCachedContacts = async (contacts) => {
  await db.contacts.clear()
  return await db.contacts.bulkPut(contacts)
}

export const getCachedPartners = async () => {
  return await db.partners.toArray()
}

export const saveCachedPartners = async (partners) => {
  await db.partners.clear()
  const formatted = partners.map((p) => ({
    ...p,
    chatId: p.chatId || p.id
  }))
  return await db.partners.bulkPut(formatted)
}

export const getCachedMessages = async (chatId) => {
  if (!chatId) return []
  const entry = await db.messages.get(chatId)
  return entry ? entry.messages : []
}

export const saveCachedMessages = async (chatId, messages) => {
  if (!chatId) return
  return await db.messages.put({ chatId, messages })
}
