const DB_NAME = 'journal-offline-db'
const DB_VERSION = 1
const STORE_NAME = 'offline-actions'

/**
 * Opens the IndexedDB database and sets up the object store if needed.
 * @returns {Promise<IDBDatabase>}
 */
export const openDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)

    request.onupgradeneeded = (event) => {
      const db = event.target.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true })
      }
    }
  })
}

/**
 * Adds a new action to the offline queue.
 * @param {Object} action
 * @returns {Promise<number>} ID of the created action
 */
export const addOfflineAction = async (action) => {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite')
    const store = transaction.objectStore(STORE_NAME)
    const request = store.add(action)

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

/**
 * Retrieves all queued offline actions in chronological order.
 * @returns {Promise<Array>} List of actions
 */
export const getOfflineActions = async () => {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly')
    const store = transaction.objectStore(STORE_NAME)
    const request = store.getAll()

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

/**
 * Deletes an offline action by its auto-incremented key ID.
 * @param {number} id
 * @returns {Promise<void>}
 */
export const deleteOfflineAction = async (id) => {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite')
    const store = transaction.objectStore(STORE_NAME)
    const request = store.delete(id)

    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

/**
 * Updates an offline action in the database.
 * @param {Object} action
 * @returns {Promise<void>}
 */
export const updateOfflineAction = async (action) => {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite')
    const store = transaction.objectStore(STORE_NAME)
    const request = store.put(action)

    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

/**
 * Clears all queued offline actions.
 * @returns {Promise<void>}
 */
export const clearOfflineActions = async () => {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite')
    const store = transaction.objectStore(STORE_NAME)
    const request = store.clear()

    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}
