const CACHE_NAME = 'journal-cache-v11'

const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/offline.html',
  '/manifest.json',
  '/favicon.svg',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/screenshots/screenshot-desktop.png',
  '/screenshots/screenshot-mobile.png'
]

// 1. Install Event — Pre-caching core stable assets
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installed (v7)')
  self.skipWaiting()
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Pre-caching static assets')
      return cache.addAll(ASSETS_TO_CACHE)
    })
  )
})

// 2. Activate Event — Cleaning up outdated caches
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activated (v7)')
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cache) => {
            if (cache !== CACHE_NAME) {
              console.log('[Service Worker] Deleting old cache:', cache)
              return caches.delete(cache)
            }
          })
        )
      })
    ])
  )
})

/**
 * Helper to check if a request is a document navigation request.
 * Excludes API routes and static asset files.
 */
function isDocumentNavigation(request) {
  const acceptHeader = request.headers.get('accept')
  const isHtml = acceptHeader && acceptHeader.includes('text/html')
  const isGet = request.method === 'GET'
  
  if (!isGet || !isHtml) return false
  
  const urlObj = new URL(request.url)
  const pathname = urlObj.pathname
  
  // Exclude backend API routes
  if (pathname.startsWith('/api/')) return false
  
  // Exclude static assets with file extensions (e.g. .js, .css, .png, .svg)
  const fileExtensionRegex = /\.[a-z0-9]{2,4}$/i
  if (fileExtensionRegex.test(pathname)) return false
  
  return true
}

// 3. Fetch Event — Intercept and route requests based on Caching Strategies
self.addEventListener('fetch', (event) => {
  // Only handle GET requests (avoid caching state-modifying actions like POST/PUT/DELETE)
  if (event.request.method !== 'GET') {
    return
  }

  const url = event.request.url

  // A. Network-First Strategy for Backend API calls (Dynamic Data)
  if (url.includes('/api/journals')) {
    event.respondWith(
      fetch(event.request).then((networkResponse) => {
        // If fetch succeeds, update the cache copy with the latest data
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone()
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache)
          })
        }
        return networkResponse
      }).catch((err) => {
        console.log('[Service Worker] API network fetch failed, serving cached copy:', err)
        // If offline, serve the last cached list of journal entries
        return caches.match(event.request, { ignoreSearch: true })
      })
    )
    return
  }

  // B. Cache-First Strategy for Frontend Static Assets (UI shell)
  if (url.startsWith(self.location.origin)) {
    const isNavigation = event.request.mode === 'navigate' || (event.request.headers.get('accept') && event.request.headers.get('accept').includes('text/html'))
    
    if (isNavigation) {
      event.respondWith(
        fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone()
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache)
            })
          }
          return networkResponse
        }).catch((err) => {
          console.log('[Service Worker] Navigation fetch failed, serving cache fallback:', err)
          return caches.match(event.request, { ignoreSearch: true }).then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse
            }
            if (isDocumentNavigation(event.request)) {
              return caches.match('/', { ignoreSearch: true })
            }
            return caches.match('/offline.html', { ignoreSearch: true })
          })
        })
      )
      return
    }

    event.respondWith(
      caches.match(event.request, { ignoreSearch: true }).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse // Return cached file instantly
        }

        return fetch(event.request).then((networkResponse) => {
          // Dynamically cache production JS/CSS assets
          const isAsset = url.includes('/assets/')

          if (networkResponse && networkResponse.status === 200 && isAsset) {
            const responseToCache = networkResponse.clone()
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache)
            })
          }
          return networkResponse
        }).catch((error) => {
          console.log('[Service Worker] Static fetch failed, routing fallback for document:', error)
          if (isDocumentNavigation(event.request)) {
            return caches.match('/', { ignoreSearch: true })
          }
          throw error
        })
      })
    )
  }
})

