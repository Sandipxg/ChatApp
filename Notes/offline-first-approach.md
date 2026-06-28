# Offline-First Approach

This document explains how MyJournalApp handles failed requests when the user is offline,
covering the full queue-and-sync pattern used in this project.

---

## What Happens When a Request Fails (Offline)

Your app uses a **queue-and-sync** pattern backed by IndexedDB. Here is the exact flow:

### Step 1 — Request Attempt Fails

The app tries to reach the deployed backend (e.g. `POST /api/journals`).
Since the user is offline, `fetch()` throws a `TypeError: Failed to fetch` (network error).

`journalService.js` catches this specifically:

```js
const isNetworkError = err.name === 'TypeError' || err.message === 'Failed to fetch'
```

If it is a network error → offline fallback runs.
If it is a server error (4xx/5xx) → error is re-thrown normally (not queued).

---

### Step 2 — Action Gets Queued → `addOfflineAction()`

Instead of losing the data, the failed action is serialized and saved to IndexedDB:

```js
// Example: CREATE action queued in journalService.js
const action = {
  action: 'CREATE',          // 'CREATE' | 'UPDATE' | 'DELETE'
  entryId: `temp-${Date.now()}`,
  payload: { title },
  timestamp: new Date().toISOString()
}
await addOfflineAction(action)
```

`addOfflineAction()` in `db.js` opens the `journal-offline-db` IndexedDB database and
writes the action into the `offline-actions` object store with an auto-incremented `id`.

---

### Step 3 — Optimistic UI (User Sees No Interruption)

`createJournal()`, `updateJournal()`, and `deleteJournal()` all return a local object
immediately after queueing, so the UI updates as if the request succeeded:

```js
// createJournal offline fallback return value
return {
  id: tempId,        // e.g. "temp-1718782800000"
  title,
  date: new Date().toISOString().split('T')[0]
}
```

`fetchJournals()` also reads pending offline actions and **merges them on top** of the
server-fetched list so the UI stays consistent even before sync.

---

### Step 4 — Back Online → Sync Triggers

When connectivity is restored, the queued actions need to be replayed against the backend.
Two approaches are used in this project (explained in detail below):

1. **Service Worker Background Sync** — primary, robust
2. **`window.addEventListener('online', ...)`** — fallback, simpler

---

## `db.js` — IndexedDB Queue Functions

| Function | Purpose |
|---|---|
| `openDB()` | Initialize / open the `journal-offline-db` database |
| `addOfflineAction(action)` | Queue a failed request |
| `getOfflineActions()` | Read all queued items in order for replay |
| `deleteOfflineAction(id)` | Remove a successfully synced item |
| `updateOfflineAction(action)` | Update a queued item (e.g. retry count, resolve temp ID) |
| `clearOfflineActions()` | Nuke the entire queue (use with caution) |

All functions return Promises and use `readwrite` / `readonly` transactions appropriately.

---

## Sync Trigger Logic

### Option A — Service Worker Background Sync (Primary)

This is the **robust approach**. It works even if the browser tab is closed when
connectivity is restored.

**How it works:**
1. After queueing an offline action, `registerBackgroundSync()` is called.
2. This registers a sync tag `'sync-journal-actions'` with the Service Worker's `SyncManager`.
3. The browser fires a `sync` event on the Service Worker when the device is back online.
4. The Service Worker handles the event and calls the replay function.

**Registration (already in `journalService.js`):**

```js
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
```

**Service Worker handler (`sw.js` or `service-worker.js`):**

```js
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-journal-actions') {
    event.waitUntil(replayOfflineActions())
  }
})
```

> **Browser support note**: Background Sync API is supported in Chrome/Edge.
> Firefox and Safari do not support it — use Option B as fallback.

---

### Option B — Client-to-Service-Worker Message (Fallback)

For browsers that do not support Background Sync (such as Safari and iOS), the client-side code acts as a fallback. Instead of executing the sync logic directly in the main thread (which would bypass service worker caches and request structures), the client monitors the connection status and requests the active Service Worker to execute the sync.

