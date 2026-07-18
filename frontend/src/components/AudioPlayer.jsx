import { useEffect, useRef, useState } from 'react'
import WaveSurfer from 'wavesurfer.js'

export default function AudioPlayer({ audioUrl, isOwnMessage }) {
  const containerRef = useRef(null)
  const wavesurferRef = useRef(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [playbackRate, setPlaybackRate] = useState(1)
  const [isReady, setIsReady] = useState(false)
  const [loadError, setLoadError] = useState(false)

  // Format time in seconds to mm:ss
  const formatTime = (time) => {
    if (isNaN(time)) return '0:00'
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  useEffect(() => {
    if (!containerRef.current) return

    // Get active theme's accent color dynamically, default to Indigo (#6366f1) if not found
    const rootStyles = getComputedStyle(document.documentElement)
    const themeAccent = rootStyles.getPropertyValue('--accent-color').trim() || '#6366f1'

    // Determine colors based on whether message is own or other
    const progressColor = isOwnMessage ? '#ffffff' : themeAccent
    const waveColor = isOwnMessage ? 'rgba(255, 255, 255, 0.35)' : 'rgba(0, 0, 0, 0.15)'
    const cursorColor = isOwnMessage ? '#ffffff' : themeAccent

    // Initialize WaveSurfer
    const ws = WaveSurfer.create({
      container: containerRef.current,
      waveColor,
      progressColor,
      cursorColor,
      cursorWidth: 2,
      barWidth: 2,
      barGap: 3,
      barRadius: 2,
      height: 38,
      responsive: true,
      normalize: true,
      backend: 'WebAudio',
    })

    wavesurferRef.current = ws

    // Load the audio url
    ws.load(audioUrl)

    // Events
    ws.on('ready', () => {
      setDuration(ws.getDuration())
      setIsReady(true)
      setLoadError(false)
    })

    ws.on('play', () => setIsPlaying(true))
    ws.on('pause', () => setIsPlaying(false))
    ws.on('finish', () => {
      setIsPlaying(false)
      ws.seekTo(0)
    })

    ws.on('audioprocess', () => {
      setCurrentTime(ws.getCurrentTime())
    })

    ws.on('interaction', () => {
      // Keep state in sync if user clicks/drags to seek
      setCurrentTime(ws.getCurrentTime())
    })

    ws.on('error', (err) => {
      console.error('WaveSurfer loading error:', err)
      setLoadError(true)
      setIsReady(true) // stop spinner
    })

    // Clean up
    return () => {
      ws.destroy()
    }
  }, [audioUrl, isOwnMessage])

  // Handle speed changes (1x -> 1.5x -> 2x -> 1x)
  const handleSpeedToggle = () => {
    if (!wavesurferRef.current) return
    let newRate = 1
    if (playbackRate === 1) newRate = 1.5
    else if (playbackRate === 1.5) newRate = 2
    else newRate = 1

    setPlaybackRate(newRate)
    wavesurferRef.current.setPlaybackRate(newRate)
  }

  const handlePlayPause = () => {
    if (!wavesurferRef.current || !isReady) return
    wavesurferRef.current.playPause()
  }

  return (
    <div className={`flex items-center gap-3 p-2.5 rounded-xl max-w-sm w-72 xs:w-80 sm:w-96 select-none ${
      isOwnMessage 
        ? 'text-white' 
        : 'text-text-body'
    }`}>
      {/* Play/Pause Button */}
      <button
        onClick={handlePlayPause}
        disabled={!isReady || loadError}
        className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 cursor-pointer transition-all active:scale-90 ${
          isOwnMessage 
            ? 'bg-white/15 hover:bg-white/25 text-white' 
            : 'bg-accent/10 hover:bg-accent/15 text-accent'
        } disabled:opacity-50`}
        aria-label={isPlaying ? 'Pause' : 'Play'}
      >
        {!isReady && !loadError ? (
          <svg className="w-4.5 h-4.5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        ) : isPlaying ? (
          <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
            <path fillRule="evenodd" d="M6.75 5.25a.75.75 0 0 1 .75-.75H9a.75.75 0 0 1 .75.75v13.5a.75.75 0 0 1-.75.75H7.5a.75.75 0 0 1-.75-.75V5.25Zm7.5 0A.75.75 0 0 1 15 4.5h1.5a.75.75 0 0 1 .75.75v13.5a.75.75 0 0 1-.75.75H15a.75.75 0 0 1-.75-.75V5.25Z" clipRule="evenodd" />
          </svg>
        ) : (
          <svg className="w-4.5 h-4.5 fill-current ml-0.5" viewBox="0 0 24 24">
            <path fillRule="evenodd" d="M4.5 5.653c0-1.427 1.529-2.33 2.779-1.643l11.54 6.347c1.295.712 1.295 2.573 0 3.286L7.28 19.99c-1.25.687-2.779-.217-2.779-1.643V5.653Z" clipRule="evenodd" />
          </svg>
        )}
      </button>

      {/* Waveform and Time Track */}
      <div className="flex-1 min-w-0 flex flex-col justify-center">
        {loadError ? (
          <span className="text-xs text-red-500 font-medium">Failed to load audio</span>
        ) : (
          <>
            {/* Wavesurfer Container */}
            <div ref={containerRef} className="w-full h-9" />
            
            {/* Time labels */}
            <div className="flex items-center justify-between text-[10px] mt-1 opacity-75 font-mono">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </>
        )}
      </div>

      {/* Playback Rate / Speed Button */}
      <button
        onClick={handleSpeedToggle}
        disabled={!isReady || loadError}
        className={`px-1.5 py-0.5 text-[9px] font-bold rounded-sm border shrink-0 cursor-pointer uppercase transition-all duration-150 active:scale-95 ${
          isOwnMessage
            ? 'border-white/20 bg-white/5 hover:bg-white/10 text-white'
            : 'border-border-app bg-bg-app hover:bg-black/5 text-text-body'
        }`}
        title="Playback Speed"
      >
        {playbackRate}x
      </button>
    </div>
  )
}
