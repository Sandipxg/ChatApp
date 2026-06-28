import { BrowserRouter, Routes, Route, Link, NavLink, useNavigate } from "react-router-dom"
import { useContext, useState, lazy, Suspense } from "react"
import { ThemeProvider } from "./context/ThemeContext"
import ThemeContext from "./context/ThemeContext"
import { AuthProvider, useAuth } from "./context/AuthContext"
import { InstallProvider, useInstall } from './context/InstallContext'

import ProtectedRoute from "./components/ProtectedRoute"
import ErrorBoundary from "./components/ErrorBoundary"

const HomePage = lazy(() => import("./pages/Homepage"))
const JournalPage = lazy(() => import("./pages/Journalpage"))
const JournalDetailPage = lazy(() => import("./pages/JournalDetailPage"))
const SettingsPage = lazy(() => import("./pages/Settingpage"))
const LoginPage = lazy(() => import("./pages/Loginpage"))

// Premium SVG Icons
function FeatherIcon({ className }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
      <path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z" />
      <line x1="16" y1="8" x2="2" y2="22" />
      <line x1="17.5" y1="15" x2="9" y2="15" />
    </svg>
  )
}

function PostsIcon({ className }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  )
}

function JournalIcon({ className }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
  )
}

function SettingsIcon({ className }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
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

function ChevronDownIcon({ className }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}

function PageLoader() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
      <div className="w-12 h-12 border-4 border-purple-200 dark:border-purple-900 border-t-purple-600 dark:border-t-purple-400 rounded-full animate-spin"></div>
      <p className="text-gray-500 dark:text-gray-400 text-sm font-medium animate-pulse">Loading page...</p>
    </div>
  )
}

