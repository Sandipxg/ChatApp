import { BrowserRouter, Routes, Route, Link, useNavigate, useLocation } from "react-router-dom"
import { useContext, useState, lazy, Suspense, useEffect } from "react"
import { ThemeProvider } from "./context/ThemeContext"
import ThemeContext from "./context/ThemeContext"
import { AuthProvider, useAuth } from "./context/AuthContext"
import { InstallProvider, useInstall } from './context/InstallContext'

import ProtectedRoute from "./components/ProtectedRoute"
import ErrorBoundary from "./components/ErrorBoundary"

const ChatPage = lazy(() => import("./pages/ChatPage"))
const SettingsPage = lazy(() => import("./pages/Settingpage"))
const LoginPage = lazy(() => import("./pages/Loginpage"))

// Premium SVG Icons
function LogoIcon({ className }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 9.75a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375m-13.5 3.01c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.184-4.183a1.14 1.14 0 0 1 .778-.332 48.294 48.294 0 0 0 5.83-.498c1.585-.233 2.708-1.626 2.708-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />
    </svg>
  )
}

function ChatIcon({ className }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  )
}

function ContactsIcon({ className }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.109A11.386 11.386 0 0 1 10.089 18a11.374 11.374 0 0 1-9.333-2.978 4.125 4.125 0 0 1 7.532-2.492M15 7.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm-6 0a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm4.5 0a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
    </svg>
  )
}

function BellIcon({ className }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0M3.124 7.5A8.969 8.969 0 0 1 5.292 3m13.416 0a8.969 8.969 0 0 1 2.168 4.5" />
    </svg>
  )
}

function SettingsIcon({ className }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.43l-1.003.828c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.43l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 0 1 0-.255c.007-.378-.138-.75-.43-.991l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.645-.869l.214-1.28Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
    </svg>
  )
}

function PaintIcon({ className }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 0 0-3.078 0L3.75 17.5a.75.75 0 1 0 .75 1.3l2.7-1.378a1.5 1.5 0 0 1 1.54 0L11.25 19a.75.75 0 1 0 .75-1.3l-2.47-1.578Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5a4.5 4.5 0 0 0-4.5-4.5c-1.637 0-3.136.877-3.957 2.296L7.696 12.5A4.5 4.5 0 0 0 11.25 19.5c1.638 0 3.137-.878 3.957-2.297l4.097-7.202c.62-1.091.946-2.333.946-3.501Z" />
    </svg>
  )
}

function SunIcon({ className }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m0 13.5V21m9.75-9h-2.25M4.5 12H2.25m16.909-6.909-1.591 1.59M5.59 18.41l1.59-1.59m11.228 0 1.59 1.59m-11.228-11.23-1.59-1.59M12 7.5a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9Z" />
    </svg>
  )
}

function MoonIcon({ className }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z" />
    </svg>
  )
}

function ChevronDownIcon({ className }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
    </svg>
  )
}

function PageLoader() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-5">
      <div className="relative w-14 h-14">
        <div className="absolute inset-0 rounded-full border-4 border-accent/20"></div>
        <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-accent animate-spin"></div>
        <div className="absolute inset-2 rounded-full bg-gradient-to-br from-accent/20 to-indigo-500/10 flex items-center justify-center">
          <LogoIcon className="w-5 h-5 text-accent" />
        </div>
      </div>
      <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 tracking-wider uppercase">Loading...</p>
    </div>
  )
}

