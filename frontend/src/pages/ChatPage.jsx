import { useState, useEffect, useRef, useContext } from 'react'
import { useAuth } from '../context/AuthContext'
import ThemeContext from '../context/ThemeContext'
import { fetchContacts, fetchPartners, fetchMessages, sendMessage } from '../services/chatService'

function getInitials(name) {
  if (!name) return '?'
  return name.trim().charAt(0).toUpperCase()
}

function getAvatarBg(id) {
  const colors = [
    'bg-purple-600',
    'bg-blue-600',
    'bg-teal-600',
    'bg-emerald-600',
    'bg-rose-600',
    'bg-orange-600',
    'bg-cyan-600',
    'bg-indigo-600'
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
  const { currentUser, logout } = useAuth()
  const { theme, setTheme } = useContext(ThemeContext)

  const [activeTab, setActiveTab] = useState('chats') // 'chats' or 'contacts'
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

  // Force dark theme for the premium look matching mockup
  useEffect(() => {
    if (theme !== 'dark') {
      setTheme('dark')
    }
  }, [theme, setTheme])

  // Scroll to bottom helper
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  // Load initial contact and active chat list
  useEffect(() => {
    async function loadInitialData() {
      try {
        setError(null)
        const [contactsList, partnersList] = await Promise.all([
          fetchContacts(),
          fetchPartners()
        ])
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

  // Poll for message list and partner updates
  useEffect(() => {
    // 1. Message Polling (every 3 seconds when a partner is selected)
    if (selectedPartner) {
      const chatId = [currentUser.id, selectedPartner.id].sort().join('_')
      
      const pollMessages = async () => {
        try {
          const data = await fetchMessages(chatId)
          // Only update state if message length or latest content changed to avoid unnecessary re-renders
          if (data.length !== messages.length || (data.length > 0 && data[data.length - 1]._id !== messages[messages.length - 1]?._id)) {
            setMessages(data)
            setTimeout(scrollToBottom, 50)
          }
        } catch (err) {
          console.error('Error polling messages:', err)
        }
      }

      pollingRef.current = setInterval(pollMessages, 3000)
    }

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current)
      }
    }
  }, [selectedPartner, messages, currentUser.id])

  // 2. Sidebar Partners list Polling (every 10 seconds to update recent chat states/badges)
  useEffect(() => {
    const pollSidebar = async () => {
      try {
        const partnersList = await fetchPartners()
        setPartners(partnersList)
      } catch (err) {
        console.error('Error polling sidebar partners:', err)
      }
    }

    sidebarPollingRef.current = setInterval(pollSidebar, 10000)

    return () => {
      if (sidebarPollingRef.current) {
        clearInterval(sidebarPollingRef.current)
      }
    }
  }, [])

  // Select a partner to view messages
  const handleSelectPartner = async (partner) => {
    setSelectedPartner(partner)
    setLoadingMessages(true)
    setInputText('')

    try {
      const chatId = [currentUser.id, partner.id].sort().join('_')
      const messageHistory = await fetchMessages(chatId)
      setMessages(messageHistory)
      
      // Update partners list as well (e.g. clear notification badge)
      const updatedPartners = await fetchPartners()
      setPartners(updatedPartners)
      
      setTimeout(scrollToBottom, 100)
    } catch (err) {
      console.error('Error loading message history:', err)
    } finally {
      setLoadingMessages(false)
    }
  }

  // Send a message
  const handleSend = async (e) => {
    e.preventDefault()
    if (!inputText.trim() || !selectedPartner) return

    const tempText = inputText.trim()
    setInputText('') // clear input immediately for snappy UX

    try {
      const savedMsg = await sendMessage(selectedPartner.id, tempText)
      setMessages((prev) => [...prev, savedMsg])
      
      // Update sidebar partners to reflect latest message snippet
      const updatedPartners = await fetchPartners()
      setPartners(updatedPartners)
      
      setTimeout(scrollToBottom, 50)
    } catch (err) {
      console.error('Error sending message:', err)
      setError('Failed to send message. Please try again.')
    }
  }

  // Handle Log Out
  const handleLogout = async () => {
    if (confirm('Are you sure you want to log out?')) {
      await logout()
    }
  }

  return (
    <div className="flex h-screen w-full bg-[#0a0f18] text-[#e2e8f0] overflow-hidden font-sans">
      
      {/* ── SIDEBAR CONTAINER ── */}
      <div className={`w-full md:w-[350px] flex-shrink-0 flex flex-col bg-[#111926] border-r border-[#1e293b]/30 transition-all ${
        selectedPartner ? 'hidden md:flex' : 'flex'
      }`}>
        
        {/* Sidebar Header */}
        <div className="p-4 flex items-center justify-between border-b border-[#1e293b]/20">
          <div className="flex items-center gap-3">
            <div className="relative">
              {currentUser?.image ? (
                <img src={currentUser.image} alt={currentUser.username} className="w-10 h-10 rounded-full object-cover" />
              ) : (
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white shadow-md ${getAvatarBg(currentUser?.id)}`}>
                  {getInitials(currentUser?.username)}
                </div>
              )}
              <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-[#111926]"></span>
            </div>
            <div className="text-left">
              <h2 className="text-sm font-bold text-white truncate max-w-[150px]">{currentUser?.username}</h2>
              <p className="text-xs text-gray-400">Online</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Audio Indicator Icon */}
            <button className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors" title="Toggle Sound">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
              </svg>
            </button>
            {/* Logout Button */}
            <button onClick={handleLogout} className="p-1.5 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-950/20 transition-colors" title="Log Out">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>

        {/* Tab switcher: Chats & Contacts */}
        <div className="px-4 py-3 bg-[#111926]/40">
          <div className="flex bg-[#0a0f18] p-1 rounded-xl gap-1">
            <button
              onClick={() => setActiveTab('chats')}
              className={`flex-1 text-center py-2 text-xs font-semibold rounded-lg transition-all ${
                activeTab === 'chats'
                  ? 'bg-[#1e3240] text-[#14b8a6]'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800/30'
              }`}
            >
              Chats
            </button>
            <button
              onClick={() => setActiveTab('contacts')}
              className={`flex-1 text-center py-2 text-xs font-semibold rounded-lg transition-all ${
                activeTab === 'contacts'
                  ? 'bg-[#1e3240] text-[#14b8a6]'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800/30'
              }`}
            >
              Contacts
            </button>
          </div>
        </div>

        {/* List Content */}
        <div className="flex-1 overflow-y-auto px-2 space-y-1.5 py-2 scrollbar-thin scrollbar-thumb-gray-800">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-48 space-y-2">
              <div className="w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-xs text-gray-500">Loading...</p>
            </div>
          ) : error ? (
            <div className="p-4 text-center text-xs text-red-400 bg-red-950/20 rounded-xl m-2 border border-red-900/30">
              {error}
            </div>
          ) : activeTab === 'chats' ? (
            // Chats List
            partners.length === 0 ? (
              <div className="p-6 text-center text-xs text-gray-500">
                No active conversations yet.<br />Go to 'Contacts' to start chatting.
              </div>
            ) : (
              partners.map((partner) => {
                const isSelected = selectedPartner?.id === partner.id
                return (
                  <div
                    key={partner.id}
                    onClick={() => handleSelectPartner(partner)}
                    className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all duration-150 ${
                      isSelected
                        ? 'bg-[#1a2b44] text-white border border-[#14b8a6]/20'
                        : 'hover:bg-[#1a2333]/50 text-gray-300 hover:text-white'
                    }`}
                  >
                    <div className="relative flex-shrink-0">
                      {partner.image ? (
                        <img src={partner.image} alt={partner.username} className="w-10 h-10 rounded-full object-cover" />
                      ) : (
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${getAvatarBg(partner.id)}`}>
                          {getInitials(partner.username)}
                        </div>
                      )}
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-[#111926]"></span>
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold truncate">{partner.username}</span>
                        {partner.latestMessage && (
                          <span className="text-[10px] text-gray-500">
                            {formatTime(partner.latestMessage.createdAt)}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 truncate mt-0.5">
                        {partner.latestMessage ? partner.latestMessage.text : 'Start conversation'}
                      </p>
                    </div>
                  </div>
                )
              })
            )
          ) : (
            // Contacts List
            contacts.length === 0 ? (
              <div className="p-6 text-center text-xs text-gray-500">
                No users found.
              </div>
            ) : (
              contacts.map((contact) => {
                const isSelected = selectedPartner?.id === contact.id
                return (
                  <div
                    key={contact.id}
                    onClick={() => handleSelectPartner(contact)}
                    className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all duration-150 ${
                      isSelected
                        ? 'bg-[#1a2b44] text-white border border-[#14b8a6]/20'
                        : 'hover:bg-[#1a2333]/50 text-gray-300 hover:text-white'
                    }`}
                  >
                    <div className="relative flex-shrink-0">
                      {contact.image ? (
                        <img src={contact.image} alt={contact.username} className="w-10 h-10 rounded-full object-cover" />
                      ) : (
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${getAvatarBg(contact.id)}`}>
                          {getInitials(contact.username)}
                        </div>
                      )}
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-[#111926]"></span>
                    </div>
                    <div className="text-left flex-1 min-w-0">
                      <span className="text-sm font-semibold truncate block">{contact.username}</span>
                      <span className="text-[10px] text-gray-500 truncate block mt-0.5">{contact.email}</span>
                    </div>
                  </div>
                )
              })
            )
          )}
        </div>
      </div>

      {/* ── CHAT PANEL CONTAINER ── */}
      <div className={`flex-1 flex flex-col bg-[#0a0f18] h-full ${
        selectedPartner ? 'flex' : 'hidden md:flex'
      }`}>
        
        {selectedPartner ? (
          // Active Chat view
          <>
            {/* Chat header */}
            <div className="p-4 bg-[#111926]/50 border-b border-[#1e293b]/20 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {/* Back button on mobile */}
                <button
                  onClick={() => setSelectedPartner(null)}
                  className="md:hidden mr-1 p-1 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800/50"
                  title="Back to Chats"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                  </svg>
                </button>

                <div className="relative">
                  {selectedPartner.image ? (
                    <img src={selectedPartner.image} alt={selectedPartner.username} className="w-10 h-10 rounded-full object-cover" />
                  ) : (
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${getAvatarBg(selectedPartner.id)}`}>
                      {getInitials(selectedPartner.username)}
                    </div>
                  )}
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-[#0a0f18]"></span>
                </div>
                <div className="text-left">
                  <h3 className="text-sm font-bold text-white truncate max-w-[200px]">{selectedPartner.username}</h3>
                  <p className="text-xs text-[#14b8a6]">Online</p>
                </div>
              </div>
            </div>

            {/* Message feed */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5 scrollbar-thin scrollbar-thumb-gray-800 bg-[#0a0f18]/80">
              {loadingMessages ? (
                <div className="flex flex-col items-center justify-center h-full space-y-2">
                  <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-xs text-gray-400">Loading messages...</p>
                </div>
              ) : messages.length === 0 ? (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center p-6 bg-slate-900/30 rounded-2xl border border-slate-800/30 max-w-sm">
                    <p className="text-sm text-gray-400">No messages yet.</p>
                    <p className="text-xs text-gray-500 mt-1">Send a message below to start the conversation!</p>
                  </div>
                </div>
              ) : (
                messages.map((msg) => {
                  const isOwnMessage = msg.senderId === currentUser.id
                  return (
                    <div
                      key={msg._id || msg.id}
                      className={`flex flex-col ${isOwnMessage ? 'items-end' : 'items-start'}`}
                    >
                      <div className={`max-w-[75%] rounded-2xl px-4.5 py-3 shadow-[0_2px_8px_rgba(0,0,0,0.15)] ${
                        isOwnMessage
                          ? 'bg-[#0d9488] text-white rounded-tr-none'
                          : 'bg-[#1e293b] text-gray-100 rounded-tl-none'
                      }`}>
                        <p className="text-sm text-left break-all whitespace-pre-wrap leading-relaxed">
                          {msg.text}
                        </p>
                      </div>
                      <span className="text-[10px] text-gray-500 mt-1 px-1">
                        {formatTime(msg.createdAt)}
                      </span>
                    </div>
                  )
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input form */}
            <form onSubmit={handleSend} className="p-4 bg-[#111926]/40 border-t border-[#1e293b]/20 flex items-center gap-3">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Type your message..."
                className="flex-1 bg-[#162234] border border-[#1e293b]/80 focus:border-[#14b8a6] focus:outline-none text-sm text-gray-100 placeholder-gray-500 rounded-full px-5 py-3 transition-colors"
              />
              <button
                type="submit"
                disabled={!inputText.trim()}
                className={`w-11 h-11 rounded-full flex items-center justify-center text-white transition-all shadow-md active:scale-95 ${
                  inputText.trim()
                    ? 'bg-[#0d9488] hover:bg-[#115e59] cursor-pointer'
                    : 'bg-[#1e293b] text-gray-500 cursor-not-allowed'
                }`}
                title="Send message"
              >
                <svg className="w-5 h-5 transform rotate-90" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </form>
          </>
        ) : (
          // Selected Conversation state (Placeholder)
          <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[#0a0f18]">
            <div className="w-20 h-20 rounded-full bg-[#11252d] border border-[#14b8a6]/20 flex items-center justify-center shadow-[0_0_20px_rgba(20,184,166,0.1)] mb-6 animate-pulse">
              <svg className="w-10 h-10 text-[#14b8a6]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Select a conversation</h3>
            <p className="text-sm text-gray-400 max-w-sm text-center leading-relaxed">
              Choose a contact from the sidebar to start chatting or continue a previous conversation.
            </p>
          </div>
        )}
      </div>

    </div>
  )
}