function AppLayout() {
  const { theme, setTheme } = useContext(ThemeContext)
  const { currentUser, logout } = useAuth()
  const { isInstallable, isInstalled, install } = useInstall()
  const navigate = useNavigate()
  const [showUserMenu, setShowUserMenu] = useState(false)

  function handleLogout() {
    logout()
    setShowUserMenu(false)
    navigate("/auth")
  }

  const toggleTheme = () => {
    setTheme(theme === "light" ? "dark" : "light")
  }

  const desktopNavLinkClass = ({ isActive }) =>
    `flex items-center gap-2 px-3 py-4 text-sm font-medium border-b-3 transition-all duration-200 cursor-pointer ${
      isActive
        ? "border-purple-600 text-purple-600 dark:border-purple-400 dark:text-purple-400 font-semibold"
        : "border-transparent text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 hover:border-gray-200"
    }`

  const navLinkClass = ({ isActive }) =>
    `flex flex-col items-center gap-0.5 px-4 py-1 text-xs font-medium transition-colors ${
      isActive
        ? "text-purple-600 dark:text-purple-400"
        : "text-gray-500 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400"
    }`

  const firstLetter = currentUser ? currentUser.username.charAt(0).toUpperCase() : 'G'

  return (
    <div className={`min-h-screen ${theme === "dark" ? "dark" : ""}`}>
      <div className="min-h-screen bg-[#fdfcff] dark:bg-gray-900 text-gray-800 dark:text-gray-100 flex flex-col">

        {/* ── Top Header Navigation Bar ── */}
        <nav className="bg-white dark:bg-gray-800 border-b border-[#f3f0f7] dark:border-gray-700 sticky top-0 z-40 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.03)]">
          <div className="max-w-6xl mx-auto px-4 md:px-6 flex items-center h-16 justify-between">
            
            {/* Left side: Brand Logo and Navigation Links */}
            <div className="flex items-center gap-8">
              {/* Brand Logo */}
              <Link to="/" className="flex items-center gap-2 text-purple-600 dark:text-purple-400 font-bold text-lg select-none">
                <FeatherIcon className="w-5 h-5" />
                <span>My Journal</span>
              </Link>

              {/* Desktop Nav Tabs */}
              <div className="hidden md:flex items-center gap-6 h-16">
                <NavLink to="/" end className={desktopNavLinkClass}>
                  <PostsIcon className="w-4 h-4" />
                  <span>Posts</span>
                </NavLink>
                <NavLink to="/journals" className={desktopNavLinkClass}>
                  <JournalIcon className="w-4 h-4" />
                  <span>Journals</span>
                </NavLink>
                <NavLink to="/settings" className={desktopNavLinkClass}>
                  <SettingsIcon className="w-4 h-4" />
                  <span>Settings</span>
                </NavLink>
              </div>
            </div>

            {/* Right side: App Actions & Profile dropdown */}
            <div className="flex items-center gap-4">
              {isInstallable && !isInstalled && (
                <button
                  onClick={install}
                  className="hidden sm:flex bg-purple-600 hover:bg-purple-700 text-white px-3.5 py-2 rounded-xl text-xs font-semibold transition-all duration-200 items-center gap-1.5 shadow-[0_4px_12px_rgba(124,58,237,0.15)] active:scale-95 cursor-pointer"
                >
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  <span>Install App</span>
                </button>
              )}

              {/* Theme Toggle Button */}
              <button
                onClick={toggleTheme}
                aria-label="Toggle Theme"
                className="p-2.5 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl transition-all cursor-pointer border border-[#f3f0f7] dark:border-gray-700"
              >
                {theme === "light" ? <MoonIcon className="w-4.5 h-4.5" /> : <SunIcon className="w-4.5 h-4.5" />}
              </button>

              {/* Profile / Account Dropdown */}
              {currentUser ? (
                <div className="relative">
                  <button
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="flex items-center gap-2.5 p-1 px-2.5 rounded-xl border border-[#f3f0f7] dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all cursor-pointer"
                  >
                    <span className="text-sm font-semibold text-gray-600 dark:text-gray-300 hidden sm:inline">
                      Hi, {currentUser.username}
                    </span>
                    <div className="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold text-sm shadow-[0_2px_8px_rgba(124,58,237,0.2)]">
                      {firstLetter}
                    </div>
                    <ChevronDownIcon className="w-4 h-4 text-gray-400" />
                  </button>

                  {/* Dropdown Menu */}
                  {showUserMenu && (
                    <div className="absolute right-0 mt-2.5 w-48 bg-white dark:bg-gray-800 border border-[#f3f0f7] dark:border-gray-700 rounded-2xl shadow-[0_10px_25px_-5px_rgba(0,0,0,0.1)] py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                      <div className="px-4 py-2 border-b border-[#f3f0f7] dark:border-gray-700">
                        <p className="text-xs text-gray-400 dark:text-gray-500">Logged in as</p>
                        <p className="text-sm font-bold text-gray-800 dark:text-gray-100 truncate">
                          {currentUser.username}
                        </p>
                      </div>
                      <Link
                        to="/settings"
                        onClick={() => setShowUserMenu(false)}
                        className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                      >
                        <SettingsIcon className="w-4 h-4 text-gray-400" />
                        <span>Settings</span>
                      </Link>
                      <button
                        onClick={handleLogout}
                        className="w-full text-left flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 cursor-pointer"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        <span>Logout</span>
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <Link
                  to="/auth"
                  className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200"
                >
                  Login
                </Link>
              )}
            </div>

          </div>
        </nav>

        {/* ── Main Content Container ── */}
        <main className="max-w-6xl mx-auto px-4 md:px-6 py-8 md:py-10 pb-24 md:pb-12 flex-1 w-full relative">
          <ErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/journals" element={
                  <ProtectedRoute><JournalPage /></ProtectedRoute>
                } />
                <Route path="/journals/:id" element={
                  <ProtectedRoute><JournalDetailPage /></ProtectedRoute>
                } />
                <Route path="/settings" element={
                  <ProtectedRoute><SettingsPage /></ProtectedRoute>
                } />
                <Route path="/auth" element={<LoginPage />} />
              </Routes>
            </Suspense>
          </ErrorBoundary>
        </main>

        {/* ── Mobile Bottom Navigation Bar — hidden on md+ ── */}
        {currentUser && (
          <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/90 dark:bg-gray-800/90 backdrop-blur-md border-t border-[#f3f0f7] dark:border-gray-700 flex md:hidden justify-around py-2.5 shadow-[0_-5px_15px_rgba(0,0,0,0.03)]">
            <NavLink to="/" end className={navLinkClass}>
              {({ isActive }) => (
                <>
                  <PostsIcon className={`w-5.5 h-5.5 transition-transform active:scale-90 ${isActive ? "text-purple-600 dark:text-purple-400" : "text-gray-500 dark:text-gray-400"}`} />
                  <span>Posts</span>
                </>
              )}
            </NavLink>
            <NavLink to="/journals" className={navLinkClass}>
              {({ isActive }) => (
                <>
                  <JournalIcon className={`w-5.5 h-5.5 transition-transform active:scale-90 ${isActive ? "text-purple-600 dark:text-purple-400" : "text-gray-500 dark:text-gray-400"}`} />
                  <span>Journals</span>
                </>
              )}
            </NavLink>
            <NavLink to="/settings" className={navLinkClass}>
              {({ isActive }) => (
                <>
                  <SettingsIcon className={`w-5.5 h-5.5 transition-transform active:scale-90 ${isActive ? "text-purple-600 dark:text-purple-400" : "text-gray-500 dark:text-gray-400"}`} />
                  <span>Settings</span>
                </>
              )}
            </NavLink>
          </nav>
        )}

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
