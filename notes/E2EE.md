# End-to-End Encryption (E2EE) Explanation & Architecture Guide

> **Implementation Type**: **Type 1 — Static ECDH (P-256) + AES-GCM (256-bit)**  
> *This guide explains the Static ECDH E2EE architecture implemented in ChatApp, as well as Type 2, Type 3, and Type 4 protocols for reference.*

---

# PART 1: Type 1 — Static ECDH (Current Implementation)

## 1. Key Lifecycle & Storage Breakdown

### When Keys Are Created
- **First Time Login (New Device / New Browser)**: Key Pair is generated **ONCE** when the user logs in for the first time on a new device/browser via `window.crypto.subtle.generateKey()`.
- **Subsequent App Opens / Reloads**: Existing keys are loaded directly from storage. **NO new keys are generated**.

### Where & How Keys Are Stored

| Key Type | Stored Where | Format Stored | Who Has Access | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| **Private Key** (Secret) | 📱 **Device Storage Only**<br/>(`IndexedDB` + `localStorage`) | **JWK (JSON Web Key)** | **ONLY YOU**<br/>*(Never leaves device or sent to server)* | Decrypts incoming messages |
| **Public Key** (Shared) | 🌐 **MongoDB Database**<br/>*(and local device cache)* | **JWK (JSON Web Key)** | **EVERYONE**<br/>*(Contacts download it)* | Allows contacts to encrypt messages for you |

---

## 2. Why JWK Format Instead of Raw Form?

### Why NOT Raw Form (`CryptoKey`)?
- A raw `CryptoKey` is an **active C++ memory handle** inside the browser/OS security engine (like a live webcam stream or open database connection).
- Operating System & Browser vendors (Safari iOS, Chrome Mobile WebViews, Brave, Incognito) **block writing raw native memory handles to disk files** for security and stability reasons.
- **Earlier Problem**: Saving raw `CryptoKey` to `IndexedDB` failed on reload. `IndexedDB` returned `null`, forcing the app to generate a **new key pair on every reload**, which broke decryption (`[Encrypted Message - Decryption Failed]`).

### Why JWK (JSON Web Key) Format?
- Calling `exportKey('jwk', key)` extracts the key numbers into a standard **plain text JSON object**:
  ```json
  {
    "kty": "EC",
    "crv": "P-256",
    "x": "f83OJ3D2...",
    "y": "x_9aK1W...",
    "d": "e98H1mK..."
  }
  ```
- Plain JSON text is **100% reliably saved to disk** by `IndexedDB` and `localStorage` on all browsers, mobile devices, and operating systems.
- When the app opens next time, `importKey` reads the JSON text and restores the **exact same key** instead of creating a new one!

---

## 3. Deriving the Shared Secret Key (The ECDH Magic)

When **Alice** opens a chat with **Bob**:

```text
SharedAESKey1 = Bob's Public Key + Alice's Private Key
SharedAESKey2 = Alice's Public Key + Bob's Private Key

SharedAESKey1 === SharedAESKey2
```

Both Alice's device and Bob's device compute the **exact same 256-bit `SharedAESKey`**!

---

## 4. What We Do With `SharedAESKey`

We use **`SharedAESKey`** to **encrypt** and **decrypt** actual text messages (`AES-GCM-256`):

### Sending a Message (Alice $\rightarrow$ Bob):
1. Alice types `"Hello Bob"`.
2. Alice's browser runs `encryptMessageText("Hello Bob", SharedAESKey, iv)`.
3. Output: `Ciphertext = "x89Fk2mP..."` (unreadable scrambled text).
4. Alice sends `"x89Fk2mP..."` to the server.
5. **MongoDB & Node.js server ONLY store `"x89Fk2mP..."`**. They NEVER see `"Hello Bob"`.

### Receiving a Message (Bob's Phone):
1. Bob receives `"x89Fk2mP..."`.
2. Bob's browser runs `decryptMessageText("x89Fk2mP...", SharedAESKey, iv)`.
3. Output: `"Hello Bob"` decrypts cleanly on Bob's chat screen!

---

## 5. Cons & Security Limitations of Type 1 Implementation

While Type 1 Static ECDH provides full End-to-End Encryption against server/database eavesdropping, it has known security trade-offs:

1. **Lack of Forward Secrecy ⚠️**: If a hacker steals your `PrivateKey` from your device storage, and previously captured past encrypted network traffic, the hacker can compute `SharedAESKey` and **decrypt ALL past messages**.
2. **Lack of Post-Compromise Security ⚠️**: Once a `PrivateKey` leaks, the hacker can continue to **decrypt ALL future messages** sent in that chat until the user explicitly clears storage and regenerates a new key pair.

---

# PART 2: Type 2 — The Double Ratchet Protocol (WhatsApp / Signal Reference)

### In Type 1 (What we currently built):
The keys in the formula **NEVER change**:

$$\text{SharedAESKey} = \text{Bob's Permanent Public Key} + \text{Alice's Permanent Private Key}$$

Because the keys in the formula never change, **`SharedAESKey` stays the exact same forever**.

