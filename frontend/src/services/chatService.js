const BASE_URL = `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/chat`

export async function fetchContacts() {
  const res = await fetch(`${BASE_URL}/contacts`, { credentials: 'include' })
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}))
    throw new Error(errorData.error || 'Failed to fetch contacts')
  }
  return res.json()
}

export async function fetchPartners() {
  const res = await fetch(`${BASE_URL}/partners`, { credentials: 'include' })
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}))
    throw new Error(errorData.error || 'Failed to fetch chat partners')
  }
  return res.json()
}

export async function fetchMessages(chatId, cursor = null, limit = 20) {
  let url = `${BASE_URL}/messages/${chatId}?limit=${limit}`
  if (cursor) {
    url += `&cursor=${encodeURIComponent(cursor)}`
  }
  const res = await fetch(url, { credentials: 'include' })
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}))
    throw new Error(errorData.error || 'Failed to fetch messages')
  }
  return res.json()
}

export async function sendMessage(receiverId, text) {
  const res = await fetch(`${BASE_URL}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ receiverId, text }),
    credentials: 'include',
  })
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}))
    throw new Error(errorData.error || 'Failed to send message')
  }
  return res.json()
}

export async function createGroup(name, memberIds, avatar) {
  const res = await fetch(`${BASE_URL}/groups`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name, memberIds, avatar }),
    credentials: 'include',
  })
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}))
    throw new Error(errorData.error || 'Failed to create group')
  }
  return res.json()
}

export async function addMembers(chatId, memberIds) {
  const res = await fetch(`${BASE_URL}/groups/${chatId}/members`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ memberIds }),
    credentials: 'include',
  })
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}))
    throw new Error(errorData.error || 'Failed to add members')
  }
  return res.json()
}

export async function removeMember(chatId, memberId) {
  const res = await fetch(`${BASE_URL}/groups/${chatId}/members/${memberId}`, {
    method: 'DELETE',
    credentials: 'include',
  })
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}))
    throw new Error(errorData.error || 'Failed to remove member')
  }
  return res.json()
}

export async function updateGroupRole(chatId, memberId, role) {
  const res = await fetch(`${BASE_URL}/groups/${chatId}/role`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ memberId, role }),
    credentials: 'include',
  })
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}))
    throw new Error(errorData.error || 'Failed to update group role')
  }
  return res.json()
}

export async function updateGroupDetails(chatId, name, avatar) {
  const res = await fetch(`${BASE_URL}/groups/${chatId}/details`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name, avatar }),
    credentials: 'include',
  })
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}))
    throw new Error(errorData.error || 'Failed to update group details')
  }
  return res.json()
}

export async function leaveGroup(chatId) {
  const res = await fetch(`${BASE_URL}/groups/${chatId}/leave`, {
    method: 'POST',
    credentials: 'include',
  })
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}))
    throw new Error(errorData.error || 'Failed to leave group')
  }
  return res.json()
}

export async function fetchUploadSignature() {
  const res = await fetch(`${BASE_URL}/upload-signature`, { credentials: 'include' })
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}))
    throw new Error(errorData.error || 'Failed to fetch upload signature')
  }
  return res.json()
}

export function uploadDirectToCloudinary(file, signatureData, onProgress, abortSignal) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    const formData = new FormData()

    const { signature, timestamp, apiKey, cloudName, folder } = signatureData
    const resourceType = file.type.startsWith('video/') ? 'video' : 'image'

    formData.append('file', file)
    formData.append('api_key', apiKey)
    formData.append('timestamp', timestamp)
    formData.append('signature', signature)
    formData.append('folder', folder)

    xhr.open('POST', `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`)

    if (xhr.upload && onProgress) {
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded * 100) / event.total)
          onProgress(percent)
        }
      }
    }

    if (abortSignal) {
      abortSignal.addEventListener('abort', () => {
        xhr.abort()
        reject(new DOMException('Upload aborted by user', 'AbortError'))
      })
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText))
        } catch (e) {
          reject(new Error('Invalid response from Cloudinary'))
        }
      } else {
        try {
          const err = JSON.parse(xhr.responseText)
          reject(new Error(err.error?.message || `Cloudinary upload failed with status ${xhr.status}`))
        } catch (e) {
          reject(new Error(`Cloudinary upload failed with status ${xhr.status}`))
        }
      }
    }

    xhr.onerror = () => {
      reject(new Error('Network error during Cloudinary upload'))
    }

    xhr.send(formData)
  })
}

export async function sendMediaMessage(receiverId, text, type, fileAttachment) {
  const res = await fetch(`${BASE_URL}/messages/media`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ receiverId, text, messageType: type, fileAttachment }),
    credentials: 'include',
  })
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}))
    throw new Error(errorData.error || 'Failed to send media message')
  }
  return res.json()
}

export async function editMessage(messageId, text) {
  const res = await fetch(`${BASE_URL}/messages/${messageId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text }),
    credentials: 'include',
  })
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}))
    throw new Error(errorData.error || 'Failed to edit message')
  }
  return res.json()
}

export async function deleteMessageForEveryone(messageId) {
  const res = await fetch(`${BASE_URL}/messages/${messageId}/everyone`, {
    method: 'DELETE',
    credentials: 'include',
  })
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}))
    throw new Error(errorData.error || 'Failed to delete message for everyone')
  }
  return res.json()
}

export async function deleteMessageForMe(messageId) {
  const res = await fetch(`${BASE_URL}/messages/${messageId}/me`, {
    method: 'DELETE',
    credentials: 'include',
  })
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}))
    throw new Error(errorData.error || 'Failed to delete message for me')
  }
  return res.json()
}




