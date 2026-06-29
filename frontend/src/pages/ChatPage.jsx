import { useState, useEffect, useRef, useContext } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import ThemeContext from '../context/ThemeContext'
import { fetchContacts, fetchPartners, fetchMessages, sendMessage } from '../services/chatService'

// Play popup message dispatch sound using Web Audio API synthesis (pure offline solution)
function playPopSound() {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext
    if (!AudioContextClass) return
    const ctx = new AudioContextClass()
    
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    
    osc.type = 'sine'
    osc.frequency.setValueAtTime(450, ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(900, ctx.currentTime + 0.08)
    
    gain.gain.setValueAtTime(0.12, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1)
    
    osc.start()
    osc.stop(ctx.currentTime + 0.1)
  } catch (e) {
    // Fail silently if audio context is blocked by user interaction policies
  }
}

// Play notification receive sound using Web Audio API synthesis
function playIncomingSound() {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext
    if (!AudioContextClass) return
    const ctx = new AudioContextClass()
    
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    
    osc.type = 'sine'
    osc.frequency.setValueAtTime(600, ctx.currentTime)
    osc.frequency.setValueAtTime(500, ctx.currentTime + 0.06)
    osc.frequency.exponentialRampToValueAtTime(700, ctx.currentTime + 0.15)
    
    gain.gain.setValueAtTime(0.08, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.005, ctx.currentTime + 0.16)
    
    osc.start()
    osc.stop(ctx.currentTime + 0.16)
  } catch (e) {}
}

function getInitials(name) {
  if (!name) return '?'
  return name.trim().charAt(0).toUpperCase()
}

function getAvatarBg(id) {
  const colors = [
    'bg-purple-500',
    'bg-blue-500',
    'bg-teal-500',
    'bg-emerald-500',
    'bg-rose-500',
    'bg-orange-500',
    'bg-cyan-500',
    'bg-indigo-500'
  ]
  if (!id) return colors[0]
  let sum = 0
  for (let i = 0; i < id.length; i++) {
    sum += id.charCodeAt(i)
  }
  return colors[sum % colors.length]
}

function formatTime(isoString) {
  if (!isoString) return ''
  const date = new Date(isoString)
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}



