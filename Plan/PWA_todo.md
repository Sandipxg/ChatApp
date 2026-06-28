# 18. Progressive Web Apps (PWA)

## 18.1 PWA Fundamentals

* [x] Understand what a PWA is
* [x] Understand how PWAs differ from native apps
* [x] Understand advantages and limitations of PWAs
* [x] Learn how browsers install PWAs
* [x] Learn when PWAs can work offline

---

## 18.2 Web App Manifest

* [x] Learn what `manifest.json` is
* [x] Add application name
* [x] Add short name
* [x] Add application description
* [x] Add theme color
* [x] Add background color
* [x] Add application icons
* [x] Configure standalone display mode

Practice:

* [ ] Make app installable on desktop *(after service worker is set up)*
* [ ] Make app installable on Android *(after service worker is set up)*

---

## 18.3 Service Worker Basics

* [x] Understand what a Service Worker is
* [x] Understand service worker lifecycle
* [x] Learn registration process
* [x] Learn install event
* [x] Learn activate event
* [x] Learn fetch event

Practice:

* [x] Register service worker successfully
* [x] Verify service worker installation

---

## 18.4 Asset Caching

* [x] Learn why caching is needed
* [x] Cache HTML files
* [x] Cache CSS files
* [x] Cache JavaScript bundles
* [x] Cache images
* [x] Learn cache versioning

Practice:

* [x] Load app after internet disconnect
* [x] Verify static assets still work

---

## 18.5 Offline Fallback

* [x] Learn offline fallback strategy
* [x] Create offline page
* [x] Detect internet loss
* [x] Show offline message

Practice:

* [x] Disconnect internet
* [x] Open app
* [x] Verify offline page appears

---

## 18.6 Cache Strategies

Learn:

* [x] Cache First
* [x] Network First
* [x] Stale While Revalidate

Understand:

* [x] When each strategy should be used
* [x] Pros and cons of each strategy

Practice:

* [x] Use Cache First for images
* [x] Use Network First for API calls

---

## 18.7 App Installation Experience

* [x] Detect install prompt
* [x] Show install button
* [x] Handle installation flow
* [x] Test uninstall/reinstall

Practice:

* [x] Install app on Android
* [x] Install app on Desktop

---

## 18.8 PWA Auditing

* [x] Learn Lighthouse basics
* [x] Run Lighthouse audit
* [x] Fix installability issues
* [x] Fix performance warnings
* [x] Fix accessibility warnings

---

## 18.9 Push Notifications (Optional)

* [x] Learn Web Push basics
* [x] Learn notification permissions
* [x] Send local notification
* [x] Learn push notification architecture

---

## 18.10 Offline Writes & Background Sync (Optional)

* [x] Learn IndexedDB basics (local browser database)
* [x] Store offline journal entries in IndexedDB
* [x] Learn Service Worker Background Sync API
* [x] Synchronize pending offline entries to Node.js backend when online


---

## 18.11 Storage Management (Optional)

Understanding:

* [ ] Learn storage estimate API (`navigator.storage.estimate()`)
* [ ] Understand browser quotas
* [ ] Understand Cache limits
* [ ] Understand IndexedDB limits
---

## 18.12 Native App Branding & Feel (Optional)

* [ ] Configure maskable icons in manifest (prevents browser emblem framing on Android)
* [ ] Understand WebAPK generation on Android (removes browser badge from installed app icon)
* [ ] Set theme and background colors to match OS system UI bars
* [ ] Hide browser branding in push notifications using Service Worker `badge` and `icon` properties
* [ ] Package PWA as a native app using Trusted Web Activities (TWA) and Bubblewrap CLI
* [ ] Configure Digital Asset Links (`.well-known/assetlinks.json`) to verify domain ownership and remove browser URL bar

---

## 18.13 PWA Update Strategies (Critical for Production)

* [ ] Understand the Service Worker `waiting` lifecycle state
* [ ] Detect when a new Service Worker is available in the background
* [ ] Implement a "New update available" toast/alert UI prompting user to reload
* [ ] Trigger `skipWaiting()` and update client immediately on user confirmation

---

## Final Goal

Convert your Journal App into:

* [x] Installable application
* [x] Home screen icon
* [x] Standalone app experience
* [x] Offline loading of frontend assets
* [x] Offline fallback page
* [ ] Offline creation/editing of journal entries (via IndexedDB & Sync)
* [ ] Lighthouse PWA score above 90