**The Workflow:**
1. **Connection Listener:** The browser client registers an `'online'` event listener inside the application pages.
2. **PostMessage Trigger:** When a connection transition is detected, the client verifies if `navigator.serviceWorker.controller` is available and sends a message payload of `{ type: 'TRIGGER_SYNC' }` to the Service Worker.
3. **Manual Run:** The Service Worker receives this message, intercepts the payload, and calls the queue replay function manually.

This ensures that synchronization is consistently handled within the Service Worker context, whether triggered automatically by Chrome's Background Sync Manager or manually by Safari's client message.

---

## The Replay / Sync Function (Inside `sw.js`)

The sync process is executed entirely inside the service worker context. It reads the IndexedDB queue in chronological order, resolves temporary IDs, replays API requests, and refreshes the user interface on completion.

> **Note on Service Worker Scope:** Because service workers cannot easily load ES6 module files natively across all user browsers, the IndexedDB functions (`openDB`, `getOfflineActions`, `deleteOfflineAction`) are defined directly inside `sw.js` to ensure backward compatibility.

### Replay & Sync Lifecycle Steps

1. **Querying the Store:** The service worker reads all queued operations from the `offline-actions` store in IndexedDB.
2. **Iterative API Calls:** It processes actions sequentially. For each queued event (CREATE, UPDATE, or DELETE), it makes a corresponding HTTP call against the backend:
   * **Temp ID Mapping:** For CREATE actions, the backend returns a permanent MongoDB ObjectID. The service worker tracks this in an in-memory mapping (`idMap`). If a subsequent UPDATE or DELETE in the same queue references the temporary ID (e.g. `temp-171...`), the service worker automatically replaces the temporary ID with the real ID before making the request, preventing 404 errors.
   * **Skip Redundant Updates:** If an item is created and then immediately deleted offline, the service worker skips calling the backend DELETE endpoint completely, saving network resources.
3. **Queue Cleanup:**
   * **On Success:** The action is deleted from IndexedDB.
   * **On Network Error:** The loop terminates immediately (`break`) to maintain chronological action ordering for the next attempt.
   * **On Request Rejection (e.g., 400 Bad Request):** The item is logged and deleted to prevent a malformed request from blocking the queue indefinitely.
4. **Client Notifications:** Once the queue has been processed, the service worker queries all open window clients and broadcasts a `SYNC_COMPLETE` message. Active browser tabs listen to this event and call `fetchJournals()` to update the local UI view.


---

## Full Offline Flow Diagram

```
User Action (e.g. Create Journal)
          │
          ▼
  navigator.onLine?
     │          │
    YES         NO
     │          │
     ▼          ▼
  fetch()   addOfflineAction()  ──→  IndexedDB Queue
     │          │
  Success    registerBackgroundSync()
     │
  Return data to UI (optimistic update in both paths)


Later, when back online:
─────────────────────────────────────────
  Browser fires 'sync' event (SW)
  OR window fires 'online' event
          │
          ▼
  replayOfflineActions()
          │
    for each action:
          │
          ▼
      fetch() to backend
          │
       res.ok?
      │       │
     YES      NO (network)
      │       │
      ▼       ▼
  deleteOfflineAction()   break (retry next time)
```

---

## Key Design Decisions

| Decision | Reasoning |
|---|---|
| **Temp IDs (`temp-{timestamp}`)** | Allows UI to render CREATE results before the server assigns a real ID |
| **`break` on network error** | Stops replaying if still offline — avoids pointless iterations |
| **Skip on server error (4xx)** | Bad data should not retry forever — log and discard |
| **Merge offline actions in `fetchJournals()`** | Keeps UI consistent between offline queuing and sync |
| **Background Sync as primary** | Works even when tab is closed; more reliable than `online` event |
| **`online` event as fallback** | Covers browsers that don't support Background Sync (Firefox, Safari) |