export default function ChatPage() {
  const { currentUser } = useAuth()
  const { chatWallpaper, enterToSend, playSounds } = useContext(ThemeContext)
  const location = useLocation()
  
  const [activeTab, setActiveTab] = useState('chats') // 'chats' or 'contacts'
  const [filterTab, setFilterTab] = useState('all') // 'all', 'unread', 'groups'
  const [searchQuery, setSearchQuery] = useState('')
  
  const [contacts, setContacts] = useState([])
  const [partners, setPartners] = useState([])
  const [selectedPartner, setSelectedPartner] = useState(null)
  const [messages, setMessages] = useState([])
  const [inputText, setInputText] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [error, setError] = useState(null)

  const messagesEndRef = useRef(null)
  const pollingRef = useRef(null)
  const sidebarPollingRef = useRef(null)

  // Scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  // Handle active navigation tab from parent App layout shell
  useEffect(() => {
    if (location.state?.activeTab) {
      const parentTab = location.state.activeTab
      if (parentTab === 'chats' || parentTab === 'contacts') {
        setActiveTab(parentTab)
      }
    }
  }, [location.state?.activeTab])

  // Load initial data
  useEffect(() => {
    async function loadInitialData() {
      try {
        setError(null)
        const [contactsList, partnersList] = await Promise.all([
          fetchContacts(),
          fetchPartners()
        ])
        
        // Merge real data with mockup data to wow the user
        setContacts(contactsList)
        setPartners(partnersList)
      } catch (err) {
        console.error('Failed to load chat data:', err)
        setError(err.message || 'Error connecting to database')
      } finally {
        setLoading(false)
      }
    }
    loadInitialData()
  }, [])

  // Poll for messages (Only for real partners)
  useEffect(() => {
    if (selectedPartner && !selectedPartner.isMock) {
      const chatId = [currentUser.id, selectedPartner.id].sort().join('_')
      
      const pollMessages = async () => {
        try {
          const data = await fetchMessages(chatId)
          if (data.length !== messages.length || (data.length > 0 && data[data.length - 1]._id !== messages[messages.length - 1]?._id)) {
            setMessages(data)
            if (playSounds) playIncomingSound()
            setTimeout(scrollToBottom, 50)
          }
        } catch (err) {
          console.error('Error polling messages:', err)
        }
      }

      pollingRef.current = setInterval(pollMessages, 3000)
    }

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current)
    }
  }, [selectedPartner, messages.length, currentUser.id, playSounds])

  // Poll sidebar partners (Only real partners)
  useEffect(() => {
    const pollSidebar = async () => {
      try {
        const partnersList = await fetchPartners()
        setPartners(partnersList)
      } catch (err) {
        console.error('Error polling sidebar partners:', err)
      }
    }

    sidebarPollingRef.current = setInterval(pollSidebar, 12000)
    return () => {
      if (sidebarPollingRef.current) clearInterval(sidebarPollingRef.current)
    }
  }, [])

  // Select a partner
  const handleSelectPartner = async (partner) => {
    setSelectedPartner(partner)
    setLoadingMessages(true)
    setInputText('')

    try {
      const chatId = [currentUser.id, partner.id].sort().join('_')
      const messageHistory = await fetchMessages(chatId)
      setMessages(messageHistory)
      
      const updatedPartners = await fetchPartners()
      setPartners(updatedPartners)
      
      setTimeout(scrollToBottom, 80)
    } catch (err) {
      console.error('Error loading message history:', err)
    } finally {
      setLoadingMessages(false)
    }
  }

  // Send a message
  const handleSend = async (e) => {
    if (e) e.preventDefault()
    if (!inputText.trim() || !selectedPartner) return

    const textToSend = inputText.trim()
    setInputText('')

    // Play Pop sound if enabled
    if (playSounds) playPopSound()

    try {
      const savedMsg = await sendMessage(selectedPartner.id, textToSend)
      setMessages((prev) => [...prev, savedMsg])
      
      const updatedPartners = await fetchPartners()
      setPartners(updatedPartners)
      
      setTimeout(scrollToBottom, 50)
    } catch (err) {
      console.error('Error sending message:', err)
      setError('Failed to send message.')
    }
  }

  // Key press listener to trigger enter to send logic
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      if (enterToSend) {
        e.preventDefault()
        handleSend()
      }
    }
  }

  // Compile final merged lists
  const allPartners = partners
  
  // Filter and Search logic
  const getFilteredPartners = () => {
    let list = allPartners
    
    // 1. Search Query
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase()
      list = list.filter(p => p.username.toLowerCase().includes(query))
    }
    
    // 2. Tabs: unread / groups
    if (filterTab === 'unread') {
      list = list.filter(p => p.unreadCount > 0)
    } else if (filterTab === 'groups') {
      list = list.filter(p => p.isGroup)
    }
    
    return list
  }

  const getFilteredContacts = () => {
    let list = contacts
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase()
      list = list.filter(c => c.username.toLowerCase().includes(query) || c.email.toLowerCase().includes(query))
    }
    return list
  }

  const filteredPartners = getFilteredPartners()
  const filteredContacts = getFilteredContacts()

  return (
    <div className="flex h-full w-full bg-white dark:bg-gray-950 overflow-hidden font-sans">
      
      {/* ── 1. SIDEBAR COLUMN: CHATS & FILTER LIST ── */}
      <div className={`w-full md:w-[320px] flex-shrink-0 flex flex-col bg-white dark:bg-gray-900 border-r border-gray-150 dark:border-gray-800 transition-all h-full ${
        selectedPartner ? 'hidden md:flex' : 'flex'
      }`}>
        
        {/* Chats title row */}
        <div className="p-4 flex items-center justify-between select-none">
          <h2 className="text-xl font-extrabold text-gray-900 dark:text-white">
            Messages
          </h2>
        </div>



        {/* Sidebar Sections Tab bar */}
        <div className="px-4 pb-2.5 flex items-center gap-4 select-none text-xs font-semibold border-b border-gray-100 dark:border-gray-800/80 mb-2">
          <button
            onClick={() => setActiveTab('chats')}
            className={`pb-1.5 relative cursor-pointer font-extrabold transition-all text-xs ${
              activeTab === 'chats'
                ? 'text-accent border-b-2 border-accent'
                : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'
            }`}
          >
            Partners
          </button>
          <button
            onClick={() => setActiveTab('contacts')}
            className={`pb-1.5 relative cursor-pointer font-extrabold transition-all text-xs ${
              activeTab === 'contacts'
                ? 'text-accent border-b-2 border-accent'
                : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'
            }`}
          >
            Contacts
          </button>
        </div>

        {/* Sidebar scrolling items */}
        <div className="flex-1 overflow-y-auto px-2 space-y-1 py-1 scrollbar-thin select-none">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-48 space-y-2">
              <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin"></div>
              <p className="text-xs text-gray-400">Loading...</p>
            </div>
          ) : error ? (
            <div className="p-4 text-center text-xs text-red-500 bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-950/40 rounded-2xl m-2">
              {error}
            </div>
          ) : activeTab === 'chats' ? (
            filteredPartners.length === 0 ? (
              <div className="p-8 text-center text-xs text-gray-400 dark:text-gray-500 font-medium leading-relaxed">
                No active conversations.<br />Try changing filters or search query.
              </div>
            ) : (
              filteredPartners.map((partner) => {
                const isSelected = selectedPartner?.id === partner.id
                return (
                  <div
                    key={partner.id}
                    onClick={() => handleSelectPartner(partner)}
                    className={`flex items-center gap-3 p-3 rounded-2xl cursor-pointer transition-all duration-150 ${
                      isSelected
                        ? 'bg-indigo-50/70 dark:bg-gray-800 text-gray-900 dark:text-white border border-indigo-100/50 dark:border-gray-700/50'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-850/60 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    <div className="relative flex-shrink-0">
                      {partner.image ? (
                        <img src={partner.image} alt={partner.username} className="w-10 h-10 rounded-full object-cover bg-gray-100 border border-gray-200/50 dark:border-gray-800" />
                      ) : (
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white shadow-sm ${getAvatarBg(partner.id)}`}>
                          {partner.isGroup ? '👥' : getInitials(partner.username)}
                        </div>
                      )}
                      
                      {partner.status === 'Online' && (
                        <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white dark:border-gray-900"></span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0 text-left">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-gray-900 dark:text-white truncate max-w-[140px]">{partner.username}</span>
                        {partner.latestMessage && (
                          <span className="text-[10px] text-gray-400 font-medium select-none">
                            {partner.latestMessage.createdAt.includes('T') ? formatTime(partner.latestMessage.createdAt) : partner.latestMessage.createdAt}
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-center justify-between mt-0.5">
                        <p className={`text-xs truncate max-w-[170px] ${
                          partner.unreadCount > 0 ? 'text-gray-900 dark:text-white font-semibold' : 'text-gray-400 dark:text-gray-500'
                        }`}>
                          {partner.latestMessage ? partner.latestMessage.text : 'Start chatting'}
                        </p>
                        
                        {partner.unreadCount > 0 && (
                          <span className="flex-shrink-0 w-4.5 h-4.5 rounded-full bg-emerald-500 text-[10px] font-extrabold text-white flex items-center justify-center shadow-sm select-none">
                            {partner.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })
            )
          ) : (
            // Contacts Sidebar List
            filteredContacts.length === 0 ? (
              <div className="p-8 text-center text-xs text-gray-400 dark:text-gray-500 font-medium">
                No contacts found.
              </div>
            ) : (
              filteredContacts.map((contact) => {
                const isSelected = selectedPartner?.id === contact.id
                return (
                  <div
                    key={contact.id}
                    onClick={() => handleSelectPartner(contact)}
                    className={`flex items-center gap-3 p-3 rounded-2xl cursor-pointer transition-all duration-150 ${
                      isSelected
                        ? 'bg-indigo-50/70 dark:bg-gray-800 text-gray-900 dark:text-white border border-indigo-100/50 dark:border-gray-700/50'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-850/60 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    <div className="relative flex-shrink-0">
                      {contact.image ? (
                        <img src={contact.image} alt={contact.username} className="w-10 h-10 rounded-full object-cover bg-gray-100 border border-gray-200/50" />
                      ) : (
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${getAvatarBg(contact.id)}`}>
                          {getInitials(contact.username)}
                        </div>
                      )}
                    </div>
                    
                    <div className="text-left flex-1 min-w-0">
                      <span className="text-xs font-bold text-gray-900 dark:text-white truncate block">{contact.username}</span>
                      <span className="text-[10px] text-gray-400 dark:text-gray-500 truncate block mt-0.5">{contact.email}</span>
                    </div>
                  </div>
                )
              })
            )
          )}
        </div>
      </div>

      {/* ── 2. CENTRAL / RIGHT COLUMN: CHAT WINDOW PANE ── */}
      <div className={`flex-1 flex flex-col h-full bg-slate-50 dark:bg-[#0b0f17] overflow-hidden ${
        selectedPartner ? 'flex' : 'hidden md:flex'
      }`}>
        
        {selectedPartner ? (
          // ACTIVE CONVERSATION WINDOW
          <>
            {/* Header info */}
            <div className="h-[64px] px-6 bg-white dark:bg-gray-900 border-b border-gray-150 dark:border-gray-800 flex items-center justify-between flex-shrink-0 select-none z-10">
              <div className="flex items-center gap-3">
                {/* Back link on Mobile */}
                <button
                  onClick={() => setSelectedPartner(null)}
                  className="md:hidden mr-1 p-1.5 rounded-xl text-gray-400 hover:text-gray-800 hover:bg-gray-50 transition-colors cursor-pointer"
                  title="Back to Conversations"
                >
                  <svg className="w-5.5 h-5.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
                  </svg>
                </button>

                {/* Avatar with online bubble */}
                <div className="relative flex-shrink-0">
                  {selectedPartner.image ? (
                    <img src={selectedPartner.image} alt={selectedPartner.username} className="w-9.5 h-9.5 rounded-full object-cover border border-gray-100" />
                  ) : (
                    <div className={`w-9.5 h-9.5 rounded-full flex items-center justify-center font-bold text-white text-xs ${getAvatarBg(selectedPartner.id)}`}>
                      {selectedPartner.isGroup ? '👥' : getInitials(selectedPartner.username)}
                    </div>
                  )}
                  {selectedPartner.status === 'Online' && (
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white dark:border-gray-900"></span>
                  )}
                </div>

                <div className="text-left leading-tight">
                  <h3 className="text-xs font-bold text-gray-900 dark:text-white truncate max-w-[180px]">{selectedPartner.username}</h3>
                  <span className="text-[10px] text-emerald-500 dark:text-emerald-400 font-bold select-none">
                    {selectedPartner.status || 'Online'}
                  </span>
                </div>
              </div>


            </div>

            {/* MESSAGE FEED PANE (Wallpaper Applied) */}
            <div className={`flex-1 overflow-y-auto p-6 space-y-4 scrollbar-thin wallpaper-${chatWallpaper}`}>
              {loadingMessages ? (
                <div className="flex flex-col items-center justify-center h-full space-y-2">
                  <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-xs text-gray-400">Loading messages...</p>
                </div>
              ) : messages.length === 0 ? (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center p-6 bg-white/40 dark:bg-slate-900/30 backdrop-blur-sm rounded-3xl border border-gray-150 dark:border-slate-800/30 max-w-xs shadow-sm">
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">No messages yet.</p>
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">Send a message to begin talking bright!</p>
                  </div>
                </div>
              ) : (
                messages.map((msg) => {
                  const isOwnMessage = msg.senderId === currentUser.id || msg.senderId === 'me'
                  return (
                    <div
                      key={msg._id || msg.id}
                      className={`flex flex-col ${isOwnMessage ? 'items-end' : 'items-start'} animate-slide-in`}
                    >
                      {/* Group sender names indicator */}
                      {!isOwnMessage && selectedPartner.isGroup && msg.senderName && (
                        <span className="text-[10px] text-gray-400 font-bold mb-1 pl-1 select-none">
                          {msg.senderName}
                        </span>
                      )}

                      <div className={`max-w-[70%] rounded-2xl px-4 py-2.5 shadow-sm leading-relaxed text-sm ${
                        isOwnMessage
                          ? 'bg-gradient-to-br from-accent to-[var(--color-accent-hover)] text-white rounded-tr-none'
                          : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-tl-none border border-gray-150/40 dark:border-gray-700/50'
                      }`}>
                        <p className="text-left break-words whitespace-pre-wrap select-text">
                          {msg.text}
                        </p>
                      </div>

                      {/* Msg Details (time + ticks status) */}
                      <div className="flex items-center gap-1 mt-1 px-1 text-[10px] text-gray-400 dark:text-gray-500 font-semibold select-none">
                        <span>{formatTime(msg.createdAt)}</span>
                        {isOwnMessage && (
                          <span className="text-accent flex items-center font-bold">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                            </svg>
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* MESSAGE INPUT CONTAINER */}
            <div className="p-4 bg-white dark:bg-gray-900 border-t border-gray-150 dark:border-gray-800 flex-shrink-0 select-none z-10">
              <form 
                onSubmit={(e) => { e.preventDefault(); handleSend() }}
                className="flex items-center gap-3"
              >
                {/* Paperclip attachment icon button */}
                <button
                  type="button"
                  className="w-11 h-11 flex items-center justify-center rounded-2xl bg-gray-50 hover:bg-gray-100 dark:bg-gray-850 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600 dark:hover:text-white transition-all cursor-pointer border border-gray-150/50 dark:border-gray-800"
                  title="Add attachments"
                >
                  <svg className="w-5.5 h-5.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                </button>

                {/* Input block */}
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type your message..."
                  className="flex-1 bg-gray-50 dark:bg-gray-850 border border-gray-150 dark:border-gray-800 focus:border-accent focus:bg-white dark:focus:bg-gray-800 focus:outline-none text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 rounded-2xl px-5 py-3 transition-all select-text"
                />

                {/* Microphone / Voice note icon button */}
                <button
                  type="button"
                  className="w-11 h-11 flex items-center justify-center rounded-2xl bg-gray-50 hover:bg-gray-100 dark:bg-gray-850 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600 dark:hover:text-white transition-all cursor-pointer border border-gray-150/50 dark:border-gray-800"
                  title="Voice Message"
                >
                  <svg className="w-5.5 h-5.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" />
                  </svg>
                </button>

                {/* Send Button */}
                <button
                  type="submit"
                  disabled={!inputText.trim()}
                  className={`w-11 h-11 rounded-2xl flex items-center justify-center text-white transition-all shadow-md active:scale-95 ${
                    inputText.trim()
                      ? 'bg-accent hover:bg-accent/90 hover:shadow-lg cursor-pointer'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-300 dark:text-gray-600 cursor-not-allowed border border-gray-150/30 dark:border-gray-800/35'
                  }`}
                  title="Send Message"
                >
                  <svg className="w-5.5 h-5.5 transform rotate-90" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
                  </svg>
                </button>
              </form>
            </div>
          </>
        ) : (
          // EMPTY CHAT HOMEPAGE VIEW (Welcome to Yappy screen)
          <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-50 dark:bg-[#0b0f17] select-none">
            
            {/* Pulsing graphic wrapper */}
            <div className="w-24 h-24 rounded-[28px] bg-gradient-to-tr from-cyan-400 via-purple-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-100 dark:shadow-none mb-6 animate-pulse select-none">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 9.75a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375m-13.5 3.01c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.184-4.183a1.14 1.14 0 0 1 .778-.332 48.294 48.294 0 0 0 5.83-.498c1.585-.233 2.708-1.626 2.708-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />
              </svg>
            </div>

            <h3 className="text-2xl font-extrabold text-gray-900 dark:text-white mb-2 tracking-tight">
              Welcome to <span className="text-accent bg-accent/5 px-2.5 py-1 rounded-xl">ChatApp</span>
            </h3>
            
            <p className="text-xs text-gray-400 dark:text-gray-500 max-w-[260px] text-center leading-relaxed font-medium">
              Pick a conversation and let the tiny internet confetti begin.
            </p>

            {/* Flying plane line graphic */}
            <div className="mt-14 relative w-56 h-20">
              <svg className="w-full h-full text-gray-300 dark:text-gray-800" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 3" viewBox="0 0 200 80">
                <path d="M10,50 Q60,10 110,40 T180,20" />
                <polygon points="175,15 188,17 181,28" fill="currentColor" stroke="currentColor" strokeWidth="1" strokeDasharray="none" />
                <line x1="179" y1="21" x2="182" y2="25" stroke="currentColor" strokeWidth="1" strokeDasharray="none" />
              </svg>
            </div>
            
          </div>
        )}
      </div>

    </div>
  )
}
