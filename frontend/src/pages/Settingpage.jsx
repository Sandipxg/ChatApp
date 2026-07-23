import { useContext, useState, useEffect } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import ThemeContext from "../context/ThemeContext"
import { useAuth } from "../context/AuthContext"

import {
  subscribeUserToPush,
  unsubscribeUserFromPush,
  getSubscriptionState,
  triggerTestPush
} from "../services/pushService"
import { useInstall } from "../context/InstallContext"

// Custom SVG Icons


function LockIcon({ className = "w-5 h-5" }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0V10.5m-2.852 0a1.5 1.5 0 0 0-1.488 1.482l-.099 7.04A1.5 1.5 0 0 0 2.5 20.5h19a1.5 1.5 0 0 0 1.487-1.478l-.099-7.04a1.5 1.5 0 0 0-1.488-1.482H3.75Z" />
    </svg>
  )
}

function BellIcon({ className = "w-5 h-5" }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
    </svg>
  )
}

function GearIcon({ className = "w-5 h-5" }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.43l-1.003.828c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.43l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 0 1 0-.255c.007-.378-.138-.75-.43-.991l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.645-.869l.214-1.28Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
    </svg>
  )
}

function PaintIcon({ className = "w-5 h-5" }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 0 0-3.078 0L3.75 17.5a.75.75 0 1 0 .75 1.3l2.7-1.378a1.5 1.5 0 0 1 1.54 0L11.25 19a.75.75 0 1 0 .75-1.3l-2.47-1.578Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5a4.5 4.5 0 0 0-4.5-4.5c-1.637 0-3.136.877-3.957 2.296L7.696 12.5A4.5 4.5 0 0 0 11.25 19.5c1.638 0 3.137-.878 3.957-2.297l4.097-7.202c.62-1.091.946-2.333.946-3.501Z" />
    </svg>
  )
}


function LogoutIcon({ className = "w-5 h-5" }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M12 9l-3 3m0 0 3 3m-3-3h12.75" />
    </svg>
  )
}

function ChevronRightIcon({ className = "w-4 h-4" }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
    </svg>
  )
}

function CheckmarkIcon({ className = "w-4 h-4" }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
    </svg>
  )
}

const ACCENT_OPTIONS = [
  { key: 'teal', hex: '#14b8a6', label: 'Mint' },
  { key: 'blue', hex: '#3b82f6', label: 'Blue' },
  { key: 'indigo', hex: '#6366f1', label: 'Indigo' },
  { key: 'rose', hex: '#ec4899', label: 'Rose' },
  { key: 'orange', hex: '#f97316', label: 'Orange' },
  { key: 'purple', hex: '#a855f7', label: 'Purple' }
]

const PRESET_THEMES = [
  { id: "default", label: "Default", colors: ["#f8f9fc", "#ffffff", "#6366f1"] },
  { id: "sunset", label: "Sunset", colors: ["#fff8f8", "#fff0f3", "#ff4d6d"] },
  { id: "forest", label: "Forest", colors: ["#f4fbf7", "#e8f5ed", "#2d9d61"] },
  { id: "dracula", label: "Dracula", colors: ["#282a36", "#1e1f29", "#ff79c6"] },
  { id: "retro", label: "Retro", colors: ["#ece3ca", "#e4d8b4", "#a27b38"] },
  { id: "synthwave", label: "Synthwave", colors: ["#1a0b2e", "#0f051d", "#f10086"] },
  { id: "cyberpunk", label: "Cyberpunk", colors: ["#efe600", "#130018", "#00f0ff"] },
  { id: "valentine", label: "Valentine", colors: ["#ffe5ec", "#ffc2d1", "#ff477e"] },
  { id: "luxury", label: "Luxury", colors: ["#12131a", "#090a0f", "#c5a880"] },
  { id: "aqua", label: "Aqua", colors: ["#e0f2fe", "#bae6fd", "#0284c7"] },
  { id: "pastel", label: "Pastel", colors: ["#fcf6f5", "#faeceb", "#e5989b"] },
  { id: "coffee", label: "Coffee", colors: ["#efebe9", "#d7ccc8", "#6d4c41"] },
  { id: "nord", label: "Nord", colors: ["#2e3440", "#3b4252", "#88c0d0"] },
  { id: "bumblebee", label: "Bumblebee", colors: ["#ffeb3b", "#212121", "#ffd600"] },
  { id: "cupcake", label: "Cupcake", colors: ["#faf7f5", "#efeae6", "#65c3c8"] },
  { id: "dim", label: "Dim", colors: ["#15202b", "#192734", "#1da1f2"] }
]

