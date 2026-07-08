# ChatApp Master TODO

This document tracks both the concepts to learn and the implementation progress for the ChatApp project.

---

# 🏗️ Phase 0: Base Boilerplate Setup
*Already completed*

## Learn

- [x] React + Vite project structure
- [x] Express backend structure
- [x] MongoDB + Mongoose
- [x] Better Auth basics
- [x] Tailwind CSS
- [x] Docker basics

## Build

- [x] React frontend
- [x] Express backend
- [x] MongoDB integration
- [x] Better Auth
- [x] Tailwind UI
- [x] Helmet
- [x] CORS
- [x] Rate limiting
- [x] Push notification settings page

---

# 🔐 Phase 1: Authentication & Presence

## Learn

- [x] HTTP vs WebSockets
- [x] Polling / Long Polling / Server-Sent Events
- [x] WebSocket lifecycle
- [x] Socket.IO basics (events, reconnection)
- [x] Socket authentication
- [x] Session sharing (Better Auth → Socket)
- [x] REST vs Socket responsibilities
- [x] Online presence architecture
- [x] Heartbeat mechanism
- [x] Disconnect handling
- [x] Last Seen implementation

## Build

- [x] Connect Better Auth session to React
- [x] Profile picture upload ( using Cloudinary )
- [x] Connect Socket.IO after login
- [x] Store active socket connections
- [x] Show online users
- [x] Show offline users
- [x] Update Last Seen timestamps

---

# 💬 Phase 2: One-to-One Chat

## Learn

- [x] Conversation schema design
- [x] Message schema design
- [x] MongoDB indexes & pagination
- [x] Socket.IO Rooms
- [x] Socket.IO Broadcasting
- [x] Socket.IO Acknowledgements
- [x] Socket middleware
- [x] Event-driven architecture
- [x] Message lifecycle

## Build

- [x] Conversation schema
- [x] Message schema
- [x] Get conversation API
- [x] Get messages API
- [x] Socket.IO backend
- [x] Socket.IO frontend
- [x] Join conversation rooms
- [x] Send messages
- [x] Receive messages
- [x] Typing indicator
- [x] Delivered receipts
- [x] Read receipts

---

# 👥 Phase 3: Group Chats

## Learn

- [x] Group permissions
- [x] Socket.IO rooms
- [x] Role-based authorization
- [x] Group data modelling

## Build

- [x] Group conversations
- [x] Create groups
- [x] Add members
- [x] Remove members
- [x] Promote admins
- [x] Rename groups
- [x] Group avatar
- [x] Group settings page

---

# 📁 Phase 4: File Sharing

## Learn

- [x] Multipart Form Data
- [x] Upload streaming
- [x] Cloudinary
- [x] AWS S3 
- [x] cloudflare R2
- [x] Upload progress

## Build ( using cloudinary because others are paid )
(only support images videos because for zip , pdf u will need aws s3 or other services which are paid )

- [x] Attachment schema
- [x] Upload API
- [x] Drag & Drop
- [x] Preview uploads
- [x] Upload progress
- [x] Image viewer
- [x] PDF preview (Excluded per user request)
- [x] Audio player (Excluded per user request)
- [x] Video player


---

# ⚙️ Phase 5: Advanced Messaging

## Learn

- [x] Message editing
- [x] Soft delete
- [x] Hard delete
- [ ] Emoji reaction architecture
- [ ] Message pinning
- [ ] Search indexing

## Build

- [ ] Reply
- [x] Edit
- [x] Delete
- [x] Delete for everyone
- [ ] Emoji reactions
- [ ] Pin messages
- [ ] Conversation search

---

# 🎙️ Phase 6: Voice Notes

## Learn

- [ ] MediaRecorder API
- [ ] Audio encoding
- [ ] WaveSurfer.js
- [ ] Blob handling

## Build

- [ ] Voice recording
- [ ] Timer
- [ ] Cancel recording
- [ ] Waveform
- [ ] Playback controls
- [ ] Playback speed

