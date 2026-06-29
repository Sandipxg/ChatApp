import { createContext, useState, useEffect } from "react"

const ACCENT_COLOR_MAP = {
  indigo: { main: '#6366f1', hover: '#4f46e5' },
  teal: { main: '#14b8a6', hover: '#0d9488' },
  blue: { main: '#3b82f6', hover: '#2563eb' },
  rose: { main: '#ec4899', hover: '#db2777' },
  orange: { main: '#f97316', hover: '#ea580c' },
  purple: { main: '#a855f7', hover: '#9333ea' }
}

const ThemeContext = createContext({
  theme: "light",
  setTheme: () => {},
  accentColor: "indigo",
  setAccentColor: () => {},
  chatWallpaper: "none",
  setChatWallpaper: () => {},
  fontSize: "medium",
  setFontSize: () => {},
  enterToSend: false,
  setEnterToSend: () => {},
  readReceipts: true,
  setReadReceipts: () => {},
  playSounds: true,
  setPlaySounds: () => {}
})

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => localStorage.getItem("theme") || "light")
  const [accentColor, setAccentColor] = useState(() => localStorage.getItem("accentColor") || "indigo")
  const [chatWallpaper, setChatWallpaper] = useState(() => localStorage.getItem("chatWallpaper") || "none")
  const [fontSize, setFontSize] = useState(() => localStorage.getItem("fontSize") || "medium")
  const [enterToSend, setEnterToSend] = useState(() => localStorage.getItem("enterToSend") === "true")
  const [readReceipts, setReadReceipts] = useState(() => localStorage.getItem("readReceipts") !== "false")
  const [playSounds, setPlaySounds] = useState(() => localStorage.getItem("playSounds") !== "false")

  // Update theme setting in localStorage and classList
  function handleSetTheme(value) {
    localStorage.setItem("theme", value)
    setTheme(value)
  }

  // Update CSS custom variables for accent color dynamically
  useEffect(() => {
    const colors = ACCENT_COLOR_MAP[accentColor] || ACCENT_COLOR_MAP.indigo
    document.documentElement.style.setProperty('--accent-color', colors.main)
    document.documentElement.style.setProperty('--accent-color-hover', colors.hover)
    localStorage.setItem("accentColor", accentColor)
  }, [accentColor])

  // Save other preferences to local storage
  const handleSetChatWallpaper = (val) => {
    localStorage.setItem("chatWallpaper", val)
    setChatWallpaper(val)
  }

  const handleSetFontSize = (val) => {
    localStorage.setItem("fontSize", val)
    setFontSize(val)
  }

  const handleSetEnterToSend = (val) => {
    localStorage.setItem("enterToSend", String(val))
    setEnterToSend(val)
  }

  const handleSetReadReceipts = (val) => {
    localStorage.setItem("readReceipts", String(val))
    setReadReceipts(val)
  }

  const handleSetPlaySounds = (val) => {
    localStorage.setItem("playSounds", String(val))
    setPlaySounds(val)
  }

  // Listen for changes in theme to dynamically add/remove the 'dark' class
  useEffect(() => {
    const root = document.documentElement
    if (theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches)) {
      root.classList.add("dark")
    } else {
      root.classList.remove("dark")
    }
  }, [theme])

  // Support system preference changes
  useEffect(() => {
    if (theme !== "system") return

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")
    const handleChange = () => {
      const root = document.documentElement
      if (mediaQuery.matches) {
        root.classList.add("dark")
      } else {
        root.classList.remove("dark")
      }
    }
    mediaQuery.addEventListener("change", handleChange)
    return () => mediaQuery.removeEventListener("change", handleChange)
  }, [theme])

  return (
    <ThemeContext.Provider value={{
      theme,
      setTheme: handleSetTheme,
      accentColor,
      setAccentColor,
      chatWallpaper,
      setChatWallpaper: handleSetChatWallpaper,
      fontSize,
      setFontSize: handleSetFontSize,
      enterToSend,
      setEnterToSend: handleSetEnterToSend,
      readReceipts,
      setReadReceipts: handleSetReadReceipts,
      playSounds,
      setPlaySounds: handleSetPlaySounds
    }}>
      <div className={`font-size-${fontSize}`}>
        {children}
      </div>
    </ThemeContext.Provider>
  )
}

export default ThemeContext
