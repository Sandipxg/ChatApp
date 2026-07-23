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