---

### In Type 2 (The Double Ratchet Protocol):
The exact same formula is used, **BUT the keys inside the formula CHANGE on every reply!**

Type 2 uses **two complementary cryptographic ratchets**:

1. **Ratchet #1: KDF Hash Chain (Forward Secrecy)**  
   Keys are generated per message and immediately erased from device memory to protect past messages.

2. **Ratchet #2: Diffie-Hellman (DH) Exchange Ratchet (Post-Compromise Security)**  
   Every time Bob replies to Alice, Bob generates a brand-new temporary key pair (`Bob's New Temp Key`):

$$\text{SharedAESKey\_New} = \text{Bob's NEW Temp Public Key} + \text{Alice's NEW Temp Private Key}$$

1. Both devices calculate the **new `SharedAESKey_New`** via Diffie-Hellman (DH) Exchange.
2. Both devices **IMMEDIATELY DELETE the old `SharedAESKey`**.

---

### Summary of the Difference:

- **Type 1 (Static)**:
  - Uses Permanent Keys in the formula.
  - Formula output (`SharedAESKey`) **never changes**.

- **Type 2 (Double Ratchet)**:
  - Combines **KDF Hash Chain** + **Diffie-Hellman (DH) Exchange Ratchet**.
  - Plugs **new temporary keys** into the formula on every reply.
  - Formula output (`SharedAESKey_New`) **changes constantly**, and old keys are erased!

---

# PART 3: Type 3 — MLS (Messaging Layer Security - IETF RFC 9420)

### What it is:
MLS is the modern internet standard designed specifically for **large-scale group chat E2EE**.

### Why it exists:
In Double Ratchet (Type 2), sending 1 message in a group of 500 people requires encrypting the message **500 separate times** (Fan-out encryption), which heavily drains mobile battery and network bandwidth ($O(N)$ linear complexity).

### How MLS solves it (TreeKEM):
- Organizes group members into a mathematical **Binary Tree** (TreeKEM).
- Adding, removing, or updating keys for members operates in **$O(\log N)$ logarithmic time** instead of linear time.
- Allows massive group chats (thousands of members) to run full E2EE smoothly without draining mobile battery.
- **Used by**: Wire, Cisco Webex, Wickr, RingCentral.

---

# PART 4: Type 4 — Post-Quantum E2EE (PQ-E2EE / Hybrid Resistance)

### What it is:
Combines classical ECDH with **Lattice-Based Post-Quantum Cryptography** (such as Kyber-768 / ML-KEM).

### Why it exists:
Future Quantum Computers will be capable of breaking standard RSA and ECDH math (Shor's Algorithm). Hackers can record encrypted network traffic today and wait to decrypt it 10 years later when quantum computers arrive ("Harvest Now, Decrypt Later").

### How PQ-E2EE solves it:
- Dual-layer encryption: Encrypts data with **both** classical ECDH **AND** a Quantum-Resistant Algorithm (Kyber-768).
- Even if quantum computers break ECDH, the post-quantum lattice layer remains unbreakable.
- **Used by**: Signal (**PQXDH Protocol**), Apple iMessage (**PQ3 Protocol** in iOS 17.4+).

---

# PART 5: Common Doubts & FAQs

### Q1: If Type 2 (Double Ratchet) isn't the newest, why does WhatsApp still use it?

1. **Gold Standard for 1-on-1 Chats (85%+ of Traffic)**: For 1-on-1 private messaging, Type 2 has zero performance penalty and provides perfect Forward Secrecy & Post-Compromise Security.
2. **Sender Keys Optimization for Groups**: WhatsApp uses an extension called **Sender Keys** for groups. Your device generates 1 Sender Key (ratcheted via KDF), encrypts it once per member, and then broadcasts group messages using that single key, avoiding $O(N)$ per-message overhead.
3. **Deployment Timing**: WhatsApp deployed Signal Protocol (Type 2) in 2014–2016. MLS (Type 3) was only finalized by the IETF in **July 2023**. Migrating 2 Billion+ active users to a new protocol takes years.

---

# Overall E2EE Paradigm Summary Matrix

| Type | Paradigm | Primary Key Mechanism | Best Used For | Known Apps |
| :--- | :--- | :--- | :--- | :--- |
| **Type 1** | **Static ECDH** | 1-time static shared secret key | 1-on-1 basic apps & PGP Email | ChatApp (Current), PGP, Matrix basic |
| **Type 2** | **Double Ratchet** | KDF Chain + DH Ratchet (keys change per msg/turn) | 1-on-1 & small group secure messaging | Signal, WhatsApp, iMessage, RCS |
| **Type 3** | **MLS (TreeKEM)** | Binary Tree Key Graphs ($O(\log N)$ complexity) | Large-scale Group Chats (100+ members) | Wire, Cisco Webex, Wickr, IETF standard |
| **Type 4** | **Post-Quantum (PQ)** | Kyber-768 Hybrid + ECDH | Defense against future Quantum Computers | Signal (PQXDH), Apple iMessage (PQ3) |
