// Web Crypto API E2EE Utilities (ECDH P-256 + AES-GCM-256)

const DB_NAME = 'chatapp_crypto_keys'
const STORE_NAME = 'ecdh_keys'

function openCryptoDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = (e) => {
      const db = e.target.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME)
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function saveKeyPairToIndexedDB(userId, keyPair) {
  const db = await openCryptoDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    store.put(keyPair, userId)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

async function getKeyPairFromIndexedDB(userId) {
  const db = await openCryptoDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    const req = store.get(userId)
    req.onsuccess = () => resolve(req.result || null)
    req.onerror = () => reject(req.error)
  })
}

/**
 * Generate or fetch ECDH Key Pair for the active user
 */
export async function getOrGenerateUserECDHKeyPair(userId) {
  if (!userId) throw new Error('userId is required for E2EE key initialization')

  const existing = await getKeyPairFromIndexedDB(userId)
  if (existing && existing.privateKey && existing.publicKey) {
    return existing
  }

  // Generate new ECDH P-256 Key Pair
  const newKeyPair = await window.crypto.subtle.generateKey(
    {
      name: 'ECDH',
      namedCurve: 'P-256',
    },
    true, // Extractable public key
    ['deriveKey', 'deriveBits']
  )

  await saveKeyPairToIndexedDB(userId, newKeyPair)
  return newKeyPair
}

/**
 * Export Public CryptoKey to JWK object for network transfer
 */
export async function exportPublicKeyJWK(publicKey) {
  return await window.crypto.subtle.exportKey('jwk', publicKey)
}

/**
 * Import JWK public key from peer user into CryptoKey
 */
export async function importPublicKeyJWK(jwk) {
  return await window.crypto.subtle.importKey(
    'jwk',
    jwk,
    {
      name: 'ECDH',
      namedCurve: 'P-256',
    },
    true,
    []
  )
}

/**
 * Derive shared AES-GCM-256 key using my private key and peer's public key
 */
export async function deriveSharedAESKey(myPrivateKey, peerPublicKey) {
  return await window.crypto.subtle.deriveKey(
    {
      name: 'ECDH',
      public: peerPublicKey,
    },
    myPrivateKey,
    {
      name: 'AES-GCM',
      length: 256,
    },
    false, // Non-extractable shared secret
    ['encrypt', 'decrypt']
  )
}

/**
 * Encrypt plaintext string using derived AES-GCM key
 */
export async function encryptMessageText(text, aesKey) {
  const encoder = new TextEncoder()
  const data = encoder.encode(text)
  const iv = window.crypto.getRandomValues(new Uint8Array(12))

  const ciphertextBuffer = await window.crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv,
    },
    aesKey,
    data
  )

  // Convert Uint8Array to Base64 strings safely
  const ciphertextBase64 = btoa(String.fromCharCode(...new Uint8Array(ciphertextBuffer)))
  const ivBase64 = btoa(String.fromCharCode(...iv))

  return {
    ciphertext: ciphertextBase64,
    iv: ivBase64,
  }
}

/**
 * Decrypt ciphertext Base64 string using derived AES-GCM key
 */
export async function decryptMessageText(ciphertextBase64, ivBase64, aesKey) {
  try {
    const ciphertext = Uint8Array.from(atob(ciphertextBase64), (c) => c.charCodeAt(0))
    const iv = Uint8Array.from(atob(ivBase64), (c) => c.charCodeAt(0))

    const decryptedBuffer = await window.crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv,
      },
      aesKey,
      ciphertext
    )

    const decoder = new TextDecoder()
    return decoder.decode(decryptedBuffer)
  } catch (err) {
    console.error('Failed to decrypt message:', err)
    return '[Encrypted Message - Decryption Failed]'
  }
}
