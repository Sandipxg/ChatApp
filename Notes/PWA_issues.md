# Offline-First & PWA Edge Cases

Tackle one issue at a time. Mark `[x]` when done.

---

## 1. 🔴 Temp ID Resolution After Sync

- [x] **Understand the problem**
  - When a CREATE action syncs, the server returns a real ID (e.g. `real-456`)
  - But local state and any queued follow-up actions still reference the temp ID (e.g. `temp-123`)
  - An UPDATE or DELETE queued after the CREATE will hit the server with a temp ID → **404**

- [x] **Fix: capture the real ID returned by CREATE sync**
  - In `replayOfflineActions()`, after a successful CREATE, read the real ID from the response
  - Scan the remaining queue for any actions with `entryId === tempId`
  - Update them to use the real ID via `updateOfflineAction()`

- [x] **Fix: update local/UI state to replace temp ID with real ID**
  - Emit an event or return a mapping `{ tempId → realId }` from the sync function
  - UI layer updates its list accordingly

- [x] **Test: create offline → edit offline → come online → verify sync works end to end**

---

## 2. 🔴 Queue Compaction / Action Deduplication

- [ ] **Understand the problem**
  - User creates, edits 3 times, then deletes the same entry — all offline
  - Queue holds 5 actions that logically cancel each other out
  - Replaying all 5 wastes requests and can cause errors (e.g. DELETE before CREATE reaches server)

- [ ] **Define compaction rules**
  - `CREATE → DELETE` (same entryId) = discard both, nothing to sync
  - `CREATE → UPDATE(s)` (same entryId) = merge payload into the CREATE, discard UPDATEs
  - `UPDATE → UPDATE` (same entryId) = keep only the latest UPDATE
  - `UPDATE → DELETE` (same entryId) = discard UPDATE, keep only DELETE

- [x] **Implement `compactQueue(actions)`**
  - Takes the raw action array
  - Returns a reduced array with redundant actions collapsed
  - Call this at the start of `replayOfflineActions()` before iterating

- [x] **Test: simulate multi-action offline sequences and verify compacted queue is correct**

---

## 3. 🔴 Stale App Shell Cache Lockout

- [x] **Understand the problem**
  - Cache-first strategy for root `/` and `/index.html` causes the browser to serve the cached file instantly without checking the network.
  - When the app is updated/deployed, users are stuck on the old `index.html` referencing old/deleted JS/CSS hashes, causing blank screens or crash-on-load.

- [x] **Fix: Implement Network-First or Stale-While-Revalidate for HTML document requests**
  - Update `sw.js` fetch handler to intercept document navigation requests and check network first, falling back to cache.

- [x] **Test: Modify code, redeploy, verify browser retrieves new version without manual SW unregistration.**

---

## 4. 🔴 Duplicate Key Database Crash on Multi-User Push Subscription

- [x] **Understand the problem**
  - The database schema enforces `unique: true` on `endpoint`, but `pushController.js` upserts using `{ userId, endpoint }`.
  - When User B logs in on the same browser (reusing the same endpoint), the search query fails to match and tries to insert a new document, causing a MongoDB `E11000 duplicate key error`.

- [x] **Fix: Upsert by endpoint alone**
  - Update `PushSubscription.findOneAndUpdate()` in the backend to query by `{ endpoint }` and set `{ userId, keys }`.

- [x] **Test: Log in as User A, register push → Log out → Log in as User B, register push → Verify no database errors.**

---

## 5. 🔴 Dynamic Import (Lazy Loading Chunk) Failure Offline

- [x] **Understand the problem**
  - React pages are dynamically loaded using `React.lazy()`.
  - Vite splits these pages into separate JS chunks in production.
  - Since chunks are not pre-cached and only cached dynamically upon visit while online, navigating to an unvisited page while offline will throw a `ChunkLoadError` and crash the app.

- [x] **Fix: Configure asset pre-caching or build error boundary handlers**
  - Automate caching of compiled assets during the build process, or implement a React Error Boundary wrapper around `<Suspense>` to recover from dynamic chunk loading errors gracefully.

- [x] **Test: Go offline, navigate to an unvisited page in settings/journals, and verify it doesn't crash the shell.**

---

## 6. 🟡 JWT Expiry While Offline

- [ ] **Understand the problem**
  - User goes offline, JWT expires (e.g. after 1 hour / 24 hours)
  - When sync runs, every request gets **401 Unauthorized**
  - Current code treats 401 as a server error and **silently discards the action** (data loss)

- [ ] **Fix: detect 401 specifically in `replayOfflineActions()`**
  - If `res.status === 401` → stop sync immediately, do not delete the action
  - Mark the queue as "paused — auth required"