function SettingsPage() {
  const { 
    theme, setTheme, 
    accentColor, setAccentColor,
    chatWallpaper, setChatWallpaper,
    fontSize, setFontSize,
    enterToSend, setEnterToSend,
    readReceipts, setReadReceipts,
    playSounds, setPlaySounds,
    presetTheme, setPresetTheme
  } = useContext(ThemeContext)
  
  const { currentUser, logout, deleteAccount, updateReminderSettings, updateUserImage } = useAuth()
  const { isInstallable, isInstalled, install } = useInstall()
  const navigate = useNavigate()
  const location = useLocation()
  
  const [activeTab, setActiveTab] = useState(() => {
    const initialParams = new URLSearchParams(window.location.search)
    const initialTab = initialParams.get("tab")
    if (initialTab) return initialTab
    if (typeof window !== "undefined" && window.innerWidth >= 768) {
      return "account"
    }
    return null
  })
  
  // Forms & account action states
  const [password, setPassword] = useState("")
  const [deleteError, setDeleteError] = useState("")
  const [isDeleting, setIsDeleting] = useState(false)

  // Push notifications state variables
  const [permission, setPermission] = useState(() => typeof Notification !== 'undefined' ? Notification.permission : 'default')
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [pushLoading, setPushLoading] = useState(false)
  const [pushError, setPushError] = useState("")
  const [pushSuccess, setPushSuccess] = useState("")

  // Daily reminder states
  const [reminderEnabled, setReminderEnabled] = useState(() => currentUser?.reminderTime !== null)
  const [reminderTime, setReminderTime] = useState(() => currentUser?.reminderTime || '20:00')
  const [reminderLoading, setReminderLoading] = useState(false)
  const [reminderSuccess, setReminderSuccess] = useState("")
  const [reminderError, setReminderError] = useState("")

  // Avatar upload states
  const [avatarFile, setAvatarFile] = useState(null)
  const [avatarPreview, setAvatarPreview] = useState(currentUser?.image || "")
  const [avatarLoading, setAvatarLoading] = useState(false)
  const [avatarError, setAvatarError] = useState("")
  const [avatarSuccess, setAvatarSuccess] = useState("")

  useEffect(() => {
    if (currentUser?.image) {
      setAvatarPreview(currentUser.image)
    }
  }, [currentUser?.image])

  // Synchronize activeTab with URL search params
  useEffect(() => {
    const queryParams = new URLSearchParams(location.search)
    const tabParam = queryParams.get("tab")
    
    if (tabParam) {
      setActiveTab(tabParam)
    } else {
      if (window.innerWidth >= 768) {
        setActiveTab("account")
      } else {
        setActiveTab(null)
      }
    }
  }, [location.search])

  // Fetch Push subscription state on mount
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



  // Save daily reminders
  async function handleSaveReminder(e) {
    e.preventDefault()
    setReminderError("")
    setReminderSuccess("")
    setReminderLoading(true)

    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
      const targetTime = reminderEnabled ? reminderTime : null
      await updateReminderSettings(targetTime, tz)
      setReminderSuccess("Daily reminders saved!")
    } catch (err) {
      setReminderError(err.message || 'Failed to update reminder.')
    } finally {
      setReminderLoading(false)
    }
  }

  // Handle Notifications Setup
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
          setPushSuccess("Unsubscribed from notifications.")
        } else {
          await subscribeUserToPush()
          setIsSubscribed(true)
          setPushSuccess("Subscribed to notifications!")
        }
      } else {
        throw new Error('Permission denied.')
      }
    } catch (err) {
      setPushError(err.message || 'An error occurred.')
    } finally {
      setPushLoading(false)
    }
  }

  async function handleSendTestPush() {
    setPushError("")
    setPushSuccess("")
    setPushLoading(true)
    try {
      const result = await triggerTestPush()
      setPushSuccess(result.message || "Test notification sent!")
    } catch (err) {
      setPushError(err.message || 'Failed to trigger test push.')
    } finally {
      setPushLoading(false)
    }
  }

  function handleAvatarChange(e) {
    const file = e.target.files[0]
    if (!file) return

    if (!file.type.startsWith("image/")) {
      setAvatarError("Please select a valid image file.")
      return
    }

    if (file.size > 2 * 1024 * 1024) {
      setAvatarError("File size exceeds 2MB limit.")
      return
    }

    setAvatarFile(file)
    setAvatarError("")
    setAvatarSuccess("")

    // Generate local preview URL
    const reader = new FileReader()
    reader.onloadend = () => {
      setAvatarPreview(reader.result)
    }
    reader.readAsDataURL(file)
  }

  async function handleAvatarUpload(e) {
    if (e) e.preventDefault()
    if (!avatarFile) return

    setAvatarLoading(true)
    setAvatarError("")
    setAvatarSuccess("")

    const formData = new FormData()
    formData.append("avatar", avatarFile)

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/user/avatar`, {
        method: "POST",
        body: formData,
        credentials: "include",
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Failed to upload avatar.")
      }

      // Update state
      updateUserImage(data.image)
      setAvatarFile(null)
      setAvatarSuccess("Profile picture updated successfully!")
    } catch (err) {
      setAvatarError(err.message || "An error occurred during upload.")
    } finally {
      setAvatarLoading(false)
    }
  }

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

  const handleLogoutClick = () => {
    if (confirm("Are you sure you want to log out?")) {
      logout()
      navigate("/auth")
    }
  }

  // Font size display label
  const fontSizeLabel = fontSize === "small" ? "Small" : fontSize === "large" ? "Large" : "Medium"

  const handleTabClick = (tabName) => {
    navigate(`/settings?tab=${tabName}`)
  }

  const handleBackToMenu = () => {
    navigate("/settings")
  }

  return (
    <div className="h-full w-full bg-bg-app overflow-hidden font-sans select-none flex flex-col md:flex-row">
      
      {/* ── 1. SETTINGS CATEGORIES SIDEBAR ── */}
      <aside className={`w-full md:w-[220px] flex-shrink-0 border-r border-border-app flex flex-col justify-between py-5 bg-bg-sidebar select-none ${
        activeTab ? 'hidden md:flex' : 'flex'
      }`}>
        <div className="flex flex-col gap-0.5 px-3">

          <button
            onClick={() => handleTabClick("account")}
            className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-semibold transition-all cursor-pointer relative ${
              activeTab === "account"
                ? "bg-accent/8 dark:bg-accent/12 text-accent sidebar-item-active"
                : "text-text-body opacity-80 hover:text-text-title hover:bg-bg-app"
            }`}
          >
            <LockIcon className="w-5 h-5 flex-shrink-0" />
            <span>Account</span>
          </button>

          <button
            onClick={() => handleTabClick("notifications")}
            className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-semibold transition-all cursor-pointer relative ${
              activeTab === "notifications"
                ? "bg-accent/8 dark:bg-accent/12 text-accent sidebar-item-active"
                : "text-text-body opacity-80 hover:text-text-title hover:bg-bg-app"
            }`}
          >
            <BellIcon className="w-5 h-5 flex-shrink-0" />
            <span>Notifications</span>
          </button>

          <button
            onClick={() => handleTabClick("appearance")}
            className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-semibold transition-all cursor-pointer relative ${
              activeTab === "appearance"
                ? "bg-accent/8 dark:bg-accent/12 text-accent sidebar-item-active"
                : "text-text-body opacity-80 hover:text-text-title hover:bg-bg-app"
            }`}
          >
            <PaintIcon className="w-5 h-5 flex-shrink-0" />
            <span>Appearance</span>
          </button>
        </div>

        <div className="px-3">
          <button
            onClick={handleLogoutClick}
            className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-semibold text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all cursor-pointer"
          >
            <LogoutIcon className="w-5 h-5 text-red-500 flex-shrink-0" />
            <span>Log out</span>
          </button>
        </div>
      </aside>

      {/* ── 2. SETTINGS CONTENT PANEL ── */}
      <main className={`flex-1 overflow-y-auto p-6 md:p-8 bg-bg-app select-text ${
        activeTab ? 'flex flex-col' : 'hidden md:flex'
      }`}>
        <div className="max-w-xl mx-auto w-full space-y-8">
          {activeTab && (
            <button
              onClick={handleBackToMenu}
              className="md:hidden flex items-center gap-1.5 text-xs font-bold text-gray-400 hover:text-text-title cursor-pointer mb-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
              </svg>
              <span>Back to Settings</span>
            </button>
          )}



          {/* ── 2B. APPEARANCE SETTINGS (Theme/Accent/Wallpaper/Font) ── */}
          {activeTab === "appearance" && (
            <div className="space-y-8 animate-slide-in">
              
              {/* Theme Mode Selector Section */}
              <div className="space-y-4">
                <h3 className="text-xs font-extrabold text-text-body opacity-60 uppercase tracking-widest text-left select-none">Theme Mode</h3>
                <div className="grid grid-cols-3 gap-3">
                  
                  {/* Light theme card */}
                  <button
                    onClick={() => setTheme("light")}
                    className={`p-5 bg-bg-card border-2 rounded-3xl flex flex-col items-center gap-2.5 cursor-pointer transition-all relative ${
                      theme === "light" 
                        ? "border-accent ring-2 ring-accent/20" 
                        : "border-border-app hover:border-gray-300 dark:hover:border-gray-700"
                    }`}
                  >
                    <svg className={`w-7.5 h-7.5 ${theme === "light" ? "text-accent" : "text-gray-400"}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m0 13.5V21m9.75-9h-2.25M4.5 12H2.25m16.909-6.909-1.591 1.59M5.59 18.41l1.59-1.59m11.228 0 1.59 1.59m-11.228-11.23-1.59-1.59M12 7.5a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9Z" />
                    </svg>
                    <span className={`text-xs font-extrabold ${theme === "light" ? "text-text-title" : "text-text-body opacity-70"}`}>Light</span>
                    {theme === "light" && (
                      <span className="absolute top-2 right-2 w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center">
                        <CheckmarkIcon className="w-3 h-3" />
                      </span>
                    )}
                  </button>

                  {/* Dark theme card */}
                  <button
                    onClick={() => setTheme("dark")}
                    className={`p-5 bg-bg-card border-2 rounded-3xl flex flex-col items-center gap-2.5 cursor-pointer transition-all relative ${
                      theme === "dark" 
                        ? "border-accent ring-2 ring-accent/20" 
                        : "border-border-app hover:border-gray-300 dark:hover:border-gray-700"
                    }`}
                  >
                    <svg className={`w-7.5 h-7.5 ${theme === "dark" ? "text-accent" : "text-gray-400"}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z" />
                    </svg>
                    <span className={`text-xs font-extrabold ${theme === "dark" ? "text-text-title" : "text-text-body opacity-70"}`}>Dark</span>
                    {theme === "dark" && (
                      <span className="absolute top-2 right-2 w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center">
                        <CheckmarkIcon className="w-3 h-3" />
                      </span>
                    )}
                  </button>

                  {/* System theme card */}
                  <button
                    onClick={() => setTheme("system")}
                    className={`p-5 bg-bg-card border-2 rounded-3xl flex flex-col items-center gap-2.5 cursor-pointer transition-all relative ${
                      theme === "system" 
                        ? "border-accent ring-2 ring-accent/20" 
                        : "border-border-app hover:border-gray-300 dark:hover:border-gray-700"
                    }`}
                  >
                    <svg className={`w-7.5 h-7.5 ${theme === "system" ? "text-accent" : "text-gray-400"}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 0 1-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0 1 15 18.257V17.25m6-12V15a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 15V5.25M21 5.25A2.25 2.25 0 0 0 18.75 3H5.25A2.25 2.25 0 0 0 3 5.25m18 0V12a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 12V5.25" />
                    </svg>
                    <span className={`text-xs font-extrabold ${theme === "system" ? "text-text-title" : "text-text-body opacity-70"}`}>System</span>
                    {theme === "system" && (
                      <span className="absolute top-2 right-2 w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center">
                        <CheckmarkIcon className="w-3 h-3" />
                      </span>
                    )}
                  </button>
                </div>
              </div>

              {/* Theme Presets Section */}
              <div className="space-y-4">
                <h3 className="text-xs font-extrabold text-text-body opacity-60 uppercase tracking-widest text-left select-none">Theme Presets</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {PRESET_THEMES.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setPresetTheme(t.id)}
                      className={`group flex flex-col items-center gap-2 p-3 rounded-3xl border-2 transition-all cursor-pointer ${
                        presetTheme === t.id
                          ? "border-accent ring-2 ring-accent/20 bg-accent/5"
                          : "border-border-app hover:border-gray-300 dark:hover:border-gray-700 bg-bg-card"
                      }`}
                    >
                      <div className="relative h-10 w-full rounded-2xl overflow-hidden shadow-xs flex border border-border-app/40" style={{ backgroundColor: t.colors[0] }}>
                        <div className="w-1/2 h-full flex flex-col p-1 gap-1">
                          <div className="h-full rounded-lg" style={{ backgroundColor: t.colors[1] }}></div>
                        </div>
                        <div className="w-1/2 h-full flex flex-col p-1 gap-1 justify-between items-end">
                          <div className="w-3.5 h-3.5 rounded-full flex-shrink-0" style={{ backgroundColor: t.colors[2] }}></div>
                          <div className="w-full h-1.5 rounded-sm" style={{ backgroundColor: t.colors[1] }}></div>
                        </div>
                      </div>
                      <span className="text-[11px] font-bold truncate w-full text-center text-text-title select-none">
                        {t.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Accent Color Section */}
              <div className="space-y-3">
                <h3 className="text-sm font-extrabold text-text-body opacity-60 uppercase tracking-widest text-left select-none">Accent Color</h3>
                <div className="bg-bg-card border border-border-app rounded-3xl p-4.5 flex items-center gap-4.5 justify-center">
                  {ACCENT_OPTIONS.map((opt) => {
                    const isSelected = accentColor === opt.key
                    return (
                      <button
                        key={opt.key}
                        onClick={() => setAccentColor(opt.key)}
                        style={{ backgroundColor: opt.hex }}
                        className="w-8.5 h-8.5 rounded-full flex items-center justify-center text-white transition-transform active:scale-90 hover:scale-105 shadow-sm relative cursor-pointer"
                        title={opt.label}
                      >
                        {isSelected && <CheckmarkIcon className="w-4 h-4 text-white font-bold" />}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Chat Wallpapers Section */}
              <div className="space-y-4">
                <h3 className="text-xs font-extrabold text-gray-400 dark:text-gray-500 uppercase tracking-widest text-left select-none">Chat Wallpaper</h3>
                <div className="grid grid-cols-5 gap-4">
                  
                  {/* No wallpaper card */}
                  <button
                    onClick={() => setChatWallpaper("none")}
                    className={`aspect-[3/4] rounded-3xl border flex flex-col items-center justify-center bg-bg-card cursor-pointer transition-all relative overflow-hidden ${
                      chatWallpaper === "none" ? "border-accent ring-2 ring-accent/20" : "border-border-app hover:border-gray-300 dark:hover:border-gray-700"
                    }`}
                  >
                    <svg className="w-6 h-6 text-gray-350 dark:text-gray-550" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 0 0 5.636 5.636m12.728 12.728A9 9 0 0 1 5.636 5.636m12.728 12.728L5.636 5.636" />
                    </svg>
                    <span className="text-[10px] font-bold text-gray-400 mt-2">None</span>
                  </button>

                  {/* Sunset gradient card */}
                  <button
                    onClick={() => setChatWallpaper("sunset")}
                    className={`aspect-[3/4] rounded-3xl border cursor-pointer transition-all relative overflow-hidden bg-gradient-to-tr from-orange-100 to-rose-100 dark:from-orange-950/20 dark:to-rose-950/20 ${
                      chatWallpaper === "sunset" ? "border-accent ring-2 ring-accent/20" : "border-border-app hover:border-gray-300 dark:hover:border-gray-700"
                    }`}
                  >
                    <div className="absolute bottom-2 right-2.5 text-[9px] text-orange-550 dark:text-orange-400 font-extrabold select-none">Sunset</div>
                  </button>

                  {/* Ocean gradient card */}
                  <button
                    onClick={() => setChatWallpaper("ocean")}
                    className={`aspect-[3/4] rounded-3xl border cursor-pointer transition-all relative overflow-hidden bg-gradient-to-tr from-sky-100 to-indigo-100 dark:from-sky-950/20 dark:to-indigo-950/20 ${
                      chatWallpaper === "ocean" ? "border-accent ring-2 ring-accent/20" : "border-border-app hover:border-gray-300 dark:hover:border-gray-700"
                    }`}
                  >
                    <div className="absolute bottom-2 right-2.5 text-[9px] text-blue-550 dark:text-blue-400 font-extrabold select-none">Ocean</div>
                  </button>

                  {/* Forest gradient card */}
                  <button
                    onClick={() => setChatWallpaper("forest")}
                    className={`aspect-[3/4] rounded-3xl border cursor-pointer transition-all relative overflow-hidden bg-gradient-to-tr from-emerald-50 to-teal-50 dark:from-emerald-950/10 dark:to-teal-950/10 ${
                      chatWallpaper === "forest" ? "border-accent ring-2 ring-accent/20" : "border-border-app hover:border-gray-300 dark:hover:border-gray-700"
                    }`}
                  >
                    <div className="absolute bottom-2 right-2.5 text-[9px] text-emerald-600 dark:text-emerald-400 font-extrabold select-none">Forest</div>
                  </button>

                  {/* Mountain Premium Image Card */}
                  <button
                    onClick={() => setChatWallpaper("mountain")}
                    style={{ backgroundImage: "url('/mountain.png')" }}
                    className={`aspect-[3/4] rounded-3xl border cursor-pointer bg-cover bg-center transition-all relative overflow-hidden ${
                      chatWallpaper === "mountain" ? "border-accent ring-2 ring-accent/20" : "border-border-app hover:border-gray-300 dark:hover:border-gray-700"
                    }`}
                  >
                    <div className="absolute bottom-2 right-2.5 text-[9px] text-slate-100 font-extrabold drop-shadow select-none">Mountain</div>
                  </button>

                </div>
              </div>

               {/* Font Size Section */}
              <div className="space-y-3">
                <h3 className="text-sm font-extrabold text-text-body opacity-60 uppercase tracking-widest text-left select-none">Font Size</h3>
                
                <div className="bg-bg-card border border-border-app rounded-3xl p-6 space-y-4">
                  <div className="flex items-center justify-between text-text-body opacity-60 select-none">
                    <span className="text-xs font-medium">A</span>
                    <span className="text-xs font-bold text-accent">{fontSizeLabel}</span>
                    <span className="text-lg font-bold">A</span>
                  </div>
                  
                  {/* Custom Font Slider */}
                  <input
                    type="range"
                    min="1"
                    max="3"
                    step="1"
                    value={fontSize === "small" ? "1" : fontSize === "large" ? "3" : "2"}
                    onChange={(e) => {
                      const val = e.target.value
                      setFontSize(val === "1" ? "small" : val === "3" ? "large" : "medium")
                    }}
                    className="w-full h-1 bg-bg-app rounded-lg appearance-none cursor-pointer accent-accent"
                  />
                </div>
              </div>

            </div>
          )}

          {/* ── 2C. NOTIFICATIONS TAB ── */}
          {activeTab === "notifications" && (
            <div className="space-y-6 animate-slide-in">
              <h2 className="text-xs font-extrabold text-text-body opacity-60 uppercase tracking-widest text-left select-none">Push Notifications</h2>
              
              <div className="bg-bg-card border border-border-app rounded-3xl p-6 text-left space-y-4 shadow-sm">
                <div className="space-y-1">
                  <p className="text-sm font-bold text-text-title">Push permission settings</p>
                  <p className="text-xs text-text-body opacity-60">Receive desktop alert notifications when messages arrive.</p>
                </div>

                {permission === 'denied' ? (
                  <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-905 text-xs text-red-600 leading-relaxed font-semibold">
                    Notifications are blocked by your browser settings. To enable them, please reset permissions in your browser's site settings.
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleToggleNotifications}
                      disabled={pushLoading}
                      className="bg-accent hover:bg-accent/90 text-white font-extrabold px-6 py-3 rounded-full text-xs tracking-wide transition-all shadow-lg shadow-accent/20 hover:shadow-accent/30 disabled:opacity-50 cursor-pointer"
                    >
                      {pushLoading ? "Processing..." : isSubscribed ? "Disable Push Alerts" : "Enable Push Alerts"}
                    </button>

                    {isSubscribed && permission === 'granted' && (
                      <button
                        onClick={handleSendTestPush}
                        disabled={pushLoading}
                        className="bg-gray-100 hover:bg-gray-250 dark:bg-gray-800 dark:hover:bg-gray-750 text-gray-700 dark:text-gray-300 font-extrabold px-6 py-3 rounded-full text-xs tracking-wide transition-colors cursor-pointer"
                      >
                        Send Test Push
                      </button>
                    )}
                  </div>
                )}

                {pushError && <p className="text-red-500 text-xs font-semibold">{pushError}</p>}
                {pushSuccess && <p className="text-green-500 text-xs font-semibold">{pushSuccess}</p>}
              </div>

              {(isInstallable || isInstalled) && (
                <h2 className="text-xs font-extrabold text-text-body opacity-60 uppercase tracking-widest text-left select-none mt-8">App Installation</h2>
              )}

              {isInstallable && (
                <div className="bg-bg-card border border-border-app rounded-3xl p-6 text-left space-y-4 shadow-sm">
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-text-title">Install ChatApp</p>
                    <p className="text-xs text-text-body opacity-60">Install ChatApp on your device for quick access and offline usability.</p>
                  </div>
                  <button
                    onClick={install}
                    className="bg-accent hover:bg-accent/90 text-white font-extrabold px-6 py-3 rounded-full text-xs tracking-wide transition-all shadow-lg shadow-accent/20 hover:shadow-accent/30 cursor-pointer"
                  >
                    Install App
                  </button>
                </div>
              )}

              {isInstalled && (
                <div className="bg-bg-card border border-border-app rounded-3xl p-6 text-left space-y-4 shadow-sm">
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-text-title">ChatApp is Installed</p>
                    <p className="text-xs text-text-body opacity-60 font-semibold text-emerald-500">You are using the official standalone version of ChatApp.</p>
                  </div>
                </div>
              )}

              {/* Reminders section inside notifications */}
              <h2 className="text-xs font-extrabold text-text-body opacity-60 uppercase tracking-widest text-left select-none mt-8">Daily Reminders</h2>
              
              <form onSubmit={handleSaveReminder} className="bg-bg-card border border-border-app rounded-3xl p-6 text-left space-y-4 shadow-sm">
                
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-text-title">Enable Reminders</p>
                    <p className="text-xs text-text-body opacity-60">Receive a daily scheduled push alert.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setReminderEnabled(!reminderEnabled)}
                    className={`toggle-track ${reminderEnabled ? 'on' : 'off'}`}
                    aria-label="Toggle reminder"
                  >
                    <span className="toggle-thumb" />
                  </button>
                </div>

                {reminderEnabled && (
                  <div className="flex items-center gap-3.5">
                    <input
                      type="time"
                      value={reminderTime}
                      onChange={(e) => setReminderTime(e.target.value)}
                      className="px-4.5 py-2.5 bg-bg-app border border-border-app text-text-title rounded-full text-xs font-medium focus:outline-none focus:ring-2 focus:ring-accent/20"
                    />
                    <span className="text-[10px] text-text-body opacity-60 font-bold uppercase tracking-wider">
                      Detected Timezone: {Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'}
                    </span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={reminderLoading}
                  className="bg-accent hover:bg-accent/90 text-white font-extrabold px-6 py-3 rounded-full text-xs tracking-wide transition-all shadow-lg shadow-accent/20 hover:shadow-accent/30 cursor-pointer"
                >
                  {reminderLoading ? "Saving..." : "Save Reminder"}
                </button>

                {reminderError && <p className="text-red-500 text-xs font-semibold">{reminderError}</p>}
                {reminderSuccess && <p className="text-green-500 text-xs font-semibold">{reminderSuccess}</p>}
              </form>
            </div>
          )}

          {/* ── 2D. ACCOUNT SECURITY TAB ── */}
          {activeTab === "account" && (
            <div className="space-y-6 animate-slide-in text-left">
              
              {/* Profile Card Section */}
              <div>
                <h2 className="text-xs font-extrabold text-text-body opacity-60 uppercase tracking-widest mb-1 select-none">Profile Settings</h2>
                <p className="text-[11px] text-text-body opacity-50">Manage your profile picture and account information.</p>
              </div>

              <div className="bg-bg-card border border-border-app rounded-3xl p-6 space-y-6 shadow-sm">
                <div className="flex flex-col sm:flex-row items-center gap-6">
                  
                  {/* Avatar Upload Preview Container */}
                  <div className="relative group flex-shrink-0">
                    {avatarPreview ? (
                      <img 
                        src={avatarPreview} 
                        alt="Profile Preview" 
                        className="w-24 h-24 rounded-full object-cover border-4 border-bg-card shadow-md group-hover:opacity-90 transition-opacity" 
                      />
                    ) : (
                      <div className="w-24 h-24 rounded-full bg-gradient-to-br from-accent to-indigo-600 text-white flex items-center justify-center font-bold text-3xl border-4 border-bg-card shadow-md select-none">
                        {currentUser?.username ? currentUser.username.charAt(0).toUpperCase() : '?'}
                      </div>
                    )}
                    
                    {/* Hover Camera Icon overlay */}
                    <label 
                      htmlFor="avatar-input"
                      className="absolute inset-0 bg-black/40 hover:bg-black/50 text-white rounded-full flex flex-col items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity z-10"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" />
                      </svg>
                      <span className="text-[10px] font-bold mt-1 uppercase tracking-wider">Change</span>
                    </label>
                  </div>

                  {/* Right: Info & File Selector Info */}
                  <div className="flex-1 text-center sm:text-left space-y-2">
                    <p className="text-base font-bold text-text-title">{currentUser?.username}</p>
                    <p className="text-xs text-text-body opacity-60">{currentUser?.email}</p>
                    
                    <div className="pt-1.5 flex flex-wrap gap-2 justify-center sm:justify-start">
                      <input 
                        type="file" 
                        id="avatar-input" 
                        accept="image/*" 
                        onChange={handleAvatarChange}
                        className="hidden" 
                      />
                      <label 
                        htmlFor="avatar-input"
                        className="inline-flex items-center justify-center bg-gray-100 hover:bg-gray-205 dark:bg-gray-800 dark:hover:bg-gray-750 text-text-title font-extrabold px-4.5 py-2.5 rounded-full text-[11px] tracking-wider transition-colors cursor-pointer select-none border border-border-app"
                      >
                        Choose Photo
                      </label>

                      {avatarFile && (
                        <button
                          onClick={handleAvatarUpload}
                          disabled={avatarLoading}
                          className="bg-accent hover:bg-accent/90 text-white font-extrabold px-5 py-2.5 rounded-full text-[11px] tracking-wider transition-all shadow-md shadow-accent/20 hover:shadow-accent/30 cursor-pointer disabled:opacity-50"
                        >
                          {avatarLoading ? "Uploading..." : "Save Image"}
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Upload Status Alerts */}
                {avatarError && (
                  <p className="text-red-500 text-xs font-semibold bg-red-50 dark:bg-red-950/20 p-2.5 rounded-xl border border-red-105 dark:border-red-950/40">
                    {avatarError}
                  </p>
                )}
                {avatarSuccess && (
                  <p className="text-green-500 text-xs font-semibold bg-green-50/50 dark:bg-emerald-950/10 p-2.5 rounded-xl border border-green-100/55 dark:border-emerald-950/30">
                    {avatarSuccess}
                  </p>
                )}
              </div>

              {/* Separator Line */}
              <hr className="border-border-app" />

              <div>
                <h2 className="text-xs font-extrabold text-red-500 uppercase tracking-widest mb-1">Danger Zone</h2>
                <p className="text-[11px] text-gray-400">These actions are permanent and cannot be undone.</p>
              </div>
              
              <form onSubmit={handleDeleteAccount} className="bg-bg-card border border-red-100/80 dark:border-red-950/50 rounded-3xl p-6 text-left space-y-4 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-2xl bg-red-50 dark:bg-red-950/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                    </svg>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-red-600 dark:text-red-400">Delete Account</p>
                    <p className="text-xs text-text-body opacity-60 leading-relaxed">This will permanently delete your account, credentials, and message history.</p>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-bold text-text-body opacity-60 uppercase tracking-wider">Confirm Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password to confirm"
                    className="w-full max-w-sm px-5 py-3 bg-bg-app border border-border-app text-text-title rounded-full text-xs focus:outline-none focus:ring-2 focus:ring-red-450/20 focus:border-red-450/40 transition-all"
                  />
                </div>

                {deleteError && <p className="text-red-500 text-xs font-semibold bg-red-50 dark:bg-red-950/20 p-2.5 rounded-xl border border-red-100 dark:border-red-950/40">{deleteError}</p>}

                <button
                  type="submit"
                  disabled={isDeleting || !password}
                  className="bg-red-600 hover:bg-red-700 text-white font-bold px-6 py-3 rounded-full text-xs transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-red-500/20"
                >
                  {isDeleting ? "Deleting..." : "Permanently Delete Account"}
                </button>
              </form>
            </div>
          )}


        </div>
      </main>

    </div>
  )
}

export default SettingsPage
