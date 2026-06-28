import { addOfflineAction, getOfflineActions } from '../utils/db'

const BASE_URL = `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/journals`

/**
 * Registers background sync for offline actions.
 */
const registerBackgroundSync = async () => {
  if ('serviceWorker' in navigator && 'SyncManager' in window) {
    try {
      const registration = await navigator.serviceWorker.ready
      await registration.sync.register('sync-journal-actions')
      console.log('[Journal Service] Background sync registered successfully')
    } catch (err) {
      console.error('[Journal Service] Failed to register background sync:', err)
    }
  } else {
    console.log('[Journal Service] Background Sync not supported. Replay will trigger manually.')
  }
}

export async function fetchJournals() {
  let list = []
  try {
    const res = await fetch(BASE_URL, { credentials: 'include' })
    if (!res.ok) throw new Error('Failed to fetch journals')
    list = await res.json()
  } catch (err) {
    console.warn('[Journal Service] Fetch failed, relying on service worker cache:', err)
    throw err
  }

  // Apply pending offline actions on top of the fetched list
  try {
    const actions = await getOfflineActions()
    if (actions && actions.length > 0) {
      for (const action of actions) {
        if (action.action === 'CREATE') {
          list.push({
            id: action.entryId,
            title: action.payload.title,
            date: action.timestamp.split('T')[0]
          })
        } else if (action.action === 'UPDATE') {
          list = list.map(j => j.id === action.entryId ? { ...j, ...action.payload } : j)
        } else if (action.action === 'DELETE') {
          list = list.filter(j => j.id !== action.entryId)
        }
      }
    }
  } catch (dbErr) {
    console.error('[Journal Service] Failed to apply offline actions:', dbErr)
  }

  return list
}

export async function fetchJournal(id) {
  // Try to find in offline actions first if it was created offline
  try {
    const actions = await getOfflineActions()
    const createAction = actions.find(a => a.action === 'CREATE' && a.entryId === id)
    if (createAction) {
      return {
        id,
        title: createAction.payload.title,
        date: createAction.timestamp.split('T')[0]
      }
    }
  } catch (dbErr) {
    console.error('[Journal Service] Failed to inspect offline actions:', dbErr)
  }

  const res = await fetch(`${BASE_URL}/${id}`, { credentials: 'include' })
  if (!res.ok) throw new Error('Journal not found')
  return res.json()
}

export async function createJournal(title) {
  const runOfflineFallback = async () => {
    const tempId = `temp-${Date.now()}`
    const action = {
      action: 'CREATE',
      entryId: tempId,
      payload: { title },
      timestamp: new Date().toISOString()
    }
    await addOfflineAction(action)
    await registerBackgroundSync()
    return {
      id: tempId,
      title,
      date: new Date().toISOString().split('T')[0]
    }
  }

  if (!navigator.onLine) {
    return runOfflineFallback()
  }

  try {
    const res = await fetch(BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
      credentials: 'include'
    })
    if (!res.ok) throw new Error('Failed to create journal')
    return await res.json()
  } catch (err) {
    const isNetworkError = 
      err.name === 'TypeError' || 
      /failed to fetch|load failed/i.test(err.message)
    if (isNetworkError) {
      console.warn('[Journal Service] Network error during CREATE, queueing offline:', err)
      return runOfflineFallback()
    }
    throw err
  }
}

export async function updateJournal(id, data) {
  const runOfflineFallback = async () => {
    const action = {
      action: 'UPDATE',
      entryId: id,
      payload: data,
      timestamp: new Date().toISOString()
    }
    await addOfflineAction(action)
    await registerBackgroundSync()
    return { id, ...data }
  }

  if (!navigator.onLine) {
    return runOfflineFallback()
  }

  try {
    const res = await fetch(`${BASE_URL}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      credentials: 'include'
    })
    if (!res.ok) throw new Error('Failed to update journal')
    return await res.json()
  } catch (err) {
    const isNetworkError = 
      err.name === 'TypeError' || 
      /failed to fetch|load failed/i.test(err.message)
    if (isNetworkError) {
      console.warn('[Journal Service] Network error during UPDATE, queueing offline:', err)
      return runOfflineFallback()
    }
    throw err
  }
}

export async function deleteJournal(id) {
  const runOfflineFallback = async () => {
    const action = {
      action: 'DELETE',
      entryId: id,
      payload: null,
      timestamp: new Date().toISOString()
    }
    await addOfflineAction(action)
    await registerBackgroundSync()
    return { id }
  }

  if (!navigator.onLine) {
    return runOfflineFallback()
  }

  try {
    const res = await fetch(`${BASE_URL}/${id}`, {
      method: 'DELETE',
      credentials: 'include'
    })
    if (!res.ok) throw new Error('Failed to delete journal')
    return await res.json()
  } catch (err) {
    const isNetworkError = 
      err.name === 'TypeError' || 
      /failed to fetch|load failed/i.test(err.message)
    if (isNetworkError) {
      console.warn('[Journal Service] Network error during DELETE, queueing offline:', err)
      return runOfflineFallback()
    }
    throw err
  }
}

