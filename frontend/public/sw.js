importScripts('https://storage.googleapis.com/workbox-cdn/releases/6.4.1/workbox-sw.js')

if (workbox) {
  console.log('[Service Worker] Workbox loaded')
  
  workbox.setConfig({ debug: false })

  const CACHE_NAME = 'chatapp-cache-v1'

  // Pre-cache static assets
  workbox.precaching.precacheAndRoute([
    { url: '/offline.html', revision: '1' },
    { url: '/manifest.json', revision: '1' },
    { url: '/favicon.svg', revision: '1' },
    { url: '/icons/icon-192.png', revision: '1' },
    { url: '/icons/icon-512.png', revision: '1' },
    { url: '/screenshots/screenshot-desktop.png', revision: '1' },
    { url: '/screenshots/screenshot-mobile.png', revision: '1' }
  ])

  // Custom asset caching for dynamic bundles inside /assets/
  workbox.routing.registerRoute(
    ({ url }) => url.origin === self.location.origin && url.pathname.includes('/assets/'),
    new workbox.strategies.CacheFirst({
      cacheName: 'chatapp-assets',
      plugins: [
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 50,
          maxAgeSeconds: 30 * 24 * 60 * 60
        })
      ]
    })
  )

  // Network-First strategy for ChatApp API routes
  workbox.routing.registerRoute(
    ({ url }) => 
      url.pathname.includes('/api/chat/contacts') || 
      url.pathname.includes('/api/chat/partners') || 
      url.pathname.includes('/api/chat/messages/'),
    new workbox.strategies.NetworkFirst({
      cacheName: 'chatapp-api-cache',
      plugins: [
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 100,
          maxAgeSeconds: 7 * 24 * 60 * 60
        })
      ]
    })
  // Cache-First strategy for Cloudinary cross-origin media files (avatars, attachments)
  workbox.routing.registerRoute(
    ({ url }) => url.hostname === 'res.cloudinary.com',
    new workbox.strategies.CacheFirst({
      cacheName: 'cloudinary-media',
      plugins: [
        new workbox.cacheableResponse.CacheableResponsePlugin({
          statuses: [0, 200]
        }),
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 100,
          maxAgeSeconds: 30 * 24 * 60 * 60
        })
      ]
    })
  )

  // Navigation requests fallback to offline.html
  workbox.routing.registerRoute(
    ({ request }) => request.mode === 'navigate',
    new workbox.strategies.NetworkFirst({
      cacheName: 'chatapp-navigation',
      plugins: [
        new workbox.cacheableResponse.CacheableResponsePlugin({
          statuses: [200]
        })
      ]
    })
  )

  workbox.routing.setCatchHandler(({ request }) => {
    if (request.mode === 'navigate') {
      return caches.match('/offline.html')
    }
    return Response.error()
  })
} else {
  console.error('[Service Worker] Workbox failed to load')
}

// Force immediate activation
self.addEventListener('install', (event) => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  const currentCaches = [
    'chatapp-cache-v1',
    'chatapp-assets',
    'chatapp-api-cache',
    'chatapp-navigation',
    'cloudinary-media'
  ]

  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (!currentCaches.includes(cacheName) && !cacheName.startsWith('workbox-precache')) {
            console.log('[Service Worker] Deleting obsolete cache:', cacheName)
            return caches.delete(cacheName)
          }
        })
      )
    }).then(() => self.clients.claim())
  )
})

// Push Event
self.addEventListener('push', (event) => {
  console.log('[Service Worker] Push event received')

  let data = {
    title: 'ChatApp',
    body: 'You have a new message!',
    url: '/'
  }

  if (event.data) {
    try {
      data = event.data.json()
    } catch (err) {
      console.error('[Service Worker] Failed to parse push data as JSON', err)
      data.body = event.data.text()
    }
  }

  const options = {
    body: data.body,
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    data: {
      url: data.url || '/'
    },
    vibrate: [100, 50, 100],
    requireInteraction: true
  }

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  )
})

// Notification Click Event
self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] Notification clicked')
  event.notification.close()
  const targetUrl = event.notification.data?.url || '/'

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          const clientUrl = new URL(client.url)
          if (clientUrl.origin === self.location.origin) {
            client.focus()
            return client.navigate(targetUrl)
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl)
        }
      })
  )
})

/* ==========================================================================
   OFFLINE WRITES & BACKGROUND SYNC LOGIC
   ========================================================================== */

const DB_NAME = 'chatapp-offline-db'
const DB_VERSION = 1
const STORE_NAME = 'offline-actions'

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

async function replayOfflineActions() {
  console.log('[Service Worker] Replaying offline actions queue...')
  const actions = await getOfflineActions()
  if (!actions || actions.length === 0) {
    console.log('[Service Worker] Queue is empty.')
    return
  }

  const idMap = new Map()

  for (const action of actions) {
    try {
      if (action.type === 'SEND_MESSAGE') {
        const response = await fetch('/api/chat/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            receiverId: action.payload.receiverId,
            text: action.payload.text
          }),
          credentials: 'include'
        })

        if (!response.ok) {
          throw new Error(`Failed to replay SEND_MESSAGE action: ${response.statusText}`)
        }

        const data = await response.json()
        console.log(`[Service Worker] Replay SEND_MESSAGE success. Temp ${action.payload.tempId} -> Real ${data._id}`)
        
        idMap.set(action.payload.tempId, data._id)
        await deleteOfflineAction(action.id)
      } 
    } catch (error) {
      console.error(`[Service Worker] Sync process failed on action ID ${action.id}:`, error)
      throw error
    }
  }

  const clientList = await self.clients.matchAll()
  clientList.forEach((client) => {
    client.postMessage({ 
      type: 'SYNC_COMPLETE',
      idMap: Object.fromEntries(idMap)
    })
  })
}

self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-chat-messages') {
    event.waitUntil(replayOfflineActions())
  }
})

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'TRIGGER_SYNC') {
    console.log('[Service Worker] Manual sync trigger received via client message')
    event.waitUntil(replayOfflineActions())
  }
})
