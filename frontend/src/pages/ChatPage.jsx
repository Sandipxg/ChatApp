import { useState, useEffect, useRef, useContext } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import ThemeContext from '../context/ThemeContext'
import { fetchContacts, fetchPartners, fetchMessages, createGroup, addMembers, removeMember, updateGroupRole, updateGroupDetails, leaveGroup } from '../services/chatService'
import { useSocket } from '../context/SocketContext'

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

function getSenderColor(id) {
  const colors = [
    'text-rose-500 dark:text-rose-450',
    'text-emerald-600 dark:text-emerald-400',
    'text-amber-600 dark:text-amber-400',
    'text-sky-500 dark:text-sky-400',
    'text-violet-500 dark:text-violet-400',
    'text-fuchsia-500 dark:text-fuchsia-400',
    'text-teal-600 dark:text-teal-400',
    'text-orange-500 dark:text-orange-400'
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
  const { socket, onlineUsers, typingStatus, sendMessageViaSocket, sendTypingStatus, markChatAsRead } = useSocket()
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

  // Group creation states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isCreatingGroup, setIsCreatingGroup] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')
  const [newGroupAvatar, setNewGroupAvatar] = useState('')
  const [selectedContactIds, setSelectedContactIds] = useState([])
  const [searchContactQuery, setSearchContactQuery] = useState('')

  // Custom Confirmation Modal state
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: null
  })
  
  // Group Details Drawer states
  const [isDetailsDrawerOpen, setIsDetailsDrawerOpen] = useState(false)
  const [isEditingDetails, setIsEditingDetails] = useState(false)
  const [editingName, setEditingName] = useState('')
  const [editingAvatar, setEditingAvatar] = useState('')
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false)
  const [selectedAddContactIds, setSelectedAddContactIds] = useState([])
  const [searchAddContactQuery, setSearchAddContactQuery] = useState('')

  const messagesEndRef = useRef(null)
  const typingTimeoutRef = useRef(null)

  // Group Creation Form submission
  const handleCreateGroupSubmit = async (e) => {
    e.preventDefault()
    if (!newGroupName.trim() || isCreatingGroup) return

    try {
      setIsCreatingGroup(true)
      const avatarUrl = newGroupAvatar.trim() || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(newGroupName.trim())}`
      const newGroup = await createGroup(newGroupName.trim(), selectedContactIds, avatarUrl)
      
      const updatedPartners = await fetchPartners()
      setPartners(updatedPartners)

      if (socket) {
        socket.emit('join_group_rooms', [newGroup._id])
      }

      const newGroupPartner = updatedPartners.find((p) => p.id === newGroup._id)
      if (newGroupPartner) {
        handleSelectPartner(newGroupPartner)
      }

      setIsCreateModalOpen(false)
      setNewGroupName('')
      setNewGroupAvatar('')
      setSelectedContactIds([])
    } catch (err) {
      console.error('Failed to create group:', err)
      setError(err.message || 'Failed to create group')
    } finally {
      setIsCreatingGroup(false)
    }
  }

  // Edit Group Details submission
  const handleEditDetailsSubmit = async (e) => {
    e.preventDefault()
    if (!editingName.trim() || !selectedPartner) return

    try {
      const updatedConvo = await updateGroupDetails(selectedPartner.id, editingName.trim(), editingAvatar.trim())
      
      setPartners((prev) =>
        prev.map((p) =>
          p.id === selectedPartner.id
            ? { ...p, username: updatedConvo.name, name: updatedConvo.name, image: updatedConvo.avatar }
            : p
        )
      )
      setSelectedPartner((prev) => ({
        ...prev,
        username: updatedConvo.name,
        name: updatedConvo.name,
        image: updatedConvo.avatar,
      }))
      setIsEditingDetails(false)
    } catch (err) {
      console.error('Failed to update group details:', err)
      setError(err.message || 'Failed to update group details')
    }
  }

  // Add Members submission
  const handleAddMembersSubmit = async (e) => {
    e.preventDefault()
    if (selectedAddContactIds.length === 0 || !selectedPartner) return

    try {
      const updatedConvo = await addMembers(selectedPartner.id, selectedAddContactIds)
      const updatedMembers = updatedConvo.members
      
      setPartners((prev) =>
        prev.map((p) =>
          p.id === selectedPartner.id
            ? { ...p, members: updatedMembers, email: `${updatedMembers.length} members` }
            : p
        )
      )
      setSelectedPartner((prev) => ({
        ...prev,
        members: updatedMembers,
        email: `${updatedMembers.length} members`,
      }))
      
      setIsAddMemberModalOpen(false)
      setSelectedAddContactIds([])
    } catch (err) {
      console.error('Failed to add members:', err)
      setError(err.message || 'Failed to add members')
    }
  }

  // Remove Member action
  const handleRemoveMember = async (memberId) => {
    if (!selectedPartner) return

    // Find member's name for confirm dialog
    const memberObj = (selectedPartner.members || []).find(
      (m) => m.userId === memberId || m.userId?.toString() === memberId
    )
    const memberName = memberObj?.username || memberObj?.name || 'this member'

    setConfirmDialog({
      isOpen: true,
      title: 'Remove Member',
      message: `Are you sure you want to remove ${memberName} from the group?`,
      onConfirm: async () => {
        try {
          const updatedConvo = await removeMember(selectedPartner.id, memberId)
          const updatedMembers = updatedConvo.members
          
          setPartners((prev) =>
            prev.map((p) =>
              p.id === selectedPartner.id
                ? { ...p, members: updatedMembers, email: `${updatedMembers.length} members` }
                : p
            )
          )
          setSelectedPartner((prev) => ({
            ...prev,
            members: updatedMembers,
            email: `${updatedMembers.length} members`,
          }))
        } catch (err) {
          console.error('Failed to remove member:', err)
          setError(err.message || 'Failed to remove member')
        }
      }
    })
  }

  // Update Group Role action
  const handleUpdateRole = async (memberId, newRole) => {
    if (!selectedPartner) return

    const actionText = newRole === 'admin' ? 'promote' : 'demote'
    
    // Find member's name for confirm dialog
    const memberObj = (selectedPartner.members || []).find(
      (m) => m.userId === memberId || m.userId?.toString() === memberId
    )
    const memberName = memberObj?.username || memberObj?.name || 'this member'

    setConfirmDialog({
      isOpen: true,
      title: `${newRole === 'admin' ? 'Promote' : 'Demote'} Member`,
      message: `Are you sure you want to ${actionText} ${memberName} to ${newRole}?`,
      onConfirm: async () => {
        try {
          const updatedConvo = await updateGroupRole(selectedPartner.id, memberId, newRole)
          const updatedMembers = updatedConvo.members
          
          setPartners((prev) =>
            prev.map((p) =>
              p.id === selectedPartner.id
                ? { ...p, members: updatedMembers }
                : p
            )
          )
          setSelectedPartner((prev) => ({
            ...prev,
            members: updatedMembers,
          }))
        } catch (err) {
          console.error('Failed to update group role:', err)
          setError(err.message || 'Failed to update group role')
        }
      }
    })
  }

  // Leave Group action
  const handleLeaveGroup = async () => {
    if (!selectedPartner) return

    if (selectedPartner.myRole === 'owner') {
      const otherMembers = (selectedPartner.members || []).filter((m) => m.userId !== currentUser.id && m.userId.toString() !== currentUser.id)
      if (otherMembers.length > 0) {
        alert('You must promote another member to owner before leaving.')
        return
      }
    }

    setConfirmDialog({
      isOpen: true,
      title: 'Leave Group',
      message: `Are you sure you want to leave "${selectedPartner.name || 'this group'}"?`,
      onConfirm: async () => {
        try {
          await leaveGroup(selectedPartner.id)
          
          setSelectedPartner(null)
          setIsDetailsDrawerOpen(false)
          const updatedPartners = await fetchPartners()
          setPartners(updatedPartners)
        } catch (err) {
          console.error('Failed to leave group:', err)
          setError(err.message || 'Failed to leave group')
        }
      }
    })
  }

  // Scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  // Custom Confirm Modal handlers
  const handleConfirmAction = async () => {
    if (confirmDialog.onConfirm) {
      await confirmDialog.onConfirm()
    }
    setConfirmDialog((prev) => ({ ...prev, isOpen: false, onConfirm: null }))
  }

  const handleCancelConfirm = () => {
    setConfirmDialog((prev) => ({ ...prev, isOpen: false, onConfirm: null }))
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

  // Debounce typing status broadcast when inputText changes
  useEffect(() => {
    if (!selectedPartner || !inputText.trim() || !socket) return

    sendTypingStatus(selectedPartner.id, true)

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }

    typingTimeoutRef.current = setTimeout(() => {
      sendTypingStatus(selectedPartner.id, false)
    }, 2000)

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
    }
  }, [inputText, selectedPartner, socket])

  // Listen for real-time messages and user presence status updates from WebSocket
  useEffect(() => {
    if (!socket) return

    const handleNewMessage = async (msg) => {
      if (selectedPartner) {
        const currentChatId = selectedPartner.chatId || [currentUser.id, selectedPartner.id].sort().join('_')
        if (msg.chatId === currentChatId) {
          setMessages((prev) => {
            if (prev.some((m) => (m._id || m.id) === (msg._id || msg.id))) return prev
            return [...prev, msg]
          })
          if (msg.senderId !== currentUser.id && playSounds) {
            playIncomingSound()
          }
          setTimeout(scrollToBottom, 50)

          try {
            if (msg.senderId !== currentUser.id) {
              markChatAsRead(currentChatId)
            }
          } catch (err) {
            console.error('Failed to mark message as read:', err)
          }
        }
      }

      try {
        const partnersList = await fetchPartners()
        setPartners(partnersList)
      } catch (err) {
        console.error('Error refreshing sidebar after new message:', err)
      }
    }

    const handleUserOnline = () => {
      fetchPartners().then(setPartners).catch(console.error)
    }

    const handleUserOffline = ({ userId, lastSeen }) => {
      setContacts((prev) =>
        prev.map((c) => (c.id === userId ? { ...c, lastSeen } : c))
      )
      setPartners((prev) =>
        prev.map((p) => (p.id === userId ? { ...p, lastSeen } : p))
      )
    }

    const handleMessagesDelivered = ({ chatId }) => {
      if (selectedPartner) {
        const currentChatId = selectedPartner.chatId || [currentUser.id, selectedPartner.id].sort().join('_')
        if (chatId === currentChatId) {
          setMessages((prev) =>
            prev.map((m) =>
              m.senderId === currentUser.id && m.status === 'sent'
                ? { ...m, status: 'delivered' }
                : m
            )
          )
        }
      }
    }

    const handleMessagesRead = ({ chatId }) => {
      if (selectedPartner) {
        const currentChatId = selectedPartner.chatId || [currentUser.id, selectedPartner.id].sort().join('_')
        if (chatId === currentChatId) {
          setMessages((prev) =>
            prev.map((m) =>
              m.senderId === currentUser.id && m.status !== 'read'
                ? { ...m, status: 'read' }
                : m
            )
          )
        }
      }
    }

    const handleGroupCreated = async ({ chatId }) => {
      try {
        const partnersList = await fetchPartners()
        setPartners(partnersList)
        socket.emit('join_group_rooms', [chatId])
      } catch (err) {
        console.error('Error handling group_created socket event:', err)
      }
    }

    const handleGroupAdded = async ({ chatId }) => {
      try {
        const partnersList = await fetchPartners()
        setPartners(partnersList)
        socket.emit('join_group_rooms', [chatId])
      } catch (err) {
        console.error('Error handling group_added socket event:', err)
      }
    }

    const handleGroupRemoved = async ({ chatId }) => {
      try {
        const partnersList = await fetchPartners()
        setPartners(partnersList)
        setSelectedPartner((prev) => {
          if (prev && prev.id === chatId) {
            return null
          }
          return prev
        })
      } catch (err) {
        console.error('Error handling group_removed socket event:', err)
      }
    }

    const handleGroupDetailsUpdated = async ({ chatId, name, avatar }) => {
      setPartners((prev) =>
        prev.map((p) => (p.id === chatId ? { ...p, username: name, name, image: avatar } : p))
      )
      setSelectedPartner((prev) => {
        if (prev && prev.id === chatId) {
          return { ...prev, username: name, name, image: avatar }
        }
        return prev
      })
    }

    const handleGroupMembersUpdated = async ({ chatId, members }) => {
      const memberInfo = members.find(m => m.userId.toString() === currentUser.id)
      const myRole = memberInfo ? memberInfo.role : 'member'

      setPartners((prev) =>
        prev.map((p) =>
          p.id === chatId
            ? {
                ...p,
                members,
                myRole,
                email: `${members.length} members`
              }
            : p
        )
      )
      setSelectedPartner((prev) => {
        if (prev && prev.id === chatId) {
          return {
            ...prev,
            members,
            myRole,
            email: `${members.length} members`
          }
        }
        return prev
      })
    }

    socket.on('new_message', handleNewMessage)
    socket.on('user_online', handleUserOnline)
    socket.on('user_offline', handleUserOffline)
    socket.on('messages_delivered', handleMessagesDelivered)
    socket.on('messages_read', handleMessagesRead)
    socket.on('group_created', handleGroupCreated)
    socket.on('group_added', handleGroupAdded)
    socket.on('group_removed', handleGroupRemoved)
    socket.on('group_details_updated', handleGroupDetailsUpdated)
    socket.on('group_members_updated', handleGroupMembersUpdated)

    return () => {
      socket.off('new_message', handleNewMessage)
      socket.off('user_online', handleUserOnline)
      socket.off('user_offline', handleUserOffline)
      socket.off('messages_delivered', handleMessagesDelivered)
      socket.off('messages_read', handleMessagesRead)
      socket.off('group_created', handleGroupCreated)
      socket.off('group_added', handleGroupAdded)
      socket.off('group_removed', handleGroupRemoved)
      socket.off('group_details_updated', handleGroupDetailsUpdated)
      socket.off('group_members_updated', handleGroupMembersUpdated)
    }
  }, [socket, selectedPartner, currentUser.id, playSounds, markChatAsRead])

  // Select a partner
  const handleSelectPartner = async (partner) => {
    setSelectedPartner(partner)
    setLoadingMessages(true)
    setInputText('')

    try {
      const chatId = partner.chatId || [currentUser.id, partner.id].sort().join('_')
      const messageHistory = await fetchMessages(chatId)
      setMessages(messageHistory)
      
      markChatAsRead(chatId)
      
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

    if (playSounds) playPopSound()

    sendTypingStatus(selectedPartner.id, false)
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }

    try {
      await sendMessageViaSocket(selectedPartner.id, textToSend)
      setTimeout(scrollToBottom, 50)
    } catch (err) {
      console.error('Error sending message via socket:', err)
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
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-extrabold text-text-title tracking-tight">Messages</h2>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-accent text-white rounded-full hover:bg-accent-hover active:scale-95 shadow-md shadow-accent/25 transition-all cursor-pointer"
              title="Create New Group"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              <span>New Group</span>
            </button>
          </div>
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
                const isOnline = onlineUsers.includes(partner.id)
                const isTyping = typingStatus[partner.id]
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
                      {!partner.isGroup && isOnline && (
                        <span className="absolute bottom-0 right-0 block h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-gray-900" title="Online" />
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
                          {isTyping ? (
                            <span className="text-accent font-bold">typing...</span>
                          ) : (
                            partner.latestMessage ? partner.latestMessage.text : 'Start a conversation'
                          )}
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
                const isOnline = onlineUsers.includes(contact.id)
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
                      {!contact.isGroup && isOnline && (
                        <span className="absolute bottom-0 right-0 block h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-gray-900" title="Online" />
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

                <div 
                  className={`flex items-center gap-4 flex-1 min-w-0 ${selectedPartner.isGroup ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}`}
                  onClick={() => {
                    if (selectedPartner.isGroup) {
                      setEditingName(selectedPartner.username || '')
                      setEditingAvatar(selectedPartner.image || '')
                      setIsDetailsDrawerOpen(!isDetailsDrawerOpen)
                    }
                  }}
                >
                  {/* Avatar */}
                  <div className="relative flex-shrink-0">
                    {selectedPartner.image ? (
                      <img src={selectedPartner.image} alt={selectedPartner.username} className="w-11 h-11 rounded-full object-cover ring-2 ring-border-app" />
                    ) : (
                      <div className={`w-11 h-11 rounded-full flex items-center justify-center font-bold text-white text-base ${getAvatarBg(selectedPartner.id)}`}>
                        {selectedPartner.isGroup ? '👥' : getInitials(selectedPartner.username)}
                      </div>
                    )}
                    {!selectedPartner.isGroup && onlineUsers.includes(selectedPartner.id) && (
                      <span className="absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-gray-900" title="Online" />
                    )}
                  </div>

                  <div className="text-left leading-tight flex-1 min-w-0">
                    <h3 className="text-base font-bold text-text-title truncate flex items-center gap-1.5">
                      <span>{selectedPartner.username}</span>
                      {selectedPartner.isGroup && (
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 11.517 1.282l-.517-.557zm0-5.625a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM12 18.75a7.5 7.5 0 100-15 7.5 7.5 0 000 15z" />
                        </svg>
                      )}
                    </h3>
                    <p className="text-xs text-text-body opacity-60 truncate mt-0.5">
                      {typingStatus[selectedPartner.id] ? (
                        <span className="text-accent font-semibold animate-pulse">typing...</span>
                      ) : selectedPartner.isGroup ? (
                        selectedPartner.email
                      ) : onlineUsers.includes(selectedPartner.id) ? (
                        'Online'
                      ) : selectedPartner.lastSeen ? (
                        `Last seen ${new Date(selectedPartner.lastSeen).toLocaleString()}`
                      ) : (
                        'Offline'
                      )}
                    </p>
                  </div>
                </div>

                {selectedPartner.isGroup && (
                  <button
                    onClick={() => {
                      setEditingName(selectedPartner.username || '')
                      setEditingAvatar(selectedPartner.image || '')
                      setIsDetailsDrawerOpen(!isDetailsDrawerOpen)
                    }}
                    className={`p-2 rounded-xl text-gray-400 hover:text-accent hover:bg-accent/8 dark:hover:bg-accent/10 transition-all cursor-pointer ${
                      isDetailsDrawerOpen ? 'text-accent bg-accent/8 dark:bg-accent/10' : ''
                    }`}
                    title="Group Details"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 11.517 1.282l-.517-.557zm0-5.625a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM12 18.75a7.5 7.5 0 100-15 7.5 7.5 0 000 15z" />
                    </svg>
                  </button>
                )}
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
                messages.map((msg, idx) => {
                  const isOwnMessage = msg.senderId === currentUser.id || msg.senderId === 'me'
                  
                  // Grouping logic (consecutive within 5 minutes)
                  const prevMsg = messages[idx - 1]
                  const isConsecutivePrev = prevMsg && 
                    (prevMsg.senderId === msg.senderId) && 
                    (new Date(msg.createdAt) - new Date(prevMsg.createdAt) < 5 * 60 * 1000)

                  // Resolve sender profile for avatar display
                  const senderProfile = !isOwnMessage 
                    ? contacts.find(c => c.id === msg.senderId || c.id === msg.senderId?.toString())
                    : null

                  if (msg.messageType === 'system') {
                    return (
                      <div
                        key={msg._id || msg.id}
                        className="self-center my-2 mx-auto bg-black/5 dark:bg-white/5 text-[11px] text-gray-500 dark:text-gray-400 px-3.5 py-1 rounded-full text-center max-w-[85%] select-none border border-gray-100/50 dark:border-slate-800/60 shadow-sm animate-bubble"
                      >
                        {msg.text}
                      </div>
                    )
                  }

                  return (
                    <div
                      key={msg._id || msg.id}
                      className={`flex items-start gap-2.5 max-w-[85%] ${
                        isOwnMessage ? 'self-end justify-end ml-auto' : 'self-start justify-start mr-auto'
                      } ${isConsecutivePrev ? 'mt-0.5' : 'mt-3'} animate-bubble`}
                    >
                      {/* Avatar column (only for incoming messages) */}
                      {!isOwnMessage && (
                        <div className="w-8 h-8 flex-shrink-0 flex items-center justify-center select-none">
                          {!isConsecutivePrev ? (
                            senderProfile?.image ? (
                              <img
                                src={senderProfile.image}
                                alt={senderProfile.username}
                                className="w-8 h-8 rounded-full object-cover shadow-sm border border-gray-100 dark:border-gray-800"
                              />
                            ) : (
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white text-[11px] shadow-sm ${getAvatarBg(msg.senderId)}`}>
                                {getInitials(senderProfile?.username || msg.senderName || 'U')}
                              </div>
                            )
                          ) : null}
                        </div>
                      )}

                      {/* Message Bubble */}
                      <div className={`rounded-2xl px-4 pt-2.5 pb-2 leading-relaxed text-sm relative max-w-full min-w-[70px] ${
                        isOwnMessage
                          ? 'bg-emerald-600 dark:bg-emerald-700 text-white bubble-own'
                          : 'bg-bg-card text-text-body border border-border-app shadow-sm'
                      } ${
                        isConsecutivePrev
                          ? (isOwnMessage ? 'rounded-tr-md' : 'rounded-tl-md')
                          : (isOwnMessage ? 'rounded-tr-none' : 'rounded-tl-none')
                      }`}>
                        {/* Sender name for group chats */}
                        {!isOwnMessage && selectedPartner.isGroup && !isConsecutivePrev && (
                          <div className={`text-[11px] font-extrabold mb-1 select-none text-left leading-none ${getSenderColor(msg.senderId)}`}>
                            {msg.senderName || 'Group Member'}
                          </div>
                        )}

                        {/* Message text with reserved padding for time */}
                        <p className="text-left break-words whitespace-pre-wrap select-text pb-3.5 pr-10">
                          {msg.text}
                        </p>

                        {/* Inline Time and status ticks on the bottom-right */}
                        <div className={`absolute bottom-1 right-2.5 flex items-center gap-0.5 text-[9px] select-none ${
                          isOwnMessage ? 'text-white/70' : 'text-gray-400 dark:text-gray-500'
                        }`}>
                          <span>{formatTime(msg.createdAt)}</span>
                          {isOwnMessage && (
                            <span className="flex items-center">
                              {msg.status === 'sent' ? (
                                <svg className="w-3.5 h-3.5 text-white/50" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                                </svg>
                              ) : msg.status === 'delivered' ? (
                                <div className="flex -space-x-1.5 items-center text-white/50">
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                                  </svg>
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                                  </svg>
                                </div>
                              ) : (
                                <div className="flex -space-x-1.5 items-center text-sky-350">
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                                  </svg>
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                                  </svg>
                                </div>
                              )}
                            </span>
                          )}
                        </div>
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

      {/* ── 3. GROUP DETAILS PANEL/DRAWER ── */}
      {selectedPartner && selectedPartner.isGroup && isDetailsDrawerOpen && (
        <div className="w-full md:w-[320px] lg:w-[360px] flex-shrink-0 flex flex-col bg-bg-sidebar border-l border-border-app transition-all h-full z-20 absolute md:relative right-0 top-0 shadow-2xl md:shadow-none animate-fade-in">
          {/* Header */}
          <div className="h-[72px] px-5 border-b border-border-app flex items-center justify-between select-none">
            <h3 className="text-base font-extrabold text-text-title">Group Details</h3>
            <button
              onClick={() => {
                setIsDetailsDrawerOpen(false)
                setIsEditingDetails(false)
              }}
              className="p-1.5 rounded-xl text-gray-400 hover:text-text-title hover:bg-bg-app transition-all cursor-pointer"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-6 scrollbar-thin select-none">
            {/* Group Profile Card */}
            <div className="flex flex-col items-center text-center space-y-3 pb-2">
              <div className="relative">
                {selectedPartner.image ? (
                  <img src={selectedPartner.image} alt={selectedPartner.username} className="w-20 h-20 rounded-full object-cover ring-4 ring-border-app shadow-md" />
                ) : (
                  <div className={`w-20 h-20 rounded-full flex items-center justify-center font-bold text-white text-3xl shadow-md ${getAvatarBg(selectedPartner.id)}`}>
                    👥
                  </div>
                )}
              </div>

              {!isEditingDetails ? (
                <>
                  <div className="space-y-1">
                    <h4 className="text-lg font-bold text-text-title leading-tight">{selectedPartner.username}</h4>
                    <p className="text-xs text-gray-400 font-medium">{selectedPartner.email}</p>
                  </div>
                  {(selectedPartner.myRole === 'owner' || selectedPartner.myRole === 'admin') && (
                    <button
                      onClick={() => {
                        setEditingName(selectedPartner.username)
                        setEditingAvatar(selectedPartner.image || '')
                        setIsEditingDetails(true)
                      }}
                      className="px-3 py-1.5 text-xs font-bold bg-bg-app border border-border-app text-text-body rounded-full hover:bg-bg-sidebar transition-all cursor-pointer inline-flex items-center gap-1.5"
                    >
                      <svg className="w-3.5 h-3.5 text-gray-450" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125" />
                      </svg>
                      <span>Edit Details</span>
                    </button>
                  )}
                </>
              ) : (
                <form onSubmit={handleEditDetailsSubmit} className="w-full space-y-3 bg-bg-app/50 p-4 border border-border-app rounded-2xl">
                  <div className="space-y-1 text-left">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Group Name</label>
                    <input
                      type="text"
                      required
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      placeholder="Group name"
                      className="w-full px-3 py-2 bg-bg-card border border-border-app rounded-xl text-xs text-text-title focus:outline-none focus:ring-1 focus:ring-accent select-text"
                    />
                  </div>
                  <div className="space-y-1 text-left">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Avatar URL</label>
                    <input
                      type="url"
                      value={editingAvatar}
                      onChange={(e) => setEditingAvatar(e.target.value)}
                      placeholder="https://example.com/image.jpg"
                      className="w-full px-3 py-2 bg-bg-card border border-border-app rounded-xl text-xs text-text-title focus:outline-none focus:ring-1 focus:ring-accent select-text"
                    />
                  </div>
                  <div className="flex gap-2 pt-1.5">
                    <button
                      type="button"
                      onClick={() => setIsEditingDetails(false)}
                      className="flex-1 py-1.5 border border-border-app text-xs font-bold rounded-lg hover:bg-bg-card transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={!editingName.trim()}
                      className="flex-1 py-1.5 bg-accent text-white text-xs font-bold rounded-lg hover:bg-accent-hover transition-colors cursor-pointer"
                    >
                      Save
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Members Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-450 dark:text-gray-400 uppercase tracking-wider">Members ({(selectedPartner.members || []).length})</span>
                {(selectedPartner.myRole === 'owner' || selectedPartner.myRole === 'admin') && (
                  <button
                    onClick={() => {
                      setIsAddMemberModalOpen(true)
                      setSelectedAddContactIds([])
                    }}
                    className="text-xs font-bold text-accent hover:text-accent-hover transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <span>+ Add Member</span>
                  </button>
                )}
              </div>

              {/* Members List */}
              <div className="space-y-2">
                {(selectedPartner.members || []).map((member) => {
                  const isMe = member.userId === currentUser.id || member.userId.toString() === currentUser.id
                  const profile = isMe 
                    ? currentUser 
                    : contacts.find(c => c.id === member.userId || c.id === member.userId?.toString())
                  
                  if (!profile) return null

                  const displayName = isMe ? `${profile.username} (You)` : profile.username
                  return (
                    <div key={member.userId} className="flex items-center justify-between p-2 rounded-2xl hover:bg-bg-app/40 transition-colors">
                      <div className="flex items-center gap-3 min-w-0">
                        {profile.image ? (
                          <img src={profile.image} alt={profile.username} className="w-8 h-8 rounded-full object-cover" />
                        ) : (
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white text-xs ${getAvatarBg(member.userId)}`}>
                            {getInitials(profile.username)}
                          </div>
                        )}
                        <div className="min-w-0 text-left">
                          <p className="text-xs font-bold text-text-title truncate">{displayName}</p>
                          <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full select-none mt-0.5 inline-block ${
                            member.role === 'owner' 
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400' 
                              : member.role === 'admin' 
                                ? 'bg-sky-100 text-sky-800 dark:bg-sky-950/40 dark:text-sky-400'
                                : 'bg-gray-100 text-gray-650 dark:bg-gray-800 dark:text-gray-400'
                          }`}>
                            {member.role}
                          </span>
                        </div>
                      </div>

                      {/* Member Actions Menu */}
                      {!isMe && (selectedPartner.myRole === 'owner' || selectedPartner.myRole === 'admin') && (
                        <div className="flex items-center gap-1.5">
                          {/* Role Management (Owners only) */}
                          {selectedPartner.myRole === 'owner' && member.role !== 'owner' && (
                            <button
                              onClick={() => handleUpdateRole(member.userId, member.role === 'admin' ? 'member' : 'admin')}
                              className="p-1 rounded-lg text-gray-400 hover:text-accent hover:bg-bg-app transition-colors cursor-pointer"
                              title={member.role === 'admin' ? 'Demote to Member' : 'Promote to Admin'}
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
                              </svg>
                            </button>
                          )}

                          {/* Remove Member button */}
                          {member.role !== 'owner' && (selectedPartner.myRole === 'owner' || (selectedPartner.myRole === 'admin' && member.role === 'member')) && (
                            <button
                              onClick={() => handleRemoveMember(member.userId)}
                              className="p-1 rounded-lg text-gray-400 hover:text-red-500 hover:bg-bg-app transition-colors cursor-pointer"
                              title="Remove from group"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M22 10.5h-6m-2.25-4.125a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0zM4 19.235v-.11a6.375 6.375 0 0 1 12.75 0v.109A12.318 12.318 0 0 1 10.374 21c-2.331 0-4.512-.645-6.374-1.766z" />
                              </svg>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Leave Group Action */}
            <div className="pt-4 border-t border-border-app">
              <button
                onClick={handleLeaveGroup}
                className="w-full py-3 bg-red-50 dark:bg-red-950/20 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-2xl text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0 3 3m-3-3h12.75" />
                </svg>
                <span>Leave Group</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ── CREATE GROUP MODAL ── */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 z-50 select-none animate-fade-in">
          <div className="bg-bg-card border border-border-app w-full max-w-md rounded-3xl overflow-hidden shadow-2xl animate-scale-up text-left">
            <div className="p-6 border-b border-border-app flex items-center justify-between">
              <h3 className="text-lg font-bold text-text-title">Create New Group</h3>
              <button
                onClick={() => {
                  setIsCreateModalOpen(false)
                  setNewGroupName('')
                  setNewGroupAvatar('')
                  setSelectedContactIds([])
                }}
                className="p-1.5 rounded-xl text-gray-400 hover:text-text-title hover:bg-bg-app transition-all cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleCreateGroupSubmit} className="flex flex-col h-[520px] max-h-[80vh]">
              <div className="p-6 space-y-4 flex-1 overflow-y-auto scrollbar-thin">
                {/* Group Details */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-450 dark:text-gray-400 uppercase tracking-wider">Group Name</label>
                  <input
                    type="text"
                    required
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    placeholder="Enter group name..."
                    className="w-full px-4 py-3 bg-bg-app border border-border-app rounded-2xl text-sm text-text-title placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent/40 transition-all select-text"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-450 dark:text-gray-400 uppercase tracking-wider">Group Avatar URL (Optional)</label>
                  <input
                    type="url"
                    value={newGroupAvatar}
                    onChange={(e) => setNewGroupAvatar(e.target.value)}
                    placeholder="https://example.com/avatar.jpg"
                    className="w-full px-4 py-3 bg-bg-app border border-border-app rounded-2xl text-sm text-text-title placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent/40 transition-all select-text"
                  />
                  <p className="text-[10px] text-gray-450 mt-1">If left blank, a high-quality initial-based avatar will be automatically generated.</p>
                </div>

                {/* Members Selection */}
                <div className="space-y-2 pt-2 flex-1 flex flex-col min-h-[220px]">
                  <label className="text-xs font-bold text-gray-450 dark:text-gray-400 uppercase tracking-wider">Select Members</label>
                  
                  {/* Contact search */}
                  <div className="relative">
                    <svg className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.602 10.602Z" />
                    </svg>
                    <input
                      type="text"
                      value={searchContactQuery}
                      onChange={(e) => setSearchContactQuery(e.target.value)}
                      placeholder="Search contacts..."
                      className="w-full pl-9 pr-4 py-2 bg-bg-app border border-border-app rounded-xl text-xs text-text-title placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-accent/20 transition-all select-text"
                    />
                  </div>

                  {/* Contacts List */}
                  <div className="flex-1 overflow-y-auto border border-border-app rounded-2xl p-1 bg-bg-app/50 max-h-[200px] scrollbar-thin">
                    {contacts.filter(c => 
                      c.username.toLowerCase().includes(searchContactQuery.toLowerCase()) || 
                      c.email.toLowerCase().includes(searchContactQuery.toLowerCase())
                    ).length === 0 ? (
                      <p className="text-center text-xs text-gray-400 py-6">No contacts found</p>
                    ) : (
                      contacts.filter(c => 
                        c.username.toLowerCase().includes(searchContactQuery.toLowerCase()) || 
                        c.email.toLowerCase().includes(searchContactQuery.toLowerCase())
                      ).map(contact => {
                        const isSelected = selectedContactIds.includes(contact.id)
                        return (
                          <div 
                            key={contact.id}
                            onClick={() => {
                              setSelectedContactIds(prev => 
                                isSelected ? prev.filter(id => id !== contact.id) : [...prev, contact.id]
                              )
                            }}
                            className="flex items-center justify-between p-2.5 rounded-xl hover:bg-bg-card transition-all cursor-pointer"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              {contact.image ? (
                                <img src={contact.image} alt={contact.username} className="w-8 h-8 rounded-full object-cover" />
                              ) : (
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white text-xs ${getAvatarBg(contact.id)}`}>
                                  {getInitials(contact.username)}
                                </div>
                              )}
                              <div className="min-w-0 text-left">
                                <p className="text-xs font-bold text-text-title truncate">{contact.username}</p>
                                <p className="text-[10px] text-gray-400 truncate mt-0.5">{contact.email}</p>
                              </div>
                            </div>
                            <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
                              isSelected ? 'bg-accent border-accent text-white shadow-sm' : 'border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800'
                            }`}>
                              {isSelected && (
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                                </svg>
                              )}
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-border-app bg-bg-app/20 flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreateModalOpen(false)
                    setNewGroupName('')
                    setNewGroupAvatar('')
                    setSelectedContactIds([])
                  }}
                  className="flex-1 px-4 py-3 border border-border-app rounded-2xl text-sm font-bold text-text-body hover:bg-bg-app active:scale-98 transition-all cursor-pointer text-center"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newGroupName.trim() || isCreatingGroup}
                  className="flex-1 px-4 py-3 bg-gradient-to-br from-accent to-indigo-600 text-white rounded-2xl text-sm font-bold shadow-lg shadow-accent/25 hover:shadow-accent/45 disabled:opacity-50 disabled:cursor-not-allowed active:scale-98 transition-all cursor-pointer text-center"
                >
                  {isCreatingGroup ? 'Creating...' : 'Create Group'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── ADD MEMBER MODAL ── */}
      {isAddMemberModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 z-50 select-none animate-fade-in">
          <div className="bg-bg-card border border-border-app w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl animate-scale-up text-left">
            <div className="p-5 border-b border-border-app flex items-center justify-between">
              <h3 className="text-sm font-bold text-text-title">Add Members to Group</h3>
              <button
                onClick={() => {
                  setIsAddMemberModalOpen(false)
                  setSelectedAddContactIds([])
                }}
                className="p-1 rounded-xl text-gray-400 hover:text-text-title hover:bg-bg-app transition-all cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleAddMembersSubmit} className="flex flex-col max-h-[70vh]">
              <div className="p-5 space-y-3 flex-1 overflow-y-auto scrollbar-thin">
                <div className="relative">
                  <svg className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.602 10.602Z" />
                  </svg>
                  <input
                    type="text"
                    value={searchAddContactQuery}
                    onChange={(e) => setSearchAddContactQuery(e.target.value)}
                    placeholder="Search contacts..."
                    className="w-full pl-9 pr-4 py-2 bg-bg-app border border-border-app rounded-xl text-xs text-text-title placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-accent/25 transition-all select-text"
                  />
                </div>

                <div className="overflow-y-auto border border-border-app rounded-xl p-1 bg-bg-app/50 max-h-[220px] scrollbar-thin">
                  {contacts.filter(c => {
                    const isAlreadyMember = (selectedPartner.members || []).some(m => m.userId === c.id || m.userId?.toString() === c.id)
                    const matchesSearch = c.username.toLowerCase().includes(searchAddContactQuery.toLowerCase()) || c.email.toLowerCase().includes(searchAddContactQuery.toLowerCase())
                    return !isAlreadyMember && matchesSearch
                  }).length === 0 ? (
                    <p className="text-center text-xs text-gray-455 py-6">All contacts are already in the group</p>
                  ) : (
                    contacts.filter(c => {
                      const isAlreadyMember = (selectedPartner.members || []).some(m => m.userId === c.id || m.userId?.toString() === c.id)
                      const matchesSearch = c.username.toLowerCase().includes(searchAddContactQuery.toLowerCase()) || c.email.toLowerCase().includes(searchAddContactQuery.toLowerCase())
                      return !isAlreadyMember && matchesSearch
                    }).map(contact => {
                      const isSelected = selectedAddContactIds.includes(contact.id)
                      return (
                        <div 
                          key={contact.id}
                          onClick={() => {
                            setSelectedAddContactIds(prev => 
                              isSelected ? prev.filter(id => id !== contact.id) : [...prev, contact.id]
                            )
                          }}
                          className="flex items-center justify-between p-2 rounded-lg hover:bg-bg-card transition-all cursor-pointer"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            {contact.image ? (
                              <img src={contact.image} alt={contact.username} className="w-7 h-7 rounded-full object-cover" />
                            ) : (
                              <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-white text-[10px] ${getAvatarBg(contact.id)}`}>
                                {getInitials(contact.username)}
                              </div>
                            )}
                            <div className="min-w-0 text-left">
                              <p className="text-xs font-bold text-text-title truncate">{contact.username}</p>
                            </div>
                          </div>
                          <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
                            isSelected ? 'bg-accent border-accent text-white shadow-sm' : 'border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800'
                          }`}>
                            {isSelected && (
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                              </svg>
                            )}
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>

              <div className="p-4 border-t border-border-app bg-bg-app/20 flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddMemberModalOpen(false)
                    setSelectedAddContactIds([])
                  }}
                  className="flex-1 py-2 border border-border-app rounded-xl text-xs font-bold text-text-body hover:bg-bg-app active:scale-98 transition-all cursor-pointer text-center"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={selectedAddContactIds.length === 0}
                  className="flex-1 py-2 bg-accent text-white rounded-xl text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed active:scale-98 transition-all cursor-pointer text-center"
                >
                  Add Members
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── CUSTOM CONFIRM MODAL ── */}
      {confirmDialog.isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 z-50 select-none animate-fade-in">
          <div className="bg-bg-card border border-border-app w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl animate-scale-up text-left">
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 dark:bg-amber-500/15 flex items-center justify-center text-amber-500 flex-shrink-0">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                  </svg>
                </div>
                <h3 className="text-base font-bold text-text-title">{confirmDialog.title}</h3>
              </div>
              <p className="text-xs text-text-body leading-relaxed">{confirmDialog.message}</p>
            </div>
            <div className="px-6 pb-6 pt-2 bg-bg-app/20 flex gap-3">
              <button
                type="button"
                onClick={handleCancelConfirm}
                className="flex-1 py-2.5 border border-border-app rounded-xl text-xs font-bold text-text-body hover:bg-bg-app active:scale-98 transition-all cursor-pointer text-center"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmAction}
                className="flex-1 py-2.5 bg-accent text-white rounded-xl text-xs font-bold shadow-md shadow-accent/25 hover:shadow-accent/45 active:scale-98 transition-all cursor-pointer text-center"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
