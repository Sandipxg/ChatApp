import { createContext, useContext, useState, useEffect, useRef } from 'react'
import { useSocket } from './SocketContext'
import { useAuth } from './AuthContext'

const CallContext = createContext(null)

// ICE configuration. Use Google free STUN server by default.
const RTC_CONFIG = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' }
  ]
}  // when our backend pings at this rtc urls , that urls sends us back our ip address 
// so our backend will use this public ip to send video/audio packets for constant connection streams . 

export function CallProvider({ children }) {
  const { socket, onlineUsers } = useSocket()
  const { currentUser } = useAuth()

  const [callStatus, setCallStatus] = useState('idle') // 'idle' | 'dialing' | 'ringing' | 'active' | 'busy'
  const [callType, setCallType] = useState('voice') // 'voice' | 'video'
  const [partner, setPartner] = useState(null) // { id, username, image }
  const [localStream, setLocalStream] = useState(null)
  const [remoteStream, setRemoteStream] = useState(null)
  const [isMuted, setIsMuted] = useState(false)
  const [isCameraOff, setIsCameraOff] = useState(false)
  const [isScreenSharing, setIsScreenSharing] = useState(false)

  const peerConnectionRef = useRef(null)
  const localStreamRef = useRef(null)
  const originalVideoTrackRef = useRef(null) // Track original video stream when screen sharing
  const audioContextRef = useRef(null)
  const ringtoneIntervalRef = useRef(null)
  const pendingCandidatesRef = useRef([])

  // Cleanup helper to fully reset peer connections and streams
  const cleanupCall = () => {
    // Stop local media tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop())
      localStreamRef.current = null
    }
    setLocalStream(null)
    setRemoteStream(null)

    // Close PeerConnection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.onicecandidate = null
      peerConnectionRef.current.ontrack = null
      peerConnectionRef.current.onconnectionstatechange = null
      peerConnectionRef.current.close()
      peerConnectionRef.current = null
    }

    // Stop ringtone/sound synthesizers
    stopSound()
    pendingCandidatesRef.current = []

    // Reset state variables
    setCallStatus('idle')
    setPartner(null)
    setIsMuted(false)
    setIsCameraOff(false)
    setIsScreenSharing(false)
    originalVideoTrackRef.current = null
  }

  // Ringtone synthesizer using Web Audio API
  const startSound = (soundType) => {
    stopSound()
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext
      if (!AudioContextClass) return

      const ctx = new AudioContextClass()
      audioContextRef.current = ctx

      const playPulsingTone = (freq1, freq2, duration, interval) => {
        const ring = () => {
          if (ctx.state === 'closed') return

          const osc1 = ctx.createOscillator()
          const osc2 = ctx.createOscillator()
          const gain = ctx.createGain()

          osc1.connect(gain)
          osc2.connect(gain)
          gain.connect(ctx.destination)

          osc1.frequency.setValueAtTime(freq1, ctx.currentTime)
          osc2.frequency.setValueAtTime(freq2, ctx.currentTime)

          gain.gain.setValueAtTime(0, ctx.currentTime)
          gain.gain.linearRampToValueAtTime(0.08, ctx.currentTime + 0.05)
          gain.gain.setValueAtTime(0.08, ctx.currentTime + duration - 0.05)
          gain.gain.linearRampToValueAtTime(0, ctx.currentTime + duration)

          osc1.start()
          osc2.start()
          osc1.stop(ctx.currentTime + duration)
          osc2.stop(ctx.currentTime + duration)
        }

        ring()
        ringtoneIntervalRef.current = setInterval(ring, interval)
      }

      if (soundType === 'ringing') {
        // Pulse standard US telephone ring (440Hz + 480Hz) playing 2s, pausing 2s
        playPulsingTone(440, 480, 2.0, 4000)
      } else if (soundType === 'dialing') {
        // Dial tone (350Hz + 440Hz) playing 1s, pausing 3s
        playPulsingTone(350, 440, 1.0, 4000)
      }
    } catch (e) {
      console.warn('Audio Context failed to initialize', e)
    }
  }

  const stopSound = () => {
    if (ringtoneIntervalRef.current) {
      clearInterval(ringtoneIntervalRef.current)
      ringtoneIntervalRef.current = null
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => { })
      audioContextRef.current = null
    }
  }

  // Socket event setup
  useEffect(() => {
    if (!socket || !currentUser) return

    const handleIncomingCall = async ({ from, fromName, offer, type }) => {
      // If user is already in a call, automatically reply with 'call_busy'
      if (callStatus !== 'idle') {
        socket.emit('call_busy', { to: from })
        return
      }

      setCallStatus('ringing')
      setCallType(type)
      setPartner({ id: from, username: fromName, image: null })
      pendingCandidatesRef.current = []

      // Store offer globally in ref to use when accepted
      socket.incomingOffer = offer

      // Start ringing sound
      startSound('ringing')
    };

    const handleCallAccepted = async ({ answer }) => {
      stopSound()
      if (peerConnectionRef.current && answer) {
        try {
          await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(answer))
          setCallStatus('active')

          // Flush any early candidate chunks received before remote description was set
          while (pendingCandidatesRef.current.length > 0) {
            const candidate = pendingCandidatesRef.current.shift()
            await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate))
          }
        } catch (err) {
          console.error('Failed to set remote answer description:', err)
          cleanupCall()
        }
      }
    }

    const handleCallRejected = () => {
      alert(`${partner?.username || 'User'} declined the call.`)
      cleanupCall()
    }

    const handleCallBusy = () => {
      alert(`${partner?.username || 'User'} is busy in another call.`)
      cleanupCall()
    }

    const handleIceCandidate = async ({ candidate }) => {
      if (peerConnectionRef.current && peerConnectionRef.current.remoteDescription) {
        try {
          await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate))
        } catch (err) {
          console.error('Error adding remote ICE candidate:', err)
        }
      } else {
        // Store ICE candidate temporarily if remote description isn't set yet
        pendingCandidatesRef.current.push(candidate)
      }
    }

    const handleEndCall = () => {
      cleanupCall()
    }

    socket.on('incoming_call', handleIncomingCall)
    socket.on('call_accepted', handleCallAccepted)
    socket.on('call_rejected', handleCallRejected)
    socket.on('call_busy', handleCallBusy)
    socket.on('ice_candidate', handleIceCandidate)
    socket.on('end_call', handleEndCall)

    return () => {
      socket.off('incoming_call', handleIncomingCall)
      socket.off('call_accepted', handleCallAccepted)
      socket.off('call_rejected', handleCallRejected)
      socket.off('call_busy', handleCallBusy)
      socket.off('ice_candidate', handleIceCandidate)
      socket.off('end_call', handleEndCall)
    }
  }, [socket, currentUser, callStatus, partner])

  // Setup Peer Connection
  const createPeerConnection = (targetUserId, stream) => {
    const pc = new RTCPeerConnection(RTC_CONFIG)
    peerConnectionRef.current = pc

    // Add local tracks to peer connection
    stream.getTracks().forEach(track => {
      pc.addTrack(track, stream)
    })

    // Listen for remote tracks
    pc.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        setRemoteStream(event.streams[0])
      }
    }

    // Listen for gathered local ICE candidates and send them to the peer
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('ice-candidate', {
          to: targetUserId,
          candidate: event.candidate
        })
      }
    }

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        cleanupCall()
      }
    }

    return pc
  }

  // API 1: Start call (Outgoing)
  const initiateCall = async (targetUser, type) => {
    if (!socket) return
    setCallStatus('dialing')
    setCallType(type)
    setPartner({ id: targetUser.id, username: targetUser.username, image: targetUser.image })

    startSound('dialing')

    try {
      // Capture mic / camera based on call type
      const constraints = {
        audio: true,
        video: type === 'video'
      }
      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      localStreamRef.current = stream
      setLocalStream(stream)

      // Initialize RTC Peer Connection
      const pc = createPeerConnection(targetUser.id, stream)

      // Create Offer SDP
      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)

      // Send offer to callee
      socket.emit('call_user', {
        to: targetUser.id,
        offer,
        type
      })
    } catch (err) {
      console.error('Error starting WebRTC media capture:', err)
      alert('Could not access camera/microphone. Please check permissions.')
      cleanupCall()
    }
  }

  // API 2: Accept incoming call
  const acceptIncomingCall = async () => {
    if (!socket || !partner) return
    stopSound()

    try {
      const constraints = {
        audio: true,
        video: callType === 'video'
      }
      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      localStreamRef.current = stream
      setLocalStream(stream)

      // Initialize RTC Peer Connection
      const pc = createPeerConnection(partner.id, stream)

      // Set the incoming Offer
      const offer = socket.incomingOffer
      await pc.setRemoteDescription(new RTCSessionDescription(offer))

      // Create Answer SDP
      const answer = await pc.createAnswer()
      await pc.setLocalDescription(answer)

      // Send answer back
      socket.emit('accept_call', {
        to: partner.id,
        answer
      })

      setCallStatus('active')

      // Flush early ICE candidates
      while (pendingCandidatesRef.current.length > 0) {
        const candidate = pendingCandidatesRef.current.shift()
        await pc.addIceCandidate(new RTCIceCandidate(candidate))
      }
    } catch (err) {
      console.error('Error accepting WebRTC call:', err)
      alert('Could not access camera/microphone.')
      declineIncomingCall()
    }
  }

  // API 3: Decline / reject incoming call
  const declineIncomingCall = () => {
    if (socket && partner) {
      socket.emit('reject_call', { to: partner.id })
    }
    cleanupCall()
  }

  // API 4: Hang up / terminate active call
  const endCurrentCall = () => {
    if (socket && partner) {
      socket.emit('end_call', { to: partner.id })
    }
    cleanupCall()
  }

  // API 5: Mute mic
  const toggleMic = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0]
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled
        setIsMuted(!audioTrack.enabled)
      }
    }
  }

  // API 6: Toggle camera
  const toggleCamera = () => {
    if (localStreamRef.current && callType === 'video') {
      const videoTrack = localStreamRef.current.getVideoTracks()[0]
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled
        setIsCameraOff(!videoTrack.enabled)
      }
    }
  }

  // API 7: Screen Share Toggle (Only valid in video calls)
  const toggleScreenShare = async () => {
    if (callType !== 'video' || !peerConnectionRef.current) return

    if (isScreenSharing) {
      // Restore original video track
      try {
        const sender = peerConnectionRef.current.getSenders().find(s => s.track && s.track.kind === 'video')
        if (sender && originalVideoTrackRef.current) {
          sender.replaceTrack(originalVideoTrackRef.current)

          // Stop current screen share track
          const currentTrack = localStreamRef.current.getVideoTracks()[0]
          if (currentTrack) currentTrack.stop()

          // Replace track in stream ref
          localStreamRef.current.removeTrack(currentTrack)
          localStreamRef.current.addTrack(originalVideoTrackRef.current)

          setIsScreenSharing(false)
          originalVideoTrackRef.current = null
        }
      } catch (err) {
        console.error('Failed to restore camera stream:', err)
      }
    } else {
      // Start screen sharing
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true })
        const screenTrack = screenStream.getVideoTracks()[0]

        const sender = peerConnectionRef.current.getSenders().find(s => s.track && s.track.kind === 'video')
        if (sender) {
          // Keep reference to camera track to restore later
          originalVideoTrackRef.current = localStreamRef.current.getVideoTracks()[0]

          sender.replaceTrack(screenTrack)

          // Update track in localStream ref so preview shifts
          localStreamRef.current.removeTrack(originalVideoTrackRef.current)
          localStreamRef.current.addTrack(screenTrack)

          // Listen for user stopping display share via browser native banner
          screenTrack.onended = () => {
            toggleScreenShare()
          }

          setIsScreenSharing(true)
        }
      } catch (err) {
        console.error('Error starting screen share:', err)
      }
    }
  }

  return (
    <CallContext.Provider
      value={{
        callStatus,
        callType,
        partner,
        localStream,
        remoteStream,
        isMuted,
        isCameraOff,
        isScreenSharing,
        initiateCall,
        acceptIncomingCall,
        declineIncomingCall,
        endCurrentCall,
        toggleMic,
        toggleCamera,
        toggleScreenShare
      }}
    >
      {children}
    </CallContext.Provider>
  )
}

export function useCall() {
  const context = useContext(CallContext)
  if (!context) {
    throw new Error('useCall must be used within a CallProvider')
  }
  return context
}
