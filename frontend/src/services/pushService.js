const BASE_URL = `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/push`

/**
 * Utility helper to convert VAPID public key from URL-safe Base64 string
 * into a Uint8Array required by the browser's pushManager.
 */
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/')

  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

/**
 * Fetches the server's public VAPID key dynamically.
 */
async function getVapidPublicKey() {
  const res = await fetch(`${BASE_URL}/vapid-public-key`)
  if (!res.ok) {
    throw new Error('Failed to retrieve VAPID public key from server')
  }
  const data = await res.json()
  return data.publicKey
}

/**
 * Subscribes the client browser to push notifications.
 * Requests browser push token and registers it with the backend database.
 */
export async function subscribeUserToPush() {
  // 1. Verify service worker and push notification support in browser
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    throw new Error('Push notifications are not supported in this browser')
  }

  // 2. Wait for the service worker registration to be ready
  const registration = await navigator.serviceWorker.ready

  // 3. Retrieve or check current active subscription
  let subscription = await registration.pushManager.getSubscription()

  // 4. If no active subscription exists, create a new one
  if (!subscription) {
    // Fetch VAPID public key from backend
    const vapidPublicKey = await getVapidPublicKey()
    const convertedKey = urlBase64ToUint8Array(vapidPublicKey)

    // Subscribe user through the browser's pushManager
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true, // Must always be true due to privacy requirements
      applicationServerKey: convertedKey
    })
  }

  // 5. Save the subscription object on the backend linked to user session
  const res = await fetch(`${BASE_URL}/subscribe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(subscription),
    credentials: 'include'
  })

  if (!res.ok) {
    // Unsubscribe from browser manager if database save fails to stay in sync
    await subscription.unsubscribe()
    throw new Error('Failed to register subscription on the server')
  }

  return subscription
}

/**
 * Unsubscribes the user from push notifications.
 * Revokes browser push token and removes subscription details from backend.
 */
export async function unsubscribeUserFromPush() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return
  }

  const registration = await navigator.serviceWorker.ready
  const subscription = await registration.pushManager.getSubscription()

  if (subscription) {
    // 1. Delete subscription from backend database
    const res = await fetch(`${BASE_URL}/unsubscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint: subscription.endpoint }),
      credentials: 'include'
    })

    // 2. Revoke the token locally via browser PushManager
    await subscription.unsubscribe()

    if (!res.ok) {
      throw new Error('Failed to completely remove subscription on the server')
    }
  }
}

/**
 * Checks whether the browser currently has an active subscription.
 */
export async function getSubscriptionState() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return false
  }

  const registration = await navigator.serviceWorker.ready
  const subscription = await registration.pushManager.getSubscription()
  return !!subscription
}

/**
 * Triggers a test push notification from the backend to verify the pipeline.
 */
export async function triggerTestPush() {
  const res = await fetch(`${BASE_URL}/send`, {
    method: 'POST',
    credentials: 'include'
  })

  if (!res.ok) {
    const errorData = await res.json()
    throw new Error(errorData.error || 'Failed to trigger test notification')
  }

  return res.json()
}
