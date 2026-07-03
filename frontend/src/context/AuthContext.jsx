import { createContext, useState, useContext, useEffect } from "react"
import { authClient } from "../services/auth-client"

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null)
  const [loading, setLoading] = useState(true)

  // Use Better Auth's session observer
  const sessionQuery = authClient.useSession()
  const session = sessionQuery?.data
  const isPending = sessionQuery?.isPending

  useEffect(() => {
    if (!isPending) {
      if (session?.user) {
        setCurrentUser({
          id: session.user.id,
          email: session.user.email,
          username: session.user.username || session.user.name || "",
          reminderTime: session.user.reminderTime,
          timezone: session.user.timezone,
          image: session.user.image || "",
        })
      } else {
        setCurrentUser(null)
      }
      setLoading(false)
    }
  }, [session, isPending])

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
      setCurrentUser({
        id: data.user.id,
        email: data.user.email,
        username: data.user.username || data.user.name || "",
        reminderTime: data.user.reminderTime,
        timezone: data.user.timezone,
        image: data.user.image || "",
      })
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
      setCurrentUser({
        id: data.user.id,
        email: data.user.email,
        username: data.user.username || data.user.name || "",
        reminderTime: data.user.reminderTime,
        timezone: data.user.timezone,
        image: data.user.image || "",
      })
    }
  }

  async function logout() {
    const { error } = await authClient.signOut()
    if (error) {
      console.error("Failed to sign out on Better Auth:", error)
    }
    setCurrentUser(null)
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

    await authClient.signOut()
    setCurrentUser(null)
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
    setCurrentUser(updatedUser)
    return updatedUser
  }

  function updateUserImage(imageUrl) {
    setCurrentUser(prev => prev ? { ...prev, image: imageUrl } : null)
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
