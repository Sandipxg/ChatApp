import { useContext, useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import ThemeContext from "../context/ThemeContext"
import { useAuth } from "../context/AuthContext"
import { useInstall } from '../context/InstallContext'
import {
  subscribeUserToPush,
  unsubscribeUserFromPush,
  getSubscriptionState,
  triggerTestPush
} from "../services/pushService"

// Custom SVG Icons
function SettingsIcon({ className }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  )
}

function BellIcon({ className }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9z" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  )
}

function ClockIcon({ className }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  )
}

function UserIcon({ className }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  )
}

function SunIcon({ className }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  )
}

function MoonIcon({ className }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  )
}

function SettingsPage() {
  const { theme, setTheme } = useContext(ThemeContext)
  const { currentUser, deleteAccount, updateReminderSettings } = useAuth()
  const { isInstallable, isInstalled, install } = useInstall()
  const navigate = useNavigate()
  
  const [activeTab, setActiveTab] = useState("general")
  const [password, setPassword] = useState("")
  const [deleteError, setDeleteError] = useState("")
  const [isDeleting, setIsDeleting] = useState(false)

  // Push notification permissions and subscription states
  const [permission, setPermission] = useState(() => typeof Notification !== 'undefined' ? Notification.permission : 'default')
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [pushLoading, setPushLoading] = useState(false)
  const [pushError, setPushError] = useState("")
  const [pushSuccess, setPushSuccess] = useState("")

  // Daily reminder settings states
  const [reminderEnabled, setReminderEnabled] = useState(() => currentUser?.reminderTime !== null)
  const [reminderTime, setReminderTime] = useState(() => currentUser?.reminderTime || '20:00')
  const [reminderLoading, setReminderLoading] = useState(false)
  const [reminderSuccess, setReminderSuccess] = useState("")
  const [reminderError, setReminderError] = useState("")

  // Save reminder schedule preferences to database
  async function handleSaveReminder(e) {
    e.preventDefault()
    setReminderError("")
    setReminderSuccess("")
    setReminderLoading(true)

    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
      const targetTime = reminderEnabled ? reminderTime : null
      await updateReminderSettings(targetTime, tz)
      setReminderSuccess("Reminder settings updated successfully!")
    } catch (err) {
      setReminderError(err.message || 'Failed to update reminder settings.')
    } finally {
      setReminderLoading(false)
    }
  }

  // Check initial subscription status on mount
  useEffect(() => {
    async function checkSubscription() {
      try {
        const subscribed = await getSubscriptionState()
        setIsSubscribed(subscribed)
      } catch (err) {
        console.error('Failed to get subscription state:', err)
      }
    }
    checkSubscription()
  }, [])

  // Toggle subscriptions (Subscribe/Unsubscribe or Ask Permission)
  async function handleToggleNotifications() {
    setPushError("")
    setPushSuccess("")
    setPushLoading(true)

    try {
      if (permission === 'denied') {
        throw new Error('Notifications are blocked by your browser settings.')
      }

      let currentPermission = permission
      if (currentPermission === 'default') {
        const result = await Notification.requestPermission()
        setPermission(result)
        currentPermission = result
      }

      if (currentPermission === 'granted') {
        if (isSubscribed) {
          await unsubscribeUserFromPush()
          setIsSubscribed(false)
          setPushSuccess("Successfully unsubscribed from notifications.")
        } else {
          await subscribeUserToPush()
          setIsSubscribed(true)
          setPushSuccess("Successfully subscribed to notifications!")
        }
      } else {
        throw new Error('Permission to show notifications was denied.')
      }
    } catch (err) {
      setPushError(err.message || 'An error occurred while updating notification settings.')
    } finally {
      setPushLoading(false)
    }
  }

  // Send a test notification to verified active subscriptions
  async function handleSendTestPush() {
    setPushError("")
    setPushSuccess("")
    setPushLoading(true)

    try {
      const result = await triggerTestPush()
      setPushSuccess(result.message || "Test push notification dispatched!")
    } catch (err) {
      setPushError(err.message || 'Failed to trigger test push notification.')
    } finally {
      setPushLoading(false)
    }
  }

  const isIOS = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream

  async function handleDeleteAccount(e) {
    e.preventDefault()
    setDeleteError("")
    setIsDeleting(true)

    try {
      await deleteAccount(password)
      navigate("/auth")
    } catch (err) {
      setDeleteError(err.message)
    } finally {
      setIsDeleting(false)
    }
  }

  const formatReminderTimeDisplay = (time24) => {
    if (!time24) return "12:00 AM"
    const [hourStr, minStr] = time24.split(":")
    const hour = parseInt(hourStr, 10)
    const ampm = hour >= 12 ? "PM" : "AM"
    const formattedHour = hour % 12 || 12
    return `${formattedHour.toString().padStart(2, '0')}:${minStr} ${ampm}`
  }

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="border-b border-[#f3f0f7] dark:border-gray-800 pb-5">
        <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 dark:text-gray-100 tracking-tight">
          Settings
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Customize your experience
        </p>
      </div>

      {/* Two Column Dashboard Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        
        {/* Left Column: Vertical Nav tabs / Mobile Segmented Control */}
        <div className="md:col-span-1">
          {/* Mobile Segmented Control: Fits perfectly without scrolling */}
          <div className="md:hidden bg-gray-100/80 dark:bg-gray-900/60 border border-[#f3f0f7] dark:border-gray-800/80 p-1 rounded-2xl grid grid-cols-4 gap-0.5 select-none w-full text-center mb-6">
            <button
              onClick={() => setActiveTab("general")}
              className={`flex flex-col items-center justify-center py-2.5 rounded-xl transition-all cursor-pointer ${
                activeTab === "general"
                  ? "bg-white dark:bg-gray-800 shadow-[0_2px_8px_rgba(0,0,0,0.06)] text-purple-700 dark:text-purple-400 font-bold"
                  : "text-gray-500 dark:text-gray-400 font-medium"
              }`}
            >
              <SettingsIcon className="w-4.5 h-4.5 mb-1" />
              <span className="text-[10px] tracking-tight">General</span>
            </button>

            <button
              onClick={() => setActiveTab("notifications")}
              className={`flex flex-col items-center justify-center py-2.5 rounded-xl transition-all cursor-pointer ${
                activeTab === "notifications"
                  ? "bg-white dark:bg-gray-800 shadow-[0_2px_8px_rgba(0,0,0,0.06)] text-purple-700 dark:text-purple-400 font-bold"
                  : "text-gray-500 dark:text-gray-400 font-medium"
              }`}
            >
              <BellIcon className="w-4.5 h-4.5 mb-1" />
              <span className="text-[10px] tracking-tight">Notif</span>
            </button>

            <button
              onClick={() => setActiveTab("reminders")}
              className={`flex flex-col items-center justify-center py-2.5 rounded-xl transition-all cursor-pointer ${
                activeTab === "reminders"
                  ? "bg-white dark:bg-gray-800 shadow-[0_2px_8px_rgba(0,0,0,0.06)] text-purple-700 dark:text-purple-400 font-bold"
                  : "text-gray-500 dark:text-gray-400 font-medium"
              }`}
            >
              <ClockIcon className="w-4.5 h-4.5 mb-1" />
              <span className="text-[10px] tracking-tight">Remind</span>
            </button>

            <button
              onClick={() => setActiveTab("account")}
              className={`flex flex-col items-center justify-center py-2.5 rounded-xl transition-all cursor-pointer ${
                activeTab === "account"
                  ? "bg-white dark:bg-gray-800 shadow-[0_2px_8px_rgba(0,0,0,0.06)] text-purple-700 dark:text-purple-400 font-bold"
                  : "text-gray-500 dark:text-gray-400 font-medium"
              }`}
            >
              <UserIcon className="w-4.5 h-4.5 mb-1" />
              <span className="text-[10px] tracking-tight">Account</span>
            </button>
          </div>

          {/* Desktop Tab Control: Vertical list */}
          <div className="hidden md:flex flex-col gap-1.5 select-none">
            <button
              onClick={() => setActiveTab("general")}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === "general"
                  ? "bg-purple-50 text-purple-700 dark:bg-purple-950/20 dark:text-purple-400"
                  : "text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
              }`}
            >
              <SettingsIcon className="w-5 h-5" />
              <span>General</span>
            </button>

            <button
              onClick={() => setActiveTab("notifications")}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === "notifications"
                  ? "bg-purple-50 text-purple-700 dark:bg-purple-950/20 dark:text-purple-400"
                  : "text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
              }`}
            >
              <BellIcon className="w-5 h-5" />
              <span>Notifications</span>
            </button>

            <button
              onClick={() => setActiveTab("reminders")}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === "reminders"
                  ? "bg-purple-50 text-purple-700 dark:bg-purple-950/20 dark:text-purple-400"
                  : "text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
              }`}
            >
              <ClockIcon className="w-5 h-5" />
              <span>Reminders</span>
            </button>

            <button
              onClick={() => setActiveTab("account")}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === "account"
                  ? "bg-purple-50 text-purple-700 dark:bg-purple-950/20 dark:text-purple-400"
                  : "text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
              }`}
            >
              <UserIcon className="w-5 h-5" />
              <span>Account</span>
            </button>
          </div>
        </div>

        {/* Right Column: Settings Cards Blocks */}
        <div className="md:col-span-3 space-y-6">
          
          {/* 1. GENERAL TAB PANELS */}
          {activeTab === "general" && (
            <>
              {/* Appearance Panel */}
              <div className="bg-white dark:bg-gray-800 border border-[#f3f0f7] dark:border-gray-700 rounded-2xl p-4.5 sm:p-6 shadow-[0_2px_10px_rgba(0,0,0,0.015)] space-y-5">
                <div>
                  <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">Appearance</h2>
                  <p className="text-sm text-gray-400 dark:text-gray-500">Choose your preferred theme</p>
                </div>
                
                <div className="flex bg-gray-50 dark:bg-gray-900 border border-[#f3f0f7] dark:border-gray-850 p-1.5 rounded-2xl w-fit">
                  <button
                    onClick={() => setTheme("light")}
                    className={`px-4.5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all cursor-pointer ${
                      theme === "light"
                        ? "bg-white dark:bg-gray-800 shadow-[0_2px_10px_rgba(0,0,0,0.05)] text-purple-600 dark:text-purple-400"
                        : "text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
                    }`}
                  >
                    <SunIcon className="w-4 h-4" />
                    <span>Light</span>
                  </button>
                  <button
                    onClick={() => setTheme("dark")}
                    className={`px-4.5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all cursor-pointer ${
                      theme === "dark"
                        ? "bg-white dark:bg-gray-800 shadow-[0_2px_10px_rgba(0,0,0,0.05)] text-purple-600 dark:text-purple-400"
                        : "text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
                    }`}
                  >
                    <MoonIcon className="w-4 h-4" />
                    <span>Dark</span>
                  </button>
                </div>
              </div>

              {/* App Installation Panel */}
              <div className="bg-white dark:bg-gray-800 border border-[#f3f0f7] dark:border-gray-700 rounded-2xl p-4.5 sm:p-6 shadow-[0_2px_10px_rgba(0,0,0,0.015)] space-y-5">
                <div>
                  <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">App Installation</h2>
                  <p className="text-sm text-gray-400 dark:text-gray-500">
                    Install the application on your system for standalone operation and offline mode.
                  </p>
                </div>

                {isInstalled ? (
                  <div className="flex items-center gap-3.5 bg-green-50/50 dark:bg-green-950/20 border border-green-200/50 dark:border-green-900/40 rounded-2xl p-4.5">
                    <svg className="w-5.5 h-5.5 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <p className="text-sm font-bold text-green-800 dark:text-green-300">Application Installed</p>
                      <p className="text-xs text-green-600/80 dark:text-green-400/80 mt-0.5">
                        Running My Journal App in standalone mode with full offline database access.
                      </p>
                    </div>
                  </div>
                ) : isInstallable ? (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-purple-50/40 dark:bg-purple-950/10 border border-purple-100 dark:border-purple-900/30 rounded-2xl p-4.5">
                    <div className="space-y-0.5">
                      <p className="text-sm font-bold text-purple-800 dark:text-purple-300">Ready to Install</p>
                      <p className="text-xs text-purple-600/80 dark:text-purple-400/80">
                        Add a shortcut to your home screen or desktop for instant launching.
                      </p>
                    </div>
                    <button
                      onClick={install}
                      className="bg-purple-600 hover:bg-purple-700 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-[0_4px_12px_rgba(124,58,237,0.15)] flex items-center gap-1.5 cursor-pointer whitespace-nowrap self-start sm:self-auto"
                    >
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      <span>Install App</span>
                    </button>
                  </div>
                ) : isIOS ? (
                  <div className="bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-900/40 rounded-2xl p-4.5 space-y-2">
                    <div className="flex items-center gap-2">
                      <svg className="w-5 h-5 text-amber-500 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="text-sm font-bold text-amber-800 dark:text-amber-300">Install on iOS (Safari)</p>
                    </div>
                    <p className="text-xs text-amber-600/80 dark:text-amber-400/80 leading-relaxed">
                      Tap the <strong className="font-semibold">Share</strong> button in Safari's menu bar and select <strong className="font-semibold">Add to Home Screen</strong> to install.
                    </p>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 bg-gray-50 dark:bg-gray-700/30 border border-gray-200 dark:border-gray-700 rounded-2xl p-4.5">
                    <svg className="w-5.5 h-5.5 text-gray-400 dark:text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <p className="text-sm font-bold text-gray-700 dark:text-gray-300">Running in Browser</p>
                      <p className="text-xs text-gray-400 dark:text-gray-550 mt-0.5">
                        Access this app using Google Chrome or Edge to enable desktop/home screen installation.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {/* 2. NOTIFICATIONS TAB PANEL */}
          {activeTab === "notifications" && (
            <div className="bg-white dark:bg-gray-800 border border-[#f3f0f7] dark:border-gray-700 rounded-2xl p-4.5 sm:p-6 shadow-[0_2px_10px_rgba(0,0,0,0.015)] space-y-5">
              <div>
                <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">Push Notifications</h2>
                <p className="text-sm text-gray-400 dark:text-gray-500">
                  Receive reminders and notifications to write in your journal and keep your streak alive.
                </p>
              </div>

              {permission === 'denied' ? (
                <div className="flex items-center gap-3.5 bg-red-50/50 dark:bg-red-950/20 border border-red-200/50 dark:border-red-900/40 rounded-2xl p-4.5">
                  <svg className="w-5.5 h-5.5 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <div>
                    <p className="text-sm font-bold text-red-800 dark:text-red-300">Notifications Blocked</p>
                    <p className="text-xs text-red-600/80 dark:text-red-400/80 mt-0.5 leading-relaxed">
                      You have blocked notifications for this site. To receive notifications, click the lock icon in your browser address bar and set notifications to 'Allow'.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-purple-50/40 dark:bg-purple-950/10 border border-purple-100 dark:border-purple-900/30 rounded-2xl p-4.5">
                  <div className="space-y-0.5">
                    <p className="text-sm font-bold text-purple-800 dark:text-purple-300">
                      {permission === 'granted' && isSubscribed ? 'Notifications Enabled' : 'Enable System Reminders'}
                    </p>
                    <p className="text-xs text-purple-600/80 dark:text-purple-400/80">
                      {permission === 'granted' && isSubscribed 
                        ? 'Your device is registered to receive push notifications.' 
                        : 'Subscribe to start receiving real-time reminders.'}
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-2 flex-wrap">
                    {permission === 'granted' && isSubscribed && (
                      <button
                        onClick={handleSendTestPush}
                        disabled={pushLoading}
                        className="bg-white dark:bg-gray-700 text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-gray-600 border border-purple-200 dark:border-gray-600 px-4 py-2 rounded-xl text-sm font-bold transition-colors disabled:opacity-60 cursor-pointer whitespace-nowrap"
                      >
                        Send Test Push
                      </button>
                    )}
                    <button
                      onClick={handleToggleNotifications}
                      disabled={pushLoading}
                      className="bg-purple-600 hover:bg-purple-700 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-[0_4px_12px_rgba(124,58,237,0.15)] disabled:opacity-65 cursor-pointer whitespace-nowrap"
                    >
                      {pushLoading ? 'Processing...' : (permission === 'granted' && isSubscribed ? 'Disable' : 'Enable')}
                    </button>
                  </div>
                </div>
              )}

              {pushError && (
                <p className="text-red-500 text-sm font-semibold">{pushError}</p>
              )}
              {pushSuccess && (
                <p className="text-green-600 dark:text-green-400 text-sm font-semibold">{pushSuccess}</p>
              )}
            </div>
          )}

          {/* 3. REMINDERS TAB PANEL */}
          {activeTab === "reminders" && (
            <form
              onSubmit={handleSaveReminder}
              className="bg-white dark:bg-gray-800 border border-[#f3f0f7] dark:border-gray-700 rounded-2xl p-4.5 sm:p-6 shadow-[0_2px_10px_rgba(0,0,0,0.015)] space-y-5"
            >
              <div>
                <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">Daily Reminders</h2>
                <p className="text-sm text-gray-400 dark:text-gray-500">
                  Schedule a daily alert to prompt you to write. Helps build your journaling habit.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-purple-50/40 dark:bg-purple-950/10 border border-purple-100 dark:border-purple-900/30 rounded-2xl p-4.5">
                <div className="flex items-center gap-3 select-none">
                  <input
                    id="reminder-toggle"
                    type="checkbox"
                    checked={reminderEnabled}
                    onChange={(e) => setReminderEnabled(e.target.checked)}
                    className="w-4.5 h-4.5 text-purple-600 border-[#c6bfe0] dark:border-gray-600 rounded-lg focus:ring-purple-500 dark:bg-gray-700 cursor-pointer"
                  />
                  <label htmlFor="reminder-toggle" className="text-sm font-bold text-purple-800 dark:text-purple-300 cursor-pointer">
                    Enable Daily Reminders
                  </label>
                </div>

                <div className="flex items-center justify-between sm:justify-start gap-3 w-full sm:w-auto">
                  <span className="hidden md:inline-block text-sm font-bold text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-900 px-3 py-2 border border-[#f3f0f7] dark:border-gray-700 rounded-xl">
                    {formatReminderTimeDisplay(reminderTime)}
                  </span>
                  <input
                    type="time"
                    value={reminderTime}
                    disabled={!reminderEnabled}
                    onChange={(e) => setReminderTime(e.target.value)}
                    className="px-3.5 py-2 border border-[#e2def0] dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 disabled:opacity-50 transition-opacity"
                  />
                  <button
                    type="submit"
                    disabled={reminderLoading}
                    className="bg-purple-600 hover:bg-purple-700 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-[0_4px_12px_rgba(124,58,237,0.15)] disabled:opacity-60 cursor-pointer whitespace-nowrap"
                  >
                    {reminderLoading ? 'Saving...' : 'Edit'}
                  </button>
                </div>
              </div>

              {/* Detected timezone */}
              <div className="flex justify-between items-center text-xs text-gray-400 dark:text-gray-500">
                <span>Timezone: <strong className="font-bold text-gray-500 dark:text-gray-400">{Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'}</strong></span>
              </div>

              {(!isSubscribed || permission !== 'granted') && (
                <div className="bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-900/40 rounded-2xl p-4 flex items-start gap-2.5">
                  <svg className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <p className="text-xs text-amber-600/80 dark:text-amber-400/80 leading-relaxed">
                    Note: Please enable **Push Notifications** under the Notifications tab so your device is registered to receive these scheduled alerts.
                  </p>
                </div>
              )}

              {reminderError && (
                <p className="text-red-500 text-sm font-semibold">{reminderError}</p>
              )}
              {reminderSuccess && (
                <p className="text-green-600 dark:text-green-400 text-sm font-semibold">{reminderSuccess}</p>
              )}
            </form>
          )}

          {/* 4. ACCOUNT TAB PANEL */}
          {activeTab === "account" && (
            <form
              onSubmit={handleDeleteAccount}
              className="bg-white dark:bg-gray-800 border border-red-100 dark:border-red-950 rounded-2xl p-4.5 sm:p-6 shadow-[0_2px_10px_rgba(0,0,0,0.015)] space-y-5"
            >
              <div>
                <h2 className="text-lg font-bold text-red-600 dark:text-red-400">Delete Account</h2>
                <p className="text-sm text-gray-400 dark:text-gray-500">
                  This removes your account and all journals linked to it. This action is permanent.
                </p>
              </div>

              <div className="max-w-sm space-y-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Confirm Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password to confirm"
                    className="px-4 py-2.5 border border-[#e2def0] dark:border-gray-600 dark:bg-gray-750 dark:text-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent transition-all"
                  />
                </div>
              </div>

              {deleteError && (
                <p className="text-red-500 text-sm font-semibold">{deleteError}</p>
              )}

              <button
                type="submit"
                disabled={isDeleting}
                className="w-full sm:w-auto bg-white dark:bg-gray-800 hover:bg-red-50 dark:hover:bg-red-950/20 text-red-600 border border-red-200 dark:border-red-900 rounded-xl px-5 py-2.5 text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                <span>{isDeleting ? "Deleting..." : "Delete Account"}</span>
              </button>
            </form>
          )}

        </div>
      </div>
    </div>
  )
}

export default SettingsPage
