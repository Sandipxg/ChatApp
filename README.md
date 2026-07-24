# 💬 ChatApp — Real-Time E2EE & WebRTC Media Communications Platform

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![React](https://img.shields.io/badge/React-18.x-61DAFB?logo=react&logoColor=white)](https://react.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-18.x-339933?logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![WebRTC](https://img.shields.io/badge/WebRTC-PeerToPeer-FF6F00?logo=webrtc&logoColor=white)](https://webrtc.org/)
[![WebCrypto](https://img.shields.io/badge/Security-E2EE_ECDH_P--256-green)](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-v4.x-010101?logo=socketdotio&logoColor=white)](https://socket.io/)
[![Better Auth](https://img.shields.io/badge/Auth-Better_Auth_30_Days-7C3AED)](https://better-auth.com/)

A full-stack, enterprise-grade real-time web application featuring **End-to-End Encryption (E2EE)**, **WebRTC Voice & Video Calling**, **Bi-directional Socket.IO Messaging**, and a responsive **Glassmorphic UI**. Built with extreme focus on security, persistent sessions, performance, and cross-platform browser support (Mobile PWA & Desktop).

---

## 🌟 Technical Highlights & Key Features

### 🔒 End-to-End Encryption (E2EE) Architecture
- **Asymmetric Key Exchange**: Uses Elliptic Curve Diffie-Hellman (`ECDH P-256`) via the native Web Crypto API.
- **Symmetric Payload Encryption**: Scrambles message payloads on device using `AES-GCM-256` with random 12-byte initialization vectors (`iv`). Zero plain text stored on server or database.
- **JWK Storage Serialization**: Converts raw crypto handles into standard **JSON Web Key (JWK)** format stored in `IndexedDB` & `localStorage`. Guarantees 100% key persistence across browser reloads, mobile cold starts, and device restarts.
- **Comprehensive Documentation**: Detailed cryptographic breakdowns documented in [notes/E2EE.md](file:///c:/Users/mrsan/Desktop/Boilerplate/notes/E2EE.md).

### 📞 WebRTC Voice & Video Calling System
- **Real-Time P2P Signaling**: Socket.IO relay for WebRTC `offer`, `answer`, `ice_candidate`, and real-time `toggle_media` state synchronization.
- **Full-Screen Calling Overlay**: Modern glassmorphic 100vw $\times$ 100vh call interface with picture-in-picture local camera feed, duration timer, and full responsive controls.
- **Media Control & Status Tracking**: Live Mute/Unmute microphone, Camera On/Off, Audio Speaker Toggle API, and real-time remote mute badges.
- **Mobile Screen Sharing**: Fixed-aspect-ratio remote view (`object-contain bg-slate-950`) with mobile browser `getDisplayMedia` feature detection.
- **Persistent Call Logging**: Automatic local call history recording (Incoming, Outgoing, Missed/Declined, Duration, Timestamp) with one-touch call-back actions.

### ⚡ Real-Time Socket.IO Messaging Engine
- **Instant Messaging**: Bi-directional message delivery with typing indicators (`isTyping`), user activity status, message reactions, and unread counters.
- **Session & Offline Resiliency**: Socket automatic reconnection recovery and offline message queueing via Service Workers (`sync-chat-messages`).

### 🔑 Authentication & Session Persistence
- **30-Day Cookie Persistence**: Configured Better Auth with explicit 30-day session expiry (`expiresIn: 30 days`), `Partitioned` cookies for WebViews, and `SameSite=None` attributes.
- **Instant Cold Start**: Client-side `localStorage` state caching prevents mobile app cold-start login drops during network wake-up delays.
- **Multi-Provider Authentication**: Email & Password auth paired with Google & GitHub OAuth integrations.

### 🎨 UI/UX & Customization
- **Modern Glassmorphism Design**: Frosted glass panels, dynamic accent color pickers, and light/dark theme switching powered by Tailwind CSS.
- **Media Uploads**: Cloudinary CDN integration with Multer multi-part file parsing for avatar and image attachments.

---

## 🛠️ Complete Tech Stack & Cryptographic Standards

### Cryptography & Protocols
- **Asymmetric Encryption / Key Exchange**: `ECDH P-256` (Elliptic Curve Diffie-Hellman)
- **Symmetric Payload Encryption**: `AES-GCM-256` (Authenticated Encryption)
- **Key Serialization**: `JWK (JSON Web Key)` (RFC 7517)
- **Real-Time Media**: `WebRTC (Web Real-Time Communication)` + `STUN / TURN`
- **Real-Time Signaling & Transport**: `Socket.IO` (WebSockets + HTTP long-polling fallback)

### Frontend
- **Core Library**: React 18 (Vite build engine)
- **Styling**: Tailwind CSS, Vanilla CSS glassmorphism, Framer Motion
- **Routing**: React Router DOM (v6)
- **State Management**: React Context API (`AuthContext`, `CallContext`, `SocketContext`, `ThemeContext`, `InstallContext`)
- **PWA & Offline**: Web Service Workers, `IndexedDB`, `localStorage`

### Backend
- **Runtime Environment**: Node.js (v18+)
- **Web Framework**: Express.js
- **Database & ORM**: MongoDB + Mongoose ORM
- **Authentication**: Better Auth (MongoDB Adapter & Username Plugin)
- **Media Uploads**: Cloudinary SDK + Multer Middleware
- **Security & Headers**: Helmet, CORS, Express Rate Limiting

---

## 🏗️ End-to-End Encryption (E2EE) Lifecycle

```
[ Alice's Browser ]                                  [ MongoDB / Server ]                                 [ Bob's Browser ]
        │                                                     │                                                    │
 1. Generate ECDH KeyPair ────────────────────────────────────┼────────────────────────────────────────────► 1. Generate ECDH KeyPair
    (Save PrivateKey to IndexedDB as JWK)                      │                                              (Save PrivateKey to IndexedDB as JWK)
        │                                                     │                                                    │
 2. Upload PublicKey_Alice (JWK) ────────────────────────────►│◄──────────────────────────── Upload PublicKey_Bob (JWK)
        │                                                     │                                                    │
 3. Fetch PublicKey_Bob ◄─────────────────────────────────────┤───────────────────────────────────── Fetch PublicKey_Alice
        │                                                     │                                                    │
 4. Derive SharedAESKey = ECDH(Priv_Alice, Pub_Bob)           │                                4. Derive SharedAESKey = ECDH(Priv_Bob, Pub_Alice)
        │                                                     │                                                    │
        │ ── 5. Encrypt "Hi" ──► Ciphertext: "x89Fk2..." ───►│── 6. Relay Ciphertext ────────────────────────► 7. Decrypt "x89Fk2..."
        │        (Using SharedAESKey + random IV)             │    (Server NEVER sees plaintext!)                 (Using SharedAESKey + random IV)
```

> **Note**: For an in-depth mathematical and protocol comparison (Static ECDH vs. Signal Double Ratchet vs. MLS Group E2EE), refer to [notes/E2EE.md](file:///c:/Users/mrsan/Desktop/Boilerplate/notes/E2EE.md).

---

## 📁 Project Directory Structure

```
Boilerplate/
├── backend/
│   ├── config/             # Better Auth, Database, & CORS configurations
│   ├── controllers/        # Chat & Push notification controllers
│   ├── middleware/         # Auth verification & Error handling
│   ├── models/             # Mongoose schemas (User, Message)
│   ├── routes/             # Express API routers (Auth, User, Chat, Push)
│   ├── services/           # Socket.IO event handler & WebRTC signaling
│   └── app.js              # Express app setup & server initialization
├── frontend/
│   ├── src/
│   │   ├── components/     # UI Elements, CallModal overlay, ErrorBoundary
│   │   ├── context/        # AuthContext, CallContext, SocketContext, ThemeContext
│   │   ├── pages/          # ChatPage, LoginPage, SettingsPage
│   │   ├── services/       # Better Auth Client & API service handlers
│   │   ├── utils/          # WebCrypto E2EE utilities (crypto.js)
│   │   └── App.jsx         # Main application routing & layout shell
├── notes/
│   └── E2EE.md             # Comprehensive E2EE Architectural Specification & FAQs
└── docker-compose.yml      # Multi-container Docker orchestration
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **MongoDB**: Local MongoDB instance or MongoDB Atlas URI

### 1. Backend Installation
```bash
cd backend
npm install
```

Create a `.env` file inside `backend/`:
```env
PORT=3000
MONGODB_URI=mongodb://localhost:27017/chatapp
BETTER_AUTH_SECRET=your_super_secret_auth_key
BETTER_AUTH_URL=http://localhost:3000
FRONTEND_URL=http://localhost:5173

# Optional Cloudinary CDN Keys
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Optional TURN Server Configuration for WebRTC
VITE_TURN_SERVER_URL=turn:your-turn-server.com:3478
VITE_TURN_USERNAME=your_username
VITE_TURN_CREDENTIAL=your_password
```

Start backend development server:
```bash
npm run dev
```

### 2. Frontend Installation
```bash
cd ../frontend
npm install
```

Create a `.env` file inside `frontend/`:
```env
VITE_API_URL=http://localhost:3000
```

Start frontend development server:
```bash
npm run dev
```
Open `http://localhost:5173` in your browser.

---

## 🐳 Docker Deployment

Launch database, backend, and frontend with a single command:
```bash
docker-compose up --build
```
- **MongoDB**: `mongodb://localhost:27017`
- **Backend API**: `http://localhost:3000`
- **Frontend Client**: `http://localhost:5173`

---

## 📄 License
Distributed under the **MIT License**. See `LICENSE` for more information.