function AppLayout() {
  const { theme, setTheme } = useContext(ThemeContext)
  const { currentUser, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [showUserMenu, setShowUserMenu] = useState(false)

  const isAuthPage = location.pathname === "/auth" || !currentUser

  function handleLogout() {
    logout()
    setShowUserMenu(false)
    navigate("/auth")
  }

  const toggleTheme = () => {
    setTheme(theme === "light" ? "dark" : "light")
  }

  // Determine current active section for navigation highlighting
  const getActiveTab = () => {
    if (location.pathname === "/") {
      // If on chat page, could be chats list or contacts list
      return location.state?.activeTab || "chats"
    }
    if (location.pathname === "/settings") {
      return location.state?.activeTab || "account"
    }
    return "chats"
  }

  const activeTab = getActiveTab()



  // Dynamic Page Header Info
  const renderHeaderTitle = () => {
    if (location.pathname === "/") {
      return (
        <div className="flex items-center gap-3 text-left">
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-accent to-indigo-600 flex items-center justify-center shadow-md shadow-accent/25 flex-shrink-0">
            <LogoIcon className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-extrabold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400 bg-clip-text text-transparent leading-none tracking-tight">ChatApp</span>
        </div>
      )
    }
    
    // Settings title
    const settingsSubTab = location.state?.activeTab || "general"
    return (
      <div className="flex items-center gap-2">
        <button 
          onClick={() => navigate("/")}
          className="p-1 rounded-lg text-gray-400 hover:text-gray-850 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors mr-1 cursor-pointer"
          title="Back to Chats"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
        </button>
        <h1 className="text-lg font-extrabold capitalize text-gray-900 dark:text-white select-none">
          {settingsSubTab}
        </h1>
      </div>
    )
  }

  const firstLetter = currentUser ? currentUser.username.charAt(0).toUpperCase() : 'G'

  // Logged-out shell view
  if (isAuthPage) {
    return (
      <div className="min-h-screen bg-bg-app flex flex-col justify-center">
        <ErrorBoundary>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="*" element={<LoginPage />} />
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </div>
    )
  }

  return (
    <div className="h-screen w-screen flex bg-bg-app text-text-body overflow-hidden select-none">
      
      {/* ── 2. MAIN CONTENT VIEW WITH HEADER ── */}
      <div className="flex-1 flex flex-col min-w-0 relative h-full">
        
        {/* Global Dynamic Top Header */}
        <header className="h-[72px] bg-bg-card/90 border-b border-border-app flex-shrink-0 flex items-center justify-between px-6 z-30 select-none backdrop-blur-sm">
          
          {/* Left: Dynamic section title */}
          <div className="flex items-center gap-3">
            {renderHeaderTitle()}
          </div>



          {/* Right: Actions menu & Dropdown */}
          <div className="flex items-center gap-4">
            


            {/* Quick Settings */}
            <button
              onClick={() => navigate("/settings", { state: { activeTab: "account" } })}
              className="p-2 text-gray-400 hover:text-accent hover:bg-accent/8 dark:hover:bg-accent/10 rounded-xl transition-all cursor-pointer"
              title="Settings"
            >
              <SettingsIcon className="w-5 h-5" />
            </button>

            {/* Profile Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 pl-1 pr-2.5 py-1 rounded-2xl hover:bg-bg-app/80 transition-all cursor-pointer select-none group"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent to-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-md shadow-accent/20 ring-2 ring-white dark:ring-gray-900 group-hover:ring-accent/30 transition-all">
                  {firstLetter}
                </div>
                <ChevronDownIcon className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 ${showUserMenu ? 'rotate-180' : ''}`} />
              </button>

              {/* Profile Dropdown Menu */}
              {showUserMenu && (
                <div className="absolute right-0 mt-2.5 w-52 bg-bg-card border border-border-app rounded-2xl shadow-2xl shadow-black/10 dark:shadow-black/40 py-1.5 z-50 animate-fade-up text-left overflow-hidden">
                  <div className="px-4 py-3 border-b border-border-app flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-accent to-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-md shadow-accent/20 flex-shrink-0">
                      {firstLetter}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-text-title truncate">{currentUser.username}</p>
                      <p className="text-[10px] text-text-body opacity-60 font-medium truncate mt-0.5">{currentUser.email || 'Logged in'}</p>
                    </div>
                  </div>
                  <div className="py-1">
                    <button
                      onClick={() => { setShowUserMenu(false); navigate("/settings", { state: { activeTab: "account" } }) }}
                      className="w-full text-left flex items-center gap-3 px-4 py-2.5 text-xs font-semibold text-text-body hover:bg-bg-app hover:text-text-title cursor-pointer transition-colors"
                    >
                      <SettingsIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <span>Settings</span>
                    </button>
                    <button
                      onClick={handleLogout}
                      className="w-full text-left flex items-center gap-3 px-4 py-2.5 text-xs font-semibold text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 cursor-pointer transition-colors"
                    >
                      <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M12 9l-3 3m0 0 3 3m-3-3h12.75" />
                      </svg>
                      <span>Log out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

          </div>

        </header>

        {/* Pages Main Container */}
        <main className="flex-1 min-h-0 min-w-0 relative">
          <ErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/" element={
                  <ProtectedRoute><ChatPage /></ProtectedRoute>
                } />
                <Route path="/settings" element={
                  <ProtectedRoute><SettingsPage /></ProtectedRoute>
                } />
              </Routes>
            </Suspense>
          </ErrorBoundary>
        </main>

      </div>

    </div>
  )
}

function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <InstallProvider>
          <BrowserRouter>
            <AppLayout />
          </BrowserRouter>
        </InstallProvider>
      </ThemeProvider>
    </AuthProvider>
  )
}

export default App
