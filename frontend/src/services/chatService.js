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

export async function fetchMessages(chatId) {
  const res = await fetch(`${BASE_URL}/messages/${chatId}`, { credentials: 'include' })
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
