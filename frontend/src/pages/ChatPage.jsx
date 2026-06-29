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
      <div className={`w-full md:w-[320px] flex-shrink-0 flex flex-col bg-bg-sidebar border-r border-border-app transition-all h-full ${
        selectedPartner ? 'hidden md:flex' : 'flex'
      }`}>
        
        {/* Chats title row + search */}
        <div className="px-4 pt-5 pb-3 space-y-3 select-none">
          <h2 className="text-2xl font-extrabold text-text-title tracking-tight">Messages</h2>
          <div className="relative">
            <svg className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.602 10.602Z" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search conversations..."
              className="w-full pl-10 pr-4 py-3 bg-bg-app border border-border-app rounded-full text-sm text-text-body placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent/40 focus:bg-bg-card transition-all select-text"
            />
          </div>
        </div>



        {/* Sidebar Sections Tab bar */}
        <div className="px-4 flex items-center gap-2 select-none border-b border-gray-100 dark:border-gray-800/80 mb-2">
          <button
            onClick={() => setActiveTab('chats')}
            className={`pb-3 px-2 relative cursor-pointer font-bold transition-all text-sm ${
              activeTab === 'chats'
                ? 'text-accent border-b-2 border-accent'
                : 'text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
          >
            Partners
          </button>
          <button
            onClick={() => setActiveTab('contacts')}
            className={`pb-3 px-2 relative cursor-pointer font-bold transition-all text-sm ${
              activeTab === 'contacts'
                ? 'text-accent border-b-2 border-accent'
                : 'text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
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
                    className={`flex items-center gap-3.5 p-3.5 rounded-3xl cursor-pointer transition-all duration-150 relative overflow-hidden ${
                      isSelected
                        ? 'bg-accent/8 dark:bg-accent/10 sidebar-item-active'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
                    }`}
                  >
                    <div className="relative flex-shrink-0">
                      {partner.image ? (
                        <img src={partner.image} alt={partner.username} className="w-12 h-12 rounded-full object-cover border-2 border-border-app shadow-sm" />
                      ) : (
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-white text-base shadow-sm ${getAvatarBg(partner.id)}`}>
                          {partner.isGroup ? '👥' : getInitials(partner.username)}
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0 text-left">
                      <div className="flex items-center justify-between">
                        <span className={`text-sm font-bold truncate max-w-[150px] ${isSelected ? 'text-accent' : 'text-text-title'}`}>{partner.username}</span>
                        {partner.latestMessage && (
                          <span className="text-[11px] text-gray-400 font-medium select-none flex-shrink-0 ml-1">
                            {partner.latestMessage.createdAt.includes('T') ? formatTime(partner.latestMessage.createdAt) : partner.latestMessage.createdAt}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <p className={`text-xs truncate max-w-[160px] ${
                          partner.unreadCount > 0 ? 'text-gray-700 dark:text-gray-200 font-semibold' : 'text-gray-400 dark:text-gray-500'
                        }`}>
                          {partner.latestMessage ? partner.latestMessage.text : 'Start a conversation'}
                        </p>
                        {partner.unreadCount > 0 && (
                          <span className="flex-shrink-0 min-w-[20px] h-5 px-1.5 rounded-full bg-accent text-[10px] font-extrabold text-white flex items-center justify-center shadow-sm select-none">
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
                    className={`flex items-center gap-3.5 p-3.5 rounded-3xl cursor-pointer transition-all duration-150 relative ${
                      isSelected
                        ? 'bg-accent/8 dark:bg-accent/10 sidebar-item-active'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
                    }`}
                  >
                    <div className="relative flex-shrink-0">
                      {contact.image ? (
                        <img src={contact.image} alt={contact.username} className="w-12 h-12 rounded-full object-cover border-2 border-border-app shadow-sm" />
                      ) : (
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-white text-base ${getAvatarBg(contact.id)}`}>
                          {getInitials(contact.username)}
                        </div>
                      )}
                    </div>
                    <div className="text-left flex-1 min-w-0">
                      <span className={`text-sm font-bold truncate block ${isSelected ? 'text-accent' : 'text-text-title'}`}>{contact.username}</span>
                      <span className="text-xs text-gray-400 dark:text-gray-500 truncate block mt-0.5">{contact.email}</span>
                    </div>
                  </div>
                )
              })
            )
          )}
        </div>
      </div>

      {/* ── 2. CENTRAL / RIGHT COLUMN: CHAT WINDOW PANE ── */}
      <div className={`flex-1 flex flex-col h-full bg-bg-app overflow-hidden ${
        selectedPartner ? 'flex' : 'hidden md:flex'
      }`}>
        
        {selectedPartner ? (
          // ACTIVE CONVERSATION WINDOW
          <>
            {/* Chat Window Header — glassmorphic */}
            <div className="h-[72px] px-6 glass border-b border-border-app flex items-center flex-shrink-0 select-none z-10">
              <div className="flex items-center gap-4 w-full">
                {/* Back link on Mobile */}
                <button
                  onClick={() => setSelectedPartner(null)}
                  className="md:hidden mr-1 p-2 rounded-2xl text-gray-400 hover:text-text-title hover:bg-bg-sidebar transition-colors cursor-pointer"
                  title="Back to Conversations"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
                  </svg>
                </button>

                {/* Avatar */}
                <div className="relative flex-shrink-0">
                  {selectedPartner.image ? (
                    <img src={selectedPartner.image} alt={selectedPartner.username} className="w-11 h-11 rounded-full object-cover ring-2 ring-border-app" />
                  ) : (
                    <div className={`w-11 h-11 rounded-full flex items-center justify-center font-bold text-white text-base ${getAvatarBg(selectedPartner.id)}`}>
                      {selectedPartner.isGroup ? '👥' : getInitials(selectedPartner.username)}
                    </div>
                  )}
                </div>

                <div className="text-left leading-tight flex-1 min-w-0">
                  <h3 className="text-base font-bold text-text-title truncate">{selectedPartner.username}</h3>
                  <p className="text-xs text-text-body opacity-60 truncate mt-0.5">{selectedPartner.email}</p>
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
                  <div className="text-center p-8 bg-white/50 dark:bg-slate-900/40 backdrop-blur-sm rounded-3xl border border-gray-200/40 dark:border-slate-800/30 max-w-xs shadow-sm">
                    <div className="w-12 h-12 rounded-2xl bg-accent/10 dark:bg-accent/15 flex items-center justify-center mx-auto mb-3">
                      <svg className="w-6 h-6 text-accent/60" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 9.75a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375m-13.5 3.01c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.184-4.183a1.14 1.14 0 0 1 .778-.332 48.294 48.294 0 0 0 5.83-.498c1.585-.233 2.708-1.626 2.708-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />
                      </svg>
                    </div>
                    <p className="text-sm font-bold text-gray-600 dark:text-gray-300">No messages yet</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5 leading-relaxed">Say hello and start the conversation!</p>
                  </div>
                </div>
              ) : (
                messages.map((msg) => {
                  const isOwnMessage = msg.senderId === currentUser.id || msg.senderId === 'me'
                  return (
                    <div
                      key={msg._id || msg.id}
                      className={`flex flex-col ${isOwnMessage ? 'items-end' : 'items-start'} animate-bubble`}
                    >
                      {/* Group sender names indicator */}
                      {!isOwnMessage && selectedPartner.isGroup && msg.senderName && (
                        <span className="text-[10px] text-gray-400 font-bold mb-1 pl-1 select-none">
                          {msg.senderName}
                        </span>
                      )}

                      <div className={`max-w-[70%] rounded-3xl px-5 py-3 leading-relaxed text-sm ${
                        isOwnMessage
                          ? 'bg-gradient-to-br from-accent to-indigo-600 text-white rounded-br-sm bubble-own'
                          : 'bg-bg-card text-text-body rounded-bl-sm border border-border-app shadow-sm'
                      }`}>
                        <p className="text-left break-words whitespace-pre-wrap select-text">
                          {msg.text}
                        </p>
                      </div>

                      {/* Msg Details (time + ticks status) */}
                      <div className="flex items-center gap-1 mt-1 px-1 text-xs text-gray-400 dark:text-gray-500 select-none">
                        <span>{formatTime(msg.createdAt)}</span>
                        {isOwnMessage && (
                          <span className="text-accent/80 flex items-center">
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

            {/* MESSAGE INPUT CONTAINER — floating pill */}
            <div className="px-4 py-4 md:px-6 bg-bg-card/90 border-t border-border-app flex-shrink-0 select-none z-10 backdrop-blur-sm">
              <form 
                onSubmit={(e) => { e.preventDefault(); handleSend() }}
                className="flex items-center gap-3"
              >
                {/* Input block */}
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type a message..."
                  className="flex-1 bg-bg-app border border-border-app focus:bg-bg-card focus:outline-none focus:ring-2 focus:ring-accent/20 text-sm text-text-title placeholder-gray-400 dark:placeholder-gray-500 rounded-full px-6 py-3.5 transition-all select-text"
                />

                {/* Send Button — accent glow */}
                <button
                  type="submit"
                  disabled={!inputText.trim()}
                  className={`w-12 h-12 rounded-full flex items-center justify-center text-white transition-all active:scale-95 flex-shrink-0 ${
                    inputText.trim()
                      ? 'bg-gradient-to-br from-accent to-indigo-600 shadow-lg shadow-accent/35 hover:shadow-accent/50 animate-glow cursor-pointer'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-300 dark:text-gray-600 cursor-not-allowed'
                  }`}
                  title="Send Message"
                >
                  <svg className="w-5 h-5 transform rotate-90" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
                  </svg>
                </button>
              </form>
            </div>
          </>
        ) : (
          // EMPTY CHAT HOMEPAGE VIEW
          <div className="flex-1 flex flex-col items-center justify-center p-8 bg-bg-app select-none">
            
            {/* Animated logo icon */}
            <div className="relative mb-8">
              <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-accent via-indigo-500 to-purple-600 flex items-center justify-center shadow-2xl shadow-accent/30">
                <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 9.75a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375m-13.5 3.01c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.184-4.183a1.14 1.14 0 0 1 .778-.332 48.294 48.294 0 0 0 5.83-.498c1.585-.233 2.708-1.626 2.708-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />
                </svg>
              </div>
              {/* Floating orbs */}
              <div className="absolute -top-2 -right-2 w-5 h-5 bg-emerald-400 rounded-full opacity-80 animate-bounce" style={{animationDelay: '0.1s'}}></div>
              <div className="absolute -bottom-1 -left-2 w-3 h-3 bg-pink-400 rounded-full opacity-70 animate-bounce" style={{animationDelay: '0.4s'}}></div>
            </div>

            <h3 className="text-2xl font-extrabold text-text-title mb-3 tracking-tight">
              Welcome to <span className="bg-gradient-to-r from-accent to-indigo-500 bg-clip-text text-transparent">ChatApp</span>
            </h3>
            
            <p className="text-sm text-gray-400 dark:text-gray-500 max-w-[240px] text-center leading-relaxed">
              Select a conversation from the sidebar to start messaging.
            </p>

            {/* Decorative dots */}
            <div className="flex items-center gap-2 mt-10">
              <div className="w-2 h-2 rounded-full bg-accent/40 animate-dot-1"></div>
              <div className="w-2 h-2 rounded-full bg-accent/40 animate-dot-2"></div>
              <div className="w-2 h-2 rounded-full bg-accent/40 animate-dot-3"></div>
            </div>
            
          </div>
        )}
      </div>

    </div>
  )
}