- [ ] **Fix: prompt re-authentication before sync**
  - If 401 is detected, notify the user to log in again
  - After re-authentication and new JWT is set, re-trigger `replayOfflineActions()`

- [ ] **Consider: store JWT expiry time and pre-check before sync starts**
  - If token is already expired, skip sync entirely and prompt login first

- [ ] **Test: expire a token manually → go offline → create journal → come online → verify action is preserved, not lost**

---

## 7. 🟡 Offline UI Feedback

- [ ] **Understand the problem**
  - User has no visual indication they are offline
  - No feedback on how many actions are pending sync
  - No confirmation when sync completes

- [ ] **Implement: offline/online status banner or indicator**
  - Listen to `window.addEventListener('online' / 'offline')`
  - Show a non-intrusive banner when offline (e.g. "You're offline — changes will sync when reconnected")
  - Hide it when back online

- [ ] **Implement: pending actions badge/count**
  - Read `getOfflineActions()` on load and after each user action
  - Display count somewhere visible (e.g. "2 changes pending sync")

- [ ] **Implement: sync success notification**
  - After `replayOfflineActions()` completes, notify the user (e.g. toast: "All changes synced")

- [ ] **Test: go offline → create entries → verify indicator shows → come online → verify sync notification appears**

---

## 8. 🟡 Navigation Cache-Miss for Query Parameters

- [x] **Understand the problem**
  - The service worker matches static resources exactly.
  - Adding parameters (e.g. `/?utm_source=homescreen` or `?code=123`) results in cache-misses offline, failing to load the PWA.

- [x] **Fix: Ignore search parameters during cache check**
  - Pass `{ ignoreSearch: true }` to `caches.match` inside the fetch interception block.

- [x] **Test: Access local app at `/?test=true` while offline and verify the app still loads successfully.**

---

## 9. 🟡 Service Worker Lifecycle Lock

- [x] **Understand the problem**
  - Service worker doesn't call `skipWaiting()` or `clients.claim()`.
  - Updated service workers stay waiting indefinitely, and `navigator.serviceWorker.controller` is `null` on first load, breaking client-to-sw `postMessage` sync triggers.

- [x] **Fix: Set skipWaiting and claim clients**
  - Add `self.skipWaiting()` to the `'install'` listener and `self.clients.claim()` to the `'activate'` listener in `sw.js`.

- [x] **Test: Load page for the first time, verify `navigator.serviceWorker.controller` is defined and communication works immediately.**

---

## 10. 🟡 Safari / iOS "Failed to fetch" Check Mismatch

- [x] **Understand the problem**
  - Error checking checks for `err.message === 'Failed to fetch'`, but Safari throws `"Load failed"` on network failures.
  - Safari offline actions will skip the IndexedDB fallback and throw unhandled errors to the UI (causing data loss).

- [x] **Fix: standardise network error detection**
  - Update the service worker helper and fetch requests error checks to verify `err.name === 'TypeError'` or both error messages.

- [x] **Test: Simulate offline network request in Safari, verify action is successfully queued in IndexedDB.**

---

## 11. 🟢 PWA Install Experience

- [ ] **Understand the scope**
  - This is separate from sync logic but part of the full offline-first story
  - Covers: `manifest.json`, app icons, install prompt, splash screen

- [ ] **Verify `manifest.json` is complete**
  - `name`, `short_name`, `start_url`, `display: standalone`
  - `theme_color`, `background_color`
  - All required icon sizes (192x192, 512x512 minimum)

- [ ] **Implement: install prompt (`beforeinstallprompt`)**
  - Intercept and store the `beforeinstallprompt` event
  - Show a custom "Install App" button at an appropriate moment (not immediately on load)
  - On click: call `prompt()` on the stored event

- [ ] **Verify: app passes Lighthouse PWA audit**
  - Installable criteria met
  - Offline fallback page works
  - Service Worker is registered and active

- [ ] **Test: open in Chrome → verify install prompt appears → install → launch from home screen → go offline → verify app loads**

---

## 12. 🟢 Hardcoded Routes in Service Worker

- [x] **Understand the problem**
  - The service worker relies on a hardcoded list of valid app routes.
  - Adding new page routes requires editing `sw.js`, otherwise reloading them offline returns a generic `offline.html` fallback page.

- [x] **Fix: Match document navigation dynamically**
  - Modify `isValidAppRoute()` or default to fallback `/` for all document requests with `accept: text/html` headers that are not API calls or static files.

- [x] **Test: Add a mock route (e.g. `/test-page`), load it offline, and verify it correctly serves the React App Shell.**
