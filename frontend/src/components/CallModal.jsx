import { useEffect, useRef, useState } from 'react'
import { useCall } from '../context/CallContext'

export default function CallModal() {
  const {
    callStatus,
    callType,
    partner,
    localStream,
    remoteStream,
    isMuted,
    isCameraOff,
    isScreenSharing,
    acceptIncomingCall,
    declineIncomingCall,
    endCurrentCall,
    toggleMic,
    toggleCamera,
    toggleScreenShare
  } = useCall()

  const localVideoRef = useRef(null)
  const remoteVideoRef = useRef(null)
  const remoteAudioRef = useRef(null)

  const [callDuration, setCallDuration] = useState(0)

  // Track elapsed call time
  useEffect(() => {
    let interval = null
    if (callStatus === 'active') {
      setCallDuration(0)
      interval = setInterval(() => {
        setCallDuration((prev) => prev + 1)
      }, 1000)
    } else {
      setCallDuration(0)
    }
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [callStatus])

  // Bind local video stream
  useEffect(() => {
    if (localVideoRef.current && localStream && callType === 'video') {
      localVideoRef.current.srcObject = localStream
      localVideoRef.current.play().catch((err) => console.warn('Local video play error:', err))
    }
  }, [localStream, callType, callStatus])

  // Bind remote video/audio stream
  useEffect(() => {
    if (callType === 'video' && remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream
      remoteVideoRef.current.play().catch((err) => console.warn('Remote video play error:', err))
    } else if (callType === 'voice' && remoteAudioRef.current && remoteStream) {
      remoteAudioRef.current.srcObject = remoteStream
      remoteAudioRef.current.play().catch((err) => console.warn('Remote audio play error:', err))
    }
  }, [remoteStream, callType, callStatus])

  if (callStatus === 'idle') return null

  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const getInitials = (name) => {
    if (!name) return '?'
    return name.trim().charAt(0).toUpperCase()
  }

  return (
    <div className="fixed inset-0 z-50 w-screen h-screen bg-slate-950 text-white select-none overflow-hidden flex flex-col justify-between animate-fade-in">
      
      {/* Hidden Audio Player for Voice calls */}
      {callType === 'voice' && <audio ref={remoteAudioRef} autoPlay playsInline />}

      {/* --- FLOATING TOP HEADER (Active & Dialing & Ringing) --- */}
      <div className="absolute top-4 left-4 right-4 md:top-6 md:left-6 md:right-6 z-40 flex items-center justify-between pointer-events-none">
        <div className="pointer-events-auto flex items-center gap-3 bg-slate-900/70 backdrop-blur-xl border border-white/10 px-4 py-2.5 rounded-full shadow-2xl">
          {partner?.image ? (
            <img src={partner.image} alt={partner.username} className="w-9 h-9 rounded-full object-cover ring-2 ring-white/20" />
          ) : (
            <div className="w-9 h-9 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-sm ring-2 ring-white/20">
              {getInitials(partner?.username)}
            </div>
          )}
          <div className="text-left pr-2">
            <p className="font-bold text-sm tracking-wide leading-tight truncate max-w-[160px] sm:max-w-[240px]">{partner?.username || 'User'}</p>
            <p className="text-[10px] text-slate-300 font-semibold tracking-wider uppercase">
              {callStatus === 'active' ? (callType === 'video' ? 'Video Call' : 'Voice Call') : callStatus}
            </p>
          </div>
        </div>

        {callStatus === 'active' && (
          <div className="pointer-events-auto bg-slate-900/70 backdrop-blur-xl border border-white/10 px-4 py-2 rounded-full text-xs font-mono tracking-widest text-emerald-400 shadow-2xl flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>{formatTimer(callDuration)}</span>
          </div>
        )}
      </div>

      {/* --- MAIN CONTENT AREA --- */}
      <div className="relative w-full h-full flex items-center justify-center bg-slate-950 overflow-hidden">
        
        {/* --- STATE 1: DIALING (OUTGOING) --- */}
        {callStatus === 'dialing' && (
          <div className="flex flex-col items-center justify-center space-y-6 animate-fade-in z-20">
            <div className="relative flex items-center justify-center w-40 h-40">
              {/* Outer pulsing ripples */}
              <div className="absolute inset-0 rounded-full bg-indigo-500/20 animate-ping duration-1000"></div>
              <div className="absolute inset-4 rounded-full bg-indigo-500/30 animate-pulse duration-700"></div>
              
              {/* User avatar */}
              {partner?.image ? (
                <img src={partner.image} alt={partner.username} className="relative w-32 h-32 rounded-full object-cover shadow-2xl ring-4 ring-indigo-500/50" />
              ) : (
                <div className="relative w-32 h-32 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center font-bold text-4xl shadow-2xl ring-4 ring-indigo-500/50">
                  {getInitials(partner?.username)}
                </div>
              )}
            </div>
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-bold tracking-tight">{partner?.username}</h2>
              <p className="text-indigo-400 font-semibold text-sm animate-pulse tracking-widest uppercase">Calling...</p>
            </div>
          </div>
        )}

        {/* --- STATE 2: RINGING (INCOMING RECEIVER) --- */}
        {callStatus === 'ringing' && (
          <div className="flex flex-col items-center justify-center space-y-8 animate-fade-in z-20">
            <div className="relative flex items-center justify-center w-44 h-44">
              <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping duration-1000"></div>
              <div className="absolute inset-4 rounded-full bg-emerald-500/30 animate-pulse duration-700"></div>
              
              {partner?.image ? (
                <img src={partner.image} alt={partner.username} className="relative w-36 h-36 rounded-full object-cover shadow-2xl ring-4 ring-emerald-500/50" />
              ) : (
                <div className="relative w-36 h-36 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center font-bold text-4xl shadow-2xl ring-4 ring-emerald-500/50">
                  {getInitials(partner?.username)}
                </div>
              )}
            </div>
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-bold tracking-tight">{partner?.username}</h2>
              <p className="text-emerald-400 font-bold text-sm animate-pulse tracking-widest uppercase">
                Incoming {callType === 'video' ? 'Video' : 'Voice'} Call
              </p>
            </div>

            {/* Answer & Decline Row */}
            <div className="flex items-center gap-10 pt-4">
              <button
                onClick={declineIncomingCall}
                className="w-16 h-16 rounded-full bg-rose-600 hover:bg-rose-700 active:scale-95 text-white flex items-center justify-center shadow-xl shadow-rose-600/30 transition-all cursor-pointer"
                title="Decline Call"
              >
                <svg className="w-7 h-7 rotate-[135deg]" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-2.824-1.47-5.112-3.758-6.58-6.58l1.293-.97c.362-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25z" />
                </svg>
              </button>
              <button
                onClick={acceptIncomingCall}
                className="w-16 h-16 rounded-full bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white flex items-center justify-center shadow-xl shadow-emerald-500/30 transition-all cursor-pointer animate-bounce duration-1000"
                title="Answer Call"
              >
                <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-2.824-1.47-5.112-3.758-6.58-6.58l1.293-.97c.362-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25z" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* --- STATE 3: ACTIVE CALL (FULL SCREEN) --- */}
        {callStatus === 'active' && (
          <div className="relative w-full h-full flex items-center justify-center bg-slate-950">
            
            {/* VIDEO CALL VIEWPORT */}
            {callType === 'video' ? (
              <div className="relative w-full h-full bg-slate-950 overflow-hidden flex items-center justify-center">
                
                {/* Remote Video (Full Screen Backdrop) */}
                {remoteStream ? (
                  <video
                    ref={remoteVideoRef}
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center space-y-4 bg-slate-950">
                    <div className="w-20 h-20 rounded-full bg-slate-900 border border-white/10 flex items-center justify-center animate-pulse">
                      <svg className="w-10 h-10 text-indigo-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
                      </svg>
                    </div>
                    <p className="text-sm text-slate-300 font-semibold animate-pulse">Establishing video connection...</p>
                  </div>
                )}

                {/* Local Video Stream (Picture-in-Picture Overlay) */}
                <div className="absolute bottom-24 right-4 sm:bottom-28 sm:right-6 w-36 sm:w-52 md:w-64 aspect-[3/4] sm:aspect-video rounded-2xl border-2 border-white/20 shadow-2xl overflow-hidden bg-slate-900 z-30 transition-all hover:scale-[1.02]">
                  {isCameraOff ? (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 text-xs text-slate-400 font-bold space-y-2">
                      <svg className="w-6 h-6 text-slate-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
                        <line x1="3" y1="3" x2="21" y2="21" stroke="currentColor" strokeWidth="2.5" />
                      </svg>
                      <span>Camera Off</span>
                    </div>
                  ) : (
                    <video
                      ref={localVideoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover scale-x-[-1]"
                    />
                  )}
                </div>

              </div>
            ) : (
              /* VOICE CALL VIEWPORT */
              <div className="flex flex-col items-center justify-center space-y-8 animate-fade-in z-20">
                <div className="relative flex items-center justify-center w-48 h-48">
                  {/* Wave effect */}
                  <div className="absolute inset-0 rounded-full bg-indigo-500/10 animate-ping duration-[3000ms]"></div>
                  <div className="absolute inset-6 rounded-full bg-indigo-500/20 animate-pulse duration-[2000ms]"></div>
                  
                  {partner?.image ? (
                    <img src={partner.image} alt={partner.username} className="relative w-36 h-36 rounded-full object-cover shadow-2xl ring-4 ring-indigo-500/40" />
                  ) : (
                    <div className="relative w-36 h-36 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center font-bold text-4xl shadow-2xl ring-4 ring-indigo-500/40">
                      {getInitials(partner?.username)}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 justify-center bg-slate-900/60 border border-white/10 px-4 py-1.5 rounded-full">
                  <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse" />
                  <span className="text-xs text-slate-300 font-bold tracking-widest uppercase">P2P Voice Connected</span>
                </div>
              </div>
            )}

          </div>
        )}
      </div>

      {/* --- FLOATING BOTTOM CONTROL BAR (Active & Dialing) --- */}
      {callStatus !== 'ringing' && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-40 bg-slate-900/80 backdrop-blur-xl border border-white/15 px-6 py-3 rounded-full flex items-center gap-5 md:gap-7 shadow-2xl">
          {callStatus === 'active' && (
            <>
              {/* Microphone toggle */}
              <button
                onClick={toggleMic}
                className={`w-12 h-12 rounded-full flex items-center justify-center transition-all cursor-pointer active:scale-95 ${
                  isMuted
                    ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/30'
                    : 'bg-white/10 text-white hover:bg-white/20'
                }`}
                title={isMuted ? 'Unmute Mic' : 'Mute Mic'}
              >
                {isMuted ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3z" />
                    <line x1="3" y1="3" x2="21" y2="21" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3z" />
                  </svg>
                )}
              </button>

              {/* Video camera toggle */}
              {callType === 'video' && (
                <button
                  onClick={toggleCamera}
                  className={`w-12 h-12 rounded-full flex items-center justify-center transition-all cursor-pointer active:scale-95 ${
                    isCameraOff
                      ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/30'
                      : 'bg-white/10 text-white hover:bg-white/20'
                  }`}
                  title={isCameraOff ? 'Start Camera' : 'Stop Camera'}
                >
                  {isCameraOff ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
                      <line x1="3" y1="3" x2="21" y2="21" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
                    </svg>
                  )}
                </button>
              )}

              {/* Screen Share toggle */}
              {callType === 'video' && (
                <button
                  onClick={toggleScreenShare}
                  className={`w-12 h-12 rounded-full flex items-center justify-center transition-all cursor-pointer active:scale-95 ${
                    isScreenSharing
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                      : 'bg-white/10 text-white hover:bg-white/20'
                  }`}
                  title={isScreenSharing ? 'Stop Screen Sharing' : 'Share Screen'}
                >
                  {isScreenSharing ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0V12a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 12V5.25" />
                    </svg>
                  )}
                </button>
              )}
            </>
          )}

          {/* End Call / Hang Up */}
          <button
            onClick={endCurrentCall}
            className="w-14 h-14 rounded-full bg-rose-600 hover:bg-rose-700 active:scale-95 text-white flex items-center justify-center shadow-xl shadow-rose-600/30 transition-all cursor-pointer"
            title="Hang Up"
          >
            <svg className="w-6 h-6 rotate-[135deg]" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-2.824-1.47-5.112-3.758-6.58-6.58l1.293-.97c.362-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25z" />
            </svg>
          </button>
        </div>
      )}

    </div>
  )
}
