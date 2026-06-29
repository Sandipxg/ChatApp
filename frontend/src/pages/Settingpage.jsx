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

function SettingsPage() {
  const { 
    theme, setTheme, 
    accentColor, setAccentColor,
    chatWallpaper, setChatWallpaper,
    fontSize, setFontSize,
    enterToSend, setEnterToSend,
    readReceipts, setReadReceipts,
    playSounds, setPlaySounds
  } = useContext(ThemeContext)
  
  const { currentUser, logout, deleteAccount, updateReminderSettings } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  
  const [activeTab, setActiveTab] = useState("account")
  
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

  // Synchronize internal activeTab with parent layout router state clicks
  useEffect(() => {
    if (location.state?.activeTab) {
      setActiveTab(location.state.activeTab)
    }
  }, [location.state?.activeTab])

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

  return (
    <div className="h-full w-full bg-white dark:bg-gray-950 overflow-hidden font-sans select-none flex">
      
      {/* ── 1. SETTINGS CATEGORIES SIDEBAR ── */}
      <aside className="w-full md:w-[240px] flex-shrink-0 border-r border-gray-150 dark:border-gray-800 flex flex-col justify-between py-4 bg-white dark:bg-gray-900 select-none">
        <div className="flex flex-col gap-1 px-2.5">


          <button
            onClick={() => setActiveTab("account")}
            className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-extrabold transition-all cursor-pointer ${
              activeTab === "account"
                ? "bg-indigo-50/70 text-accent dark:bg-gray-800"
                : "text-gray-400 hover:text-gray-600 dark:hover:text-white"
            }`}
          >
            <LockIcon className="w-4.5 h-4.5" />
            <span>Account</span>
          </button>

          <button
            onClick={() => setActiveTab("notifications")}
            className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-extrabold transition-all cursor-pointer ${
              activeTab === "notifications"
                ? "bg-indigo-50/70 text-accent dark:bg-gray-800"
                : "text-gray-400 hover:text-gray-600 dark:hover:text-white"
            }`}
          >
            <BellIcon className="w-4.5 h-4.5" />
            <span>Notifications</span>
          </button>

          <button
            onClick={() => setActiveTab("appearance")}
            className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-extrabold transition-all cursor-pointer ${
              activeTab === "appearance"
                ? "bg-indigo-50/70 text-accent dark:bg-gray-800"
                : "text-gray-400 hover:text-gray-600 dark:hover:text-white"
            }`}
          >
            <PaintIcon className="w-4.5 h-4.5" />
            <span>Appearance</span>
          </button>
        </div>

        <div className="px-4">
          <button
            onClick={handleLogoutClick}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all cursor-pointer"
          >
            <LogoutIcon className="w-4.5 h-4.5 text-red-500" />
            <span>Log out</span>
          </button>
        </div>
      </aside>

      {/* ── 2. SETTINGS CONTENT PANEL ── */}
      <main className="flex-1 overflow-y-auto p-6 md:p-8 bg-gray-50 dark:bg-[#0b0f17] select-text">
        <div className="max-w-2xl mx-auto space-y-6">



          {/* ── 2B. APPEARANCE SETTINGS (Theme/Accent/Wallpaper/Font) ── */}
          {activeTab === "appearance" && (
            <div className="space-y-6 animate-slide-in">
              
              {/* Theme Selector Section */}
              <div className="space-y-3">
                <h3 className="text-sm font-extrabold text-gray-400 dark:text-gray-500 uppercase tracking-widest text-left select-none">Theme</h3>
                <div className="grid grid-cols-3 gap-3">
                  
                  {/* Light theme card */}
                  <button
                    onClick={() => setTheme("light")}
                    className={`p-4 bg-white dark:bg-gray-900 border rounded-2xl flex flex-col items-center gap-2 cursor-pointer transition-all relative ${
                      theme === "light" 
                        ? "border-accent ring-1 ring-accent" 
                        : "border-gray-150 dark:border-gray-800 hover:border-gray-300"
                    }`}
                  >
                    <svg className={`w-6 h-6 ${theme === "light" ? "text-accent" : "text-gray-400"}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m0 13.5V21m9.75-9h-2.25M4.5 12H2.25m16.909-6.909-1.591 1.59M5.59 18.41l1.59-1.59m11.228 0 1.59 1.59m-11.228-11.23-1.59-1.59M12 7.5a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9Z" />
                    </svg>
                    <span className={`text-[11px] font-bold ${theme === "light" ? "text-gray-900 dark:text-white" : "text-gray-400"}`}>Light</span>
                    {theme === "light" && (
                      <span className="absolute top-1.5 right-1.5 w-3.5 h-3.5 rounded-full bg-emerald-500 text-white flex items-center justify-center">
                        <CheckmarkIcon className="w-2.5 h-2.5" />
                      </span>
                    )}
                  </button>

                  {/* Dark theme card */}
                  <button
                    onClick={() => setTheme("dark")}
                    className={`p-4 bg-white dark:bg-gray-900 border rounded-2xl flex flex-col items-center gap-2 cursor-pointer transition-all relative ${
                      theme === "dark" 
                        ? "border-accent ring-1 ring-accent" 
                        : "border-gray-150 dark:border-gray-800 hover:border-gray-300"
                    }`}
                  >
                    <svg className={`w-6 h-6 ${theme === "dark" ? "text-accent" : "text-gray-400"}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z" />
                    </svg>
                    <span className={`text-[11px] font-bold ${theme === "dark" ? "text-gray-900 dark:text-white" : "text-gray-400"}`}>Dark</span>
                    {theme === "dark" && (
                      <span className="absolute top-1.5 right-1.5 w-3.5 h-3.5 rounded-full bg-emerald-500 text-white flex items-center justify-center">
                        <CheckmarkIcon className="w-2.5 h-2.5" />
                      </span>
                    )}
                  </button>

                  {/* System theme card */}
                  <button
                    onClick={() => setTheme("system")}
                    className={`p-4 bg-white dark:bg-gray-900 border rounded-2xl flex flex-col items-center gap-2 cursor-pointer transition-all relative ${
                      theme === "system" 
                        ? "border-accent ring-1 ring-accent" 
                        : "border-gray-150 dark:border-gray-800 hover:border-gray-300"
                    }`}
                  >
                    <svg className={`w-6 h-6 ${theme === "system" ? "text-accent" : "text-gray-400"}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 0 1-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0 1 15 18.257V17.25m6-12V15a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 15V5.25M21 5.25A2.25 2.25 0 0 0 18.75 3H5.25A2.25 2.25 0 0 0 3 5.25m18 0V12a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 12V5.25" />
                    </svg>
                    <span className={`text-[11px] font-bold ${theme === "system" ? "text-gray-900 dark:text-white" : "text-gray-400"}`}>System</span>
                    {theme === "system" && (
                      <span className="absolute top-1.5 right-1.5 w-3.5 h-3.5 rounded-full bg-emerald-500 text-white flex items-center justify-center">
                        <CheckmarkIcon className="w-2.5 h-2.5" />
                      </span>
                    )}
                  </button>
                </div>
              </div>

              {/* Accent Color Section */}
              <div className="space-y-3">
                <h3 className="text-sm font-extrabold text-gray-400 dark:text-gray-500 uppercase tracking-widest text-left select-none">Accent Color</h3>
                <div className="bg-white dark:bg-gray-900 border border-gray-150 dark:border-gray-800 rounded-3xl p-4.5 flex items-center gap-4.5 justify-center">
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
              <div className="space-y-3">
                <h3 className="text-sm font-extrabold text-gray-400 dark:text-gray-500 uppercase tracking-widest text-left select-none">Chat Wallpaper</h3>
                <div className="grid grid-cols-5 gap-3.5">
                  
                  {/* No wallpaper card */}
                  <button
                    onClick={() => setChatWallpaper("none")}
                    className={`aspect-[3/4] rounded-2xl border flex flex-col items-center justify-center bg-white dark:bg-gray-800 cursor-pointer transition-all relative overflow-hidden ${
                      chatWallpaper === "none" ? "border-accent ring-1 ring-accent" : "border-gray-150 dark:border-gray-800 hover:border-gray-300"
                    }`}
                  >
                    <svg className="w-6 h-6 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 0 0 5.636 5.636m12.728 12.728A9 9 0 0 1 5.636 5.636m12.728 12.728L5.636 5.636" />
                    </svg>
                    <span className="text-[9px] font-bold text-gray-400 mt-2">No Wallpaper</span>
                  </button>

                  {/* Sunset gradient card */}
                  <button
                    onClick={() => setChatWallpaper("sunset")}
                    className={`aspect-[3/4] rounded-2xl border cursor-pointer transition-all relative overflow-hidden bg-gradient-to-tr from-orange-100 to-rose-100 dark:from-orange-950/20 dark:to-rose-950/20 ${
                      chatWallpaper === "sunset" ? "border-accent ring-1 ring-accent" : "border-gray-150 dark:border-gray-800 hover:border-gray-300"
                    }`}
                  >
                    <div className="absolute bottom-1 right-2 text-[8px] text-orange-400 font-bold select-none">Sunset</div>
                  </button>

                  {/* Ocean gradient card */}
                  <button
                    onClick={() => setChatWallpaper("ocean")}
                    className={`aspect-[3/4] rounded-2xl border cursor-pointer transition-all relative overflow-hidden bg-gradient-to-tr from-sky-100 to-indigo-100 dark:from-sky-950/20 dark:to-indigo-950/20 ${
                      chatWallpaper === "ocean" ? "border-accent ring-1 ring-accent" : "border-gray-150 dark:border-gray-800 hover:border-gray-300"
                    }`}
                  >
                    <div className="absolute bottom-1 right-2 text-[8px] text-blue-400 font-bold select-none">Ocean</div>
                  </button>

                  {/* Forest gradient card */}
                  <button
                    onClick={() => setChatWallpaper("forest")}
                    className={`aspect-[3/4] rounded-2xl border cursor-pointer transition-all relative overflow-hidden bg-gradient-to-tr from-emerald-50 to-teal-50 dark:from-emerald-950/10 dark:to-teal-950/10 ${
                      chatWallpaper === "forest" ? "border-accent ring-1 ring-accent" : "border-gray-150 dark:border-gray-800 hover:border-gray-300"
                    }`}
                  >
                    <div className="absolute bottom-1 right-2 text-[8px] text-emerald-400 font-bold select-none">Forest</div>
                  </button>

                  {/* Mountain Premium Image Card */}
                  <button
                    onClick={() => setChatWallpaper("mountain")}
                    style={{ backgroundImage: "url('/mountain.png')" }}
                    className={`aspect-[3/4] rounded-2xl border cursor-pointer bg-cover bg-center transition-all relative overflow-hidden ${
                      chatWallpaper === "mountain" ? "border-accent ring-1 ring-accent" : "border-gray-150 dark:border-gray-800 hover:border-gray-300"
                    }`}
                  >
                    <div className="absolute bottom-1 right-2 text-[8px] text-slate-100 font-extrabold drop-shadow select-none">Mountain</div>
                  </button>

                </div>
              </div>

              {/* Font Size Section */}
              <div className="space-y-3">
                <h3 className="text-sm font-extrabold text-gray-400 dark:text-gray-500 uppercase tracking-widest text-left select-none">Font Size</h3>
                
                <div className="bg-white dark:bg-gray-900 border border-gray-150 dark:border-gray-800 rounded-3xl p-6 space-y-4">
                  <div className="flex items-center justify-between text-gray-400 select-none">
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
                    className="w-full h-1 bg-gray-150 dark:bg-gray-800 rounded-lg appearance-none cursor-pointer accent-accent"
                  />
                </div>
              </div>

            </div>
          )}

          {/* ── 2C. NOTIFICATIONS TAB ── */}
          {activeTab === "notifications" && (
            <div className="space-y-5 animate-slide-in">
              <h2 className="text-sm font-extrabold text-gray-400 dark:text-gray-500 uppercase tracking-widest text-left select-none">Push Notifications</h2>
              
              <div className="bg-white dark:bg-gray-900 border border-gray-150 dark:border-gray-800 rounded-3xl p-5 text-left space-y-4">
                <div className="space-y-1">
                  <p className="text-xs font-bold text-gray-900 dark:text-white">Push permission settings</p>
                  <p className="text-[10px] text-gray-400">Receive desktop alert notifications when messages arrive.</p>
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
                      className="bg-accent hover:bg-accent/90 text-white font-extrabold px-4.5 py-2.5 rounded-xl text-xs transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      {pushLoading ? "Processing..." : isSubscribed ? "Disable Push Alerts" : "Enable Push Alerts"}
                    </button>

                    {isSubscribed && permission === 'granted' && (
                      <button
                        onClick={handleSendTestPush}
                        disabled={pushLoading}
                        className="bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-850 text-gray-700 dark:text-gray-300 font-extrabold px-4.5 py-2.5 rounded-xl text-xs transition-colors cursor-pointer"
                      >
                        Send Test Push
                      </button>
                    )}
                  </div>
                )}

                {pushError && <p className="text-red-500 text-xs font-semibold">{pushError}</p>}
                {pushSuccess && <p className="text-green-500 text-xs font-semibold">{pushSuccess}</p>}
              </div>

              {/* Reminders section inside notifications */}
              <h2 className="text-sm font-extrabold text-gray-400 dark:text-gray-500 uppercase tracking-widest text-left select-none mt-6">Daily Reminders</h2>
              
              <form onSubmit={handleSaveReminder} className="bg-white dark:bg-gray-900 border border-gray-150 dark:border-gray-800 rounded-3xl p-5 text-left space-y-4">
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-gray-900 dark:text-white">Enable Reminders</p>
                    <p className="text-[10px] text-gray-400">Receive a daily scheduled push alert.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={reminderEnabled}
                    onChange={(e) => setReminderEnabled(e.target.checked)}
                    className="w-4.5 h-4.5 text-accent border-gray-300 rounded focus:ring-accent"
                  />
                </div>

                {reminderEnabled && (
                  <div className="flex items-center gap-3">
                    <input
                      type="time"
                      value={reminderTime}
                      onChange={(e) => setReminderTime(e.target.value)}
                      className="px-3.5 py-2 border border-gray-150 dark:border-gray-800 dark:bg-gray-800 text-gray-950 dark:text-white rounded-xl text-xs focus:outline-none focus:ring-1.5 focus:ring-accent"
                    />
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                      Detected Timezone: {Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'}
                    </span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={reminderLoading}
                  className="bg-accent hover:bg-accent/90 text-white font-extrabold px-4.5 py-2.5 rounded-xl text-xs transition-colors cursor-pointer"
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
            <div className="space-y-5 animate-slide-in">
              <h2 className="text-sm font-extrabold text-red-500 uppercase tracking-widest text-left select-none">Delete Account</h2>
              
              <form onSubmit={handleDeleteAccount} className="bg-white dark:bg-gray-900 border border-red-100 dark:border-red-950/40 rounded-3xl p-5 text-left space-y-4">
                <div className="space-y-1">
                  <p className="text-xs font-bold text-red-600 dark:text-red-400">Danger Zone Action</p>
                  <p className="text-[10px] text-gray-400">This will permanently delete your account, credentials, and message history. This cannot be undone.</p>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-gray-500 uppercase">Confirm Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password to confirm"
                    className="w-full max-w-sm px-4 py-2.5 border border-gray-150 dark:border-gray-800 dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl text-xs focus:outline-none focus:ring-1.5 focus:ring-red-400"
                  />
                </div>

                {deleteError && <p className="text-red-500 text-xs font-semibold">{deleteError}</p>}

                <button
                  type="submit"
                  disabled={isDeleting || !password}
                  className="bg-red-550 hover:bg-red-600 text-white font-extrabold px-4.5 py-2.5 rounded-xl text-xs transition-colors cursor-pointer bg-red-600"
                >
                  {isDeleting ? "Deleting..." : "Permanently Delete"}
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
