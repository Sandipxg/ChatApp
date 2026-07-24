import { createContext, useState, useContext, useEffect } from "react"
import { authClient } from "../services/auth-client"

const AuthContext = createContext(null)
const AUTH_USER_KEY = "chatapp_auth_user"

export function AuthProvider({ children }) {
  // Initialize currentUser from localStorage for instant mobile app cold start
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const cached = localStorage.getItem(AUTH_USER_KEY)
      return cached ? JSON.parse(cached) : null
    } catch (e) {
      return null
    }
  })

  // Loading state is false initially if we already have a cached user in localStorage
  const [loading, setLoading] = useState(() => {
    try {
      return !localStorage.getItem(AUTH_USER_KEY)
    } catch (e) {
      return true
    }
  })

  const persistUser = (userObj) => {
    if (userObj) {
      setCurrentUser(userObj)
      try {
        localStorage.setItem(AUTH_USER_KEY, JSON.stringify(userObj))
      } catch (e) { }
    } else {
      setCurrentUser(null)
      try {
        localStorage.removeItem(AUTH_USER_KEY)
      } catch (e) { }
    }
  }

  // Use Better Auth's session observer
  const sessionQuery = authClient.useSession()
  const session = sessionQuery?.data
  const isPending = sessionQuery?.isPending
  const sessionError = sessionQuery?.error

  useEffect(() => {
    if (!isPending) {
      if (session?.user) {
        const userData = {
          id: session.user.id,
          email: session.user.email,
          username: session.user.username || session.user.name || "",
          reminderTime: session.user.reminderTime,
          timezone: session.user.timezone,
          image: session.user.image || "",
        }
        persistUser(userData)
      } else if (sessionError && (sessionError.status === 401 || sessionError.status === 403)) {
        // Only wipe user session if server explicitly confirms 401/403 Unauthorized
        persistUser(null)
      }
      setLoading(false)
    }
  }, [session, isPending, sessionError])

  async function signup(email, username, password, name) {
    const { data, error } = await authClient.signUp.email({
      email,
      password,
      username,
      name: name || username,
    })

    if (error) {
      throw new Error(error.message || "Failed to sign up")
    }

    if (data?.user) {
      const userData = {
        id: data.user.id,
        email: data.user.email,
        username: data.user.username || data.user.name || "",
        reminderTime: data.user.reminderTime,
        timezone: data.user.timezone,
        image: data.user.image || "",
      }
      persistUser(userData)
    }
  }

  async function login(email, password) {
    const { data, error } = await authClient.signIn.email({
      email,
      password
    })

    if (error) {
      throw new Error(error.message || "Failed to log in")
    }

    if (data?.user) {
      const userData = {
        id: data.user.id,
        email: data.user.email,
        username: data.user.username || data.user.name || "",
        reminderTime: data.user.reminderTime,
        timezone: data.user.timezone,
        image: data.user.image || "",
      }
      persistUser(userData)
    }
  }

  async function logout() {
    persistUser(null)
    try {
      await authClient.signOut()
    } catch (e) {
      console.error("Failed to sign out on Better Auth:", e)
    }
  }

  async function deleteAccount(password) {
    const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/auth/deleteaccount`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
      credentials: "include",
    })

    const data = await res.json()
    if (!res.ok) throw new Error(data.error)

    persistUser(null)
    try {
      await authClient.signOut()
    } catch (e) { }
    return data
  }

  async function updateReminderSettings(reminderTime, timezone) {
    const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/auth/reminder`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reminderTime, timezone }),
      credentials: 'include'
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Failed to update reminder settings')

    const updatedUser = { 
      ...currentUser, 
      reminderTime: data.reminderTime, 
      timezone: data.timezone 
    }
    persistUser(updatedUser)
    return updatedUser
  }

  function updateUserImage(imageUrl) {
    if (!currentUser) return
    const updatedUser = { ...currentUser, image: imageUrl }
    persistUser(updatedUser)
  }

  return (
    <AuthContext.Provider value={{ currentUser, loading, signup, login, logout, deleteAccount, updateReminderSettings, updateUserImage }}>
      {loading ? (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
          <div className="w-12 h-12 border-4 border-purple-200 dark:border-purple-900 border-t-purple-600 dark:border-t-purple-400 rounded-full animate-spin"></div>
        </div>
      ) : children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}

export default AuthContext
