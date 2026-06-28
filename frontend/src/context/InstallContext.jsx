/* eslint-disable react-refresh/only-export-components */
import { createContext, useState, useEffect, useContext } from 'react'

export const InstallContext = createContext(null)

export const InstallProvider = ({ children }) => {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [isInstallable, setIsInstallable] = useState(false)
  const [isInstalled, setIsInstalled] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true
  })

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setIsInstallable(true)
    }

    const handleAppInstalled = () => {
      setDeferredPrompt(null)
      setIsInstallable(false)
      setIsInstalled(true)
      console.log('[PWA] Installed successfully')
    }

    const mediaQuery = window.matchMedia('(display-mode: standalone)')
    const handleDisplayModeChange = (e) => {
      setIsInstalled(e.matches)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)
    mediaQuery.addEventListener('change', handleDisplayModeChange)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
      mediaQuery.removeEventListener('change', handleDisplayModeChange)
    }
  }, [])

  const install = async () => {
    if (!deferredPrompt) {
      return false
    }

    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    console.log(`[PWA] Install prompt outcome: ${outcome}`)

    setDeferredPrompt(null)
    setIsInstallable(false)

    return outcome === 'accepted'
  }

  return (
    <InstallContext.Provider value={{ isInstallable, isInstalled, install }}>
      {children}
    </InstallContext.Provider>
  )
}

export const useInstall = () => {
  const context = useContext(InstallContext)
  if (!context) {
    throw new Error('useInstall must be used within an InstallProvider')
  }
  return context
}
