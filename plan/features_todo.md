# General TODO - ChatApp Project

This document tracks the implementation checklist for the ChatApp project, mapped directly to our multi-phase roadmap.

---

## 🏗️ Phase 0: Base Boilerplate Setup
*Already completed in the initial boilerplate project*

- [x] **Project Scaffolding**: Setup React (Vite) + Tailwind CSS frontend and Node.js + Express backend
- [x] **Database Integration**: Configure MongoDB connection with Mongoose ORM
- [x] **Secure Authentication**: Integrate Better Auth with Email/Password & Google/GitHub OAuth providers
- [x] **Premium UI/UX**: Frosted glassmorphism layout, responsive navigation, and transitions
- [x] **Personalized Customization**: Real-time accent color picker & background wallpaper selection
- [x] **Security Headers**: Setup Helmet, CORS, and basic rate limiting middleware
- [x] **Push Notification Baseline**: Setup client settings/opt-in interface and daily reminder options

---

## 🔐 Phase 1: Authentication & Presence Completion
*Finalizing authentication hooks and adding online/offline presence*

- [ ] Connect Better Auth sessions to frontend React Context (`AuthContext`)
- [ ] Add Profile Picture upload/management (integrate with settings page)
- [ ] Setup Socket.IO connection when user is authenticated
- [ ] Track User socket connections to maintain a real-time list of online users

---

## 💬 Phase 2: One-to-One Chat (Real-time)
*Core messaging features using Socket.IO*

- [ ] Create `Conversation` and `Message` schemas in MongoDB backend
- [ ] Create REST APIs to fetch conversation history and list users
- [ ] Implement socket event handlers on backend for joining rooms, sending, and receiving messages
- [ ] Implement Socket.IO client in React with optimistic message updates
- [ ] Implement Seen/Read receipts and deliver status over socket
- [ ] Implement Typing indicators (e.g., `user is typing...` events)
- [ ] Integrate user online/offline presence indicator on the chat screen
- [ ] Implement Last Seen timestamp for offline users

---

## 👥 Phase 3: Groups Chat
*Expanding chats to support group conversations*

- [ ] Update `Conversation` model to support group metadata (isGroup, members, admins, name, avatar)
- [ ] Create backend APIs for:
  - [ ] Creating groups
  - [ ] Adding/removing members
  - [ ] Managing group roles (admin permissions)
  - [ ] Renaming group & updating group avatar
- [ ] Build Group Chat UI frontend components:
  - [ ] Create Group Dialog
  - [ ] Group Settings / Detail Sidebar (members list, admin controls)
- [ ] Update Socket.IO rooms logic to broad-cast group messages to all active members in the room

---

## 📁 Phase 4: File Sharing & Cloud Storage
*Sending media and documents in chats*

- [ ] Update `Message` schema to support attachments metadata (file URL, name, size, type)
- [ ] Configure Cloud Storage backend integration (Cloudinary or AWS S3)
- [ ] Create backend upload route with security checks (file size limits, mime-type verification)
- [ ] Build frontend file dropzone:
  - [ ] Drag-and-drop file overlay
  - [ ] File selection previewer with progress bar
- [ ] Render file attachments properly (image preview, PDF links, audio/video player cards)

---

## ⚙️ Phase 5: Advanced Message Actions
*WhatsApp/Telegram-style message interactive features*

- [x] **Reply**: Quote another message in a reply preview card
- [x] **Edit**: Edit message content within a time limit (e.g. 15 minutes) and label it as "(edited)"
- [x] **Delete**: Delete messages ("Delete for me" vs "Delete for everyone")
- [x] **Emoji Reactions**: Allow users to click and react to messages with a subset of emojis
- [x] **Pin Messages**: Pin important messages to the top of a conversation window
- [ ] **Search**: Add a local search bar in ChatPage to find messages in the current conversation

---

## 🎙️ Phase 6: Voice Notes
*Audio recording and playback inside chat bubbles*

- [ ] Implement client-side audio recorder hook using MediaRecorder API
- [ ] Add recording indicator UI with timer and cancel slide option
- [ ] Integrate waveform visualization for audio messages (e.g. using `wavesurfer.js`)
- [ ] Implement playback controls with 1x/1.5x/2x speed settings

---

## 📱 Phase 7: Offline First
*Local-first architecture and background sync*

- [ ] Store messages locally using IndexedDB
- [ ] Queue unsent messages and retry automatically when online
- [ ] Sync conversations and messages when internet connection returns
- [ ] Support offline conversation loading and offline message sending

---

## 🌐 Phase 8: Progressive Web App
*Offline accessibility and push integrations*

- [ ] Configure Service Worker and Cache API for offline startup
- [ ] Setup Web App Manifest for installable chat application
- [ ] Integrate Static asset caching and offline fallback pages
- [ ] Setup background synchronization for chat updates

---

## 📞 Phase 9: Video & Voice Calls
*Real-time audio/video communication*

- [ ] Setup WebRTC peer connection logic on the frontend
- [ ] Implement Socket.IO signaling mechanism on the backend to exchange SDP offers/answers and ICE candidates
- [ ] Create Call state overlay UI (Incoming call, Outgoing call, Active call screen)
- [ ] Implement camera/microphone toggles and screen-sharing support

---

## 🟢 Phase 10: Real-time Presence Extensions
*Enhancing the presence state synchronization*

- [ ] Broadcast detailed statuses:
  - [ ] "Typing..."
  - [ ] "Recording voice..."
  - [ ] "Uploading file..."
- [ ] Optimize presence heartbeats to avoid excessive database writes

---

## 🔍 Phase 11: Global Advanced Search
*Locating users, documents, and past chats globally*

- [ ] Implement global search indexing endpoint on the backend
- [ ] Add query filters (Search by file type, sender, date range, text match)
- [ ] Build search results portal on the frontend sidebar

---

## 🛡️ Phase 12: Enhanced Security & E2E Encryption
*Securing the network and message contents*

- [ ] **E2EE Prototype**: Implement cryptographic message encryption/decryption using the Web Crypto API
- [ ] Establish secure key exchanges between client pairs (e.g., Signal Protocol or simplified DH exchange)
- [ ] Implement stricter backend rate limits for API authentication and socket events
- [ ] Setup input sanitization for all socket payloads to prevent XSS

---

## 🚀 Phase 13: Production Scaling
*Architecting for high volume concurrent connections*

- [ ] Integrate Redis Adapter with Socket.IO backend to allow multi-instance communications
- [ ] Setup Redis client container for caching and state sharing
- [ ] Setup load balancer (e.g., NGINX) configured with sticky sessions for WebSockets
- [ ] Perform simple load testing using tools like Artillery