---

# 📱 Phase 7: Offline First

## Learn

- [ ] IndexedDB
- [ ] Local-first architecture
- [ ] Background Sync
- [ ] Retry queues
- [ ] Conflict resolution
- [ ] Cache API
- [ ] Optimistic UI

## Build

- [ ] Store messages locally
- [ ] Queue unsent messages
- [ ] Retry automatically
- [ ] Sync when online
- [ ] Offline conversation loading
- [ ] Offline message sending

---

# 🌐 Phase 8: Progressive Web App

## Learn

- [ ] Service Workers
- [ ] Manifest
- [ ] Push API
- [ ] Notification API
- [ ] Install Prompt

## Build

- [ ] Installable app
- [ ] Offline startup
- [ ] Static asset caching
- [ ] Push notifications
- [ ] Background sync

---

# 📞 Phase 9: Voice & Video Calls

## Learn

### WebRTC

- [ ] Peer connections
- [ ] SDP
- [ ] ICE Candidates
- [ ] STUN
- [ ] TURN
- [ ] NAT Traversal

### Signaling

- [ ] Socket.IO signaling
- [ ] Call lifecycle

## Build

- [ ] Voice calls
- [ ] Video calls
- [ ] Incoming call UI
- [ ] Active call UI
- [ ] Camera toggle
- [ ] Mic toggle
- [ ] Screen sharing

---

# 🟢 Phase 10: Presence Extensions

## Learn

- [ ] Presence synchronization
- [ ] Heartbeat optimization
- [ ] Presence caching

## Build

- [ ] Typing...
- [ ] Recording...
- [ ] Uploading...
- [ ] Better heartbeat handling

---

# 🔍 Phase 11: Global Search

## Learn

- [ ] MongoDB text indexes
- [ ] Search optimization
- [ ] Filtering

## Build

- [ ] Search API
- [ ] Filter by sender
- [ ] Filter by date
- [ ] Filter by file
- [ ] Search UI

---

# 🔔 Phase 12: Push Notifications

## Learn

- [ ] Push subscriptions
- [ ] VAPID Keys
- [ ] Notification payloads

## Build

- [ ] Notify offline users
- [ ] Open conversation on click
- [ ] Notification settings

---

# 🛡️ Phase 13: Security

## Learn

- [ ] Web Crypto API
- [ ] End-to-End Encryption basics
- [ ] Diffie-Hellman
- [ ] Signal Protocol overview
- [ ] Socket validation
- [ ] XSS prevention
- [ ] Rate limiting

## Build

- [ ] Encrypt messages (prototype)
- [ ] Key exchange
- [ ] Secure socket events
- [ ] Input sanitization
- [ ] Better rate limiting

---

# 🚀 Phase 14: Scaling

## Learn

- [ ] Redis
- [ ] Redis Pub/Sub
- [ ] Socket.IO Redis Adapter
- [ ] Horizontal Scaling
- [ ] Sticky Sessions
- [ ] Load Balancers
- [ ] NGINX
- [ ] Reverse Proxy

## Build

- [ ] Redis container
- [ ] Redis adapter
- [ ] Multiple backend instances
- [ ] NGINX
- [ ] Load testing (Artillery)

---

# 🧪 Phase 15: Testing

## Learn

- [ ] Socket testing
- [ ] API testing
- [ ] Multi-client testing
- [ ] Performance testing

## Build

- [ ] Test multiple users
- [ ] Test reconnects
- [ ] Test offline mode
- [ ] Test duplicate messages
- [ ] Test large group chats

---

# 🚀 Phase 16: Deployment

## Learn

- [ ] WebSocket deployment
- [ ] HTTPS
- [ ] Reverse Proxy
- [ ] Production monitoring

## Build

- [ ] Deploy frontend
- [ ] Deploy backend
- [ ] Deploy MongoDB
- [ ] Configure HTTPS
- [ ] Production socket testing