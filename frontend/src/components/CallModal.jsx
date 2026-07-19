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
    }
  }, [localStream, callType, callStatus])

  // Bind remote video/audio stream
  useEffect(() => {
    if (callType === 'video' && remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream
    } else if (callType === 'voice' && remoteAudioRef.current && remoteStream) {
      remoteAudioRef.current.srcObject = remoteStream
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-xl p-4 md:p-6 animate-fade-in text-white select-none">
      
      {/* Hidden Audio Player for Voice calls */}
      {callType === 'voice' && <audio ref={remoteAudioRef} autoPlay playsInline />}

      <div className="relative w-full max-w-4xl aspect-[4/3] md:aspect-video bg-slate-900/80 border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col items-center justify-between p-8">
        
        {/* --- STATE 1: DIALING (OUTGOING) --- */}
        {callStatus === 'dialing' && (
          <div className="flex-1 flex flex-col items-center justify-center space-y-6 w-full animate-fade-in">
            <div className="relative flex items-center justify-center w-36 h-36">
              {/* Outer pulsing ripples */}
              <div className="absolute inset-0 rounded-full bg-accent/10 animate-ping duration-1000"></div>
              <div className="absolute inset-4 rounded-full bg-accent/20 animate-pulse duration-700"></div>
              
              {/* User avatar */}
              {partner?.image ? (
                <img src={partner.image} alt={partner.username} className="relative w-28 h-28 rounded-full object-cover shadow-lg border-2 border-accent" />
              ) : (
                <div className="relative w-28 h-28 rounded-full bg-gradient-to-br from-accent to-indigo-600 text-white flex items-center justify-center font-bold text-3xl border-2 border-accent shadow-lg">
                  {getInitials(partner?.username)}
                </div>
              )}
            </div>
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold tracking-tight">{partner?.username}</h2>
              <p className="text-accent/80 font-semibold text-sm animate-pulse tracking-wide uppercase">Calling...</p>
            </div>
          </div>
        )}

        {/* --- STATE 2: RINGING (INCOMING) --- */}
        {callStatus === 'ringing' && (
          <div className="flex-1 flex flex-col items-center justify-center space-y-6 w-full animate-fade-in">
            <div className="relative flex items-center justify-center w-36 h-36">
              <div className="absolute inset-0 rounded-full bg-emerald-500/10 animate-ping duration-1000"></div>
              <div className="absolute inset-4 rounded-full bg-emerald-500/20 animate-pulse duration-700"></div>
              
              {partner?.image ? (
                <img src={partner.image} alt={partner.username} className="relative w-28 h-28 rounded-full object-cover shadow-lg border-2 border-emerald-500" />
              ) : (
                <div className="relative w-28 h-28 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center font-bold text-3xl border-2 border-emerald-500 shadow-lg">
                  {getInitials(partner?.username)}
                </div>
              )}
            </div>
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold tracking-tight">{partner?.username}</h2>
              <p className="text-emerald-400 font-semibold text-sm animate-pulse tracking-wide uppercase">
                Incoming {callType === 'video' ? 'Video' : 'Voice'} Call
              </p>
            </div>

            {/* Answer & Decline Row */}
            <div className="flex items-center gap-8 pt-4">
              <button
                onClick={declineIncomingCall}
                className="w-14 h-14 rounded-full bg-rose-500 hover:bg-rose-600 active:scale-95 text-white flex items-center justify-center shadow-lg hover:shadow-rose-500/25 transition-all cursor-pointer"
                title="Decline"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-2.824-1.47-5.112-3.758-6.58-6.58l1.293-.97c.362-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25z" className="origin-center rotate-[135deg]" />
                </svg>
              </button>
              <button
                onClick={acceptIncomingCall}
                className="w-16 h-16 rounded-full bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white flex items-center justify-center shadow-lg hover:shadow-emerald-500/25 transition-all cursor-pointer animate-bounce duration-1000"
                title="Answer"
              >
                <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-2.824-1.47-5.112-3.758-6.58-6.58l1.293-.97c.362-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25z" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* --- STATE 3: ACTIVE CALL --- */}
        {callStatus === 'active' && (
          <div className="flex-1 w-full flex flex-col justify-between h-full relative">
            
            {/* Header info */}
            <div className="absolute top-0 left-0 right-0 flex items-center justify-between z-20 bg-gradient-to-b from-black/50 to-transparent p-4 rounded-t-3xl">
              <div className="flex items-center gap-3">
                {partner?.image ? (
                  <img src={partner.image} alt={partner.username} className="w-10 h-10 rounded-full object-cover ring-2 ring-white/10" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-accent text-white flex items-center justify-center font-bold text-sm">
                    {getInitials(partner?.username)}
                  </div>
                )}
                <div className="text-left">
                  <p className="font-bold text-sm truncate">{partner?.username}</p>
                  <p className="text-[10px] text-slate-300 font-semibold">{callType === 'video' ? 'Video Call' : 'Voice Call'}</p>
                </div>
              </div>
              <div className="bg-black/40 border border-white/10 rounded-full px-3 py-1 text-xs font-mono tracking-widest">
                {formatTimer(callDuration)}
              </div>
            </div>

            {/* Main viewports */}
            <div className="flex-1 w-full flex items-center justify-center relative mt-16 mb-20 rounded-2xl overflow-hidden bg-slate-950">
              
              {/* VIDEO VIEWER */}
              {callType === 'video' ? (
                <div className="relative w-full h-full">
                  {/* Remote video stream */}
                  {remoteStream ? (
                    <video
                      ref={remoteVideoRef}
                      autoPlay
                      playsInline
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center space-y-4">
                      <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center animate-pulse">
                        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
                        </svg>
                      </div>
                      <p className="text-xs text-slate-400 font-semibold animate-pulse">Connecting video feed...</p>
                    </div>
                  )}

                  {/* Local video stream (PIP overlay) */}
                  <div className="absolute bottom-4 right-4 w-28 md:w-40 aspect-video rounded-xl border border-white/20 shadow-2xl overflow-hidden bg-slate-900 z-30">
                    {isCameraOff ? (
                      <div className="w-full h-full flex items-center justify-center bg-slate-800 text-xs text-slate-400 font-bold">
                        Camera Off
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
                /* VOICE VIEWER */
                <div className="flex flex-col items-center justify-center space-y-8 animate-fade-in">
                  <div className="relative flex items-center justify-center w-36 h-36">
                    {/* Ringing waves */}
                    <div className="absolute inset-0 rounded-full bg-accent/5 animate-ping duration-[3000ms]"></div>
                    <div className="absolute inset-4 rounded-full bg-accent/10 animate-pulse duration-[2000ms]"></div>
                    
                    {partner?.image ? (
                      <img src={partner.image} alt={partner.username} className="relative w-28 h-28 rounded-full object-cover shadow-2xl ring-4 ring-accent/30" />
                    ) : (
                      <div className="relative w-28 h-28 rounded-full bg-gradient-to-br from-accent to-indigo-600 text-white flex items-center justify-center font-bold text-3xl shadow-2xl ring-4 ring-accent/30">
                        {getInitials(partner?.username)}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 justify-center">
                    <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse" />
                    <span className="text-xs text-slate-400 font-bold tracking-widest uppercase">Connected P2P</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* --- COMMON CONTROL BAR (Active / Dialing) --- */}
        {callStatus !== 'ringing' && (
          <div className="w-full flex items-center justify-center gap-6 pt-4 border-t border-white/5 z-20">
            {callStatus === 'active' && (
              <>
                {/* Microphone toggle */}
                <button
                  onClick={toggleMic}
                  className={`w-12 h-12 rounded-full flex items-center justify-center transition-all cursor-pointer active:scale-95 ${
                    isMuted
                      ? 'bg-rose-550 text-white shadow-lg hover:bg-rose-600 shadow-rose-500/10'
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
                        ? 'bg-rose-550 text-white shadow-lg hover:bg-rose-600 shadow-rose-500/10'
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
                        ? 'bg-accent text-white shadow-lg shadow-accent/20'
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
              className="w-14 h-14 rounded-full bg-rose-600 hover:bg-rose-700 active:scale-95 text-white flex items-center justify-center shadow-lg hover:shadow-rose-600/25 transition-all cursor-pointer"
              title="Hang Up"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-2.824-1.47-5.112-3.758-6.58-6.58l1.293-.97c.362-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25z" className="origin-center rotate-[135deg]" />
              </svg>
            </button>
          </div>
        )}

      </div>
    </div>
  )
}