// 4. Push Event — Triggered when a push message is received from the server
self.addEventListener('push', (event) => {
  console.log('[Service Worker] Push event received')

  let data = {
    title: 'Journal App',
    body: 'You have a new message!',
    url: '/'
  }

  // Parse payload from server if present
  if (event.data) {
    try {
      data = event.data.json()
    } catch (err) {
      console.error('[Service Worker] Failed to parse push data as JSON', err)
      data.body = event.data.text() // Fallback to plain text
    }
  }

  // Define notification display options
  const options = {
    body: data.body,
    icon: '/icons/icon-192.png', // Main image shown next to body
    badge: '/icons/icon-192.png', // Small monochrome status bar icon
    data: {
      url: data.url || '/' // Attach custom data (e.g. url to open on click)
    },
    // Vibration pattern: vibration-silence-vibration (in ms)
    vibrate: [100, 50, 100],
    // Ensure notification stays active until user acts or dismisses
    requireInteraction: true
  }

  // Keep the service worker alive until the notification is rendered
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  )
})

// 5. Notification Click Event — Triggered when the user clicks the notification card
self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] Notification clicked')
  
  // Close the active notification card from screen/center
  event.notification.close()

  // Retrieve the target URL from the custom data attached
  const targetUrl = event.notification.data?.url || '/'

  // Keep service worker alive while locating or opening the window
  event.waitUntil(
    // Find all window clients (open tabs/windows of our app)
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // If an app window/tab is already open, focus it and redirect
        for (const client of clientList) {
          const clientUrl = new URL(client.url)
          if (clientUrl.origin === self.location.origin) {
            client.focus()
            return client.navigate(targetUrl)
          }
        }
        // If the app is closed, open a new window on the target route
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl)
        }
      })
  )
})

/* ==========================================================================
   OFFLINE WRITES & BACKGROUND SYNC LOGIC
   ========================================================================== */

const DB_NAME = 'journal-offline-db'
const DB_VERSION = 1
const STORE_NAME = 'offline-actions'

/**
 * Opens IndexedDB from the Service Worker scope.
 */
function openDB() {
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
 * Reads all offline actions from the store.
 */
function getOfflineActions() {
  return openDB().then((db) => {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.getAll()
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  })
}

/**
 * Deletes a processed action from the IndexedDB store.
 */
function deleteOfflineAction(id) {
  return openDB().then((db) => {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.delete(id)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  })
}

/**
 * Updates a processed action in the IndexedDB store.
 */
function updateOfflineAction(action) {
  return openDB().then((db) => {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.put(action)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  })
}

/**
 * Compacts the offline actions queue by merging/removing redundant actions.
 * Rules:
 *  - CREATE -> DELETE = discard both
 *  - CREATE -> UPDATE = merge payload into CREATE, discard UPDATE
 *  - UPDATE -> UPDATE = keep only the latest UPDATE, merging updates
 *  - UPDATE -> DELETE = discard UPDATE, keep only DELETE
 */
function compactQueue(actions) {
  const entryMap = new Map() // maps entryId -> action
  const discardedActionIds = new Set() // IDs of actions to delete from DB
  
  for (const action of actions) {
    const entryId = action.entryId
    
    if (!entryMap.has(entryId)) {
      entryMap.set(entryId, { ...action })
    } else {
      const prior = entryMap.get(entryId)
      if (prior.action === 'CREATE') {
        if (action.action === 'UPDATE') {
          // Merge payload into the CREATE action
          prior.payload = { ...prior.payload, ...action.payload }
          discardedActionIds.add(action.id)
        } else if (action.action === 'DELETE') {
          // CREATE followed by DELETE: discard both
          discardedActionIds.add(prior.id)
          discardedActionIds.add(action.id)
          entryMap.delete(entryId)
        }
      } else if (prior.action === 'UPDATE') {
        if (action.action === 'UPDATE') {
          // UPDATE followed by UPDATE: keep only the latest
          prior.payload = { ...prior.payload, ...action.payload }
          discardedActionIds.add(action.id)
        } else if (action.action === 'DELETE') {
          // UPDATE followed by DELETE: discard UPDATE, keep only DELETE
          discardedActionIds.add(prior.id)
          prior.action = 'DELETE'
          prior.payload = null
          discardedActionIds.add(action.id)
        }
      } else if (prior.action === 'DELETE') {
        if (action.action === 'CREATE') {
          entryMap.set(entryId, { ...action })
          discardedActionIds.add(prior.id)
        }
      }
    }
  }

  // Generate compacted actions list preserving chronological order of their first occurrence
  const compactedActions = []
  const entryStateSeen = new Set()
  
  for (const action of actions) {
    if (discardedActionIds.has(action.id)) {
      continue
    }
    const entryId = action.entryId
    if (entryMap.has(entryId) && !entryStateSeen.has(entryId)) {
      compactedActions.push(entryMap.get(entryId))
      entryStateSeen.add(entryId)
    }
  }
  
  return { compactedActions, discardedActionIds }
}

/**
 * Replays all queued actions to the backend in chronological order.
 */
async function replayOfflineActions() {
  console.log('[Service Worker] Replaying offline actions queue...')
  const actions = await getOfflineActions()
  if (!actions || actions.length === 0) {
    console.log('[Service Worker] Queue is empty.')
    return
  }

  // Compact the offline queue to merge redundant actions
  const { compactedActions, discardedActionIds } = compactQueue(actions)

  if (discardedActionIds.size > 0) {
    console.log(`[Service Worker] Compacting queue: deleting ${discardedActionIds.size} redundant actions from DB`)
    for (const discardedId of discardedActionIds) {
      await deleteOfflineAction(discardedId)
    }
  }

  if (compactedActions.length === 0) {
    console.log('[Service Worker] Queue is empty after compaction.')
    return
  }

  // Map to link temporary IDs created offline with database MongoDB IDs
  const idMap = new Map()

  for (const action of compactedActions) {
    try {
      let entryId = action.entryId
      // Resolve temp IDs to MongoDB IDs
      if (idMap.has(entryId)) {
        entryId = idMap.get(entryId)
      }

      if (action.action === 'CREATE') {
        const response = await fetch('/api/journals', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: action.payload.title }),
          credentials: 'include'
        })

        if (!response.ok) {
          throw new Error(`Failed to replay CREATE action: ${response.statusText}`)
        }

        const data = await response.json()
        console.log(`[Service Worker] Replay CREATE success. Temp ${action.entryId} -> Real ${data.id}`)
        
        const tempId = action.entryId
        const realId = data.id
        idMap.set(tempId, realId)

        // Resolve temp IDs in the remaining IndexedDB queue
        const dbActions = await getOfflineActions()
        for (const dbAction of dbActions) {
          if (dbAction.entryId === tempId) {
            dbAction.entryId = realId
            await updateOfflineAction(dbAction)
            console.log(`[Service Worker] Updated IndexedDB action ID ${dbAction.id}: temp ID ${tempId} resolved to ${realId}`)
          }
        }

        // Resolve temp IDs in the local in-memory actions array for the current loop
        for (const activeAction of compactedActions) {
          if (activeAction.entryId === tempId) {
            activeAction.entryId = realId
          }
        }
      } 
      
      else if (action.action === 'UPDATE') {
        const response = await fetch(`/api/journals/${entryId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(action.payload),
          credentials: 'include'
        })

        if (!response.ok) {
          throw new Error(`Failed to replay UPDATE action for ${entryId}: ${response.statusText}`)
        }
        console.log(`[Service Worker] Replay UPDATE success for ${entryId}`)
      } 
      
      else if (action.action === 'DELETE') {
        if (entryId.startsWith('temp-')) {
          console.log(`[Service Worker] Skipping backend DELETE call for temp entry: ${entryId}`)
        } else {
          const response = await fetch(`/api/journals/${entryId}`, {
            method: 'DELETE',
            credentials: 'include'
          })

          if (!response.ok) {
            throw new Error(`Failed to replay DELETE action for ${entryId}: ${response.statusText}`)
          }
          console.log(`[Service Worker] Replay DELETE success for ${entryId}`)
        }
      }

      // Remove item from local DB once backend processing succeeds
      await deleteOfflineAction(action.id)
    } catch (error) {
      console.error(`[Service Worker] Sync process failed on action ID ${action.id}:`, error)
      throw error // Escalate so browser retries subsequent sync iterations
    }
  }

  // Broadcast completion message to active client tabs to refresh UI lists
  const clientList = await self.clients.matchAll()
  clientList.forEach((client) => {
    client.postMessage({ 
      type: 'SYNC_COMPLETE',
      idMap: Object.fromEntries(idMap)
    })
  })
}

// 6. Background Sync Listener
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-journal-actions') {
    event.waitUntil(replayOfflineActions())
  }
})

// 7. Message event listener for manual sync triggers
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'TRIGGER_SYNC') {
    console.log('[Service Worker] Manual sync trigger received via client message')
    event.waitUntil(replayOfflineActions())
  }
})

