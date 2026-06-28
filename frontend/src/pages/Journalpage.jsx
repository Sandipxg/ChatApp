import { useState, useEffect } from "react"
import JournalForm from "../components/JournalForm"
import JournalList from "../components/JournalList"
import ErrorBoundary from "../components/ErrorBoundary"
import { useAuth } from "../context/AuthContext"
import { fetchJournals, createJournal, updateJournal, deleteJournal } from "../services/journalService"

function JournalPage() {
  const { currentUser } = useAuth()
  const [journalList, setJournals] = useState([])
  const [editingJournal, setEditingJournal] = useState(null)
  const [searchText, setSearchText] = useState("")
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchJournals()
      .then(setJournals)
      .catch(err => setError(err.message))
  }, [])

  useEffect(() => {
    const handleServiceWorkerMessage = (event) => {
      if (event.data && event.data.type === 'SYNC_COMPLETE') {
        console.log('[Journal Page] Background sync complete. Refreshing entries...')
        const { idMap } = event.data
        if (idMap && Object.keys(idMap).length > 0) {
          setJournals(prev => prev.map(j => {
            if (idMap[j.id]) {
              return { ...j, id: idMap[j.id] }
            }
            return j
          }))
          setEditingJournal(prev => {
            if (prev && idMap[prev.id]) {
              return { ...prev, id: idMap[prev.id] }
            }
            return prev
          })
        }
        fetchJournals()
          .then(setJournals)
          .catch(err => setError(err.message))
      }
    }

    const handleOnline = () => {
      console.log('[Journal Page] Online status detected. Triggering manual sync fallback...')
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({ type: 'TRIGGER_SYNC' })
      }
    }

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage)
    }
    window.addEventListener('online', handleOnline)

    // Trigger sync on initial mount just in case there are leftover actions
    if (navigator.onLine && 'serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: 'TRIGGER_SYNC' })
    }

    return () => {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage)
      }
      window.removeEventListener('online', handleOnline)
    }
  }, [])


  async function addJournal(newEntry) {
    try {
      const created = await createJournal(newEntry.title)
      setJournals(prev => [...prev, created])
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleDelete(id) {
    try {
      await deleteJournal(id)
      setJournals(prev => prev.filter(j => j.id !== id))
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleUpdate(updatedJournal) {
    try {
      const saved = await updateJournal(updatedJournal.id, { title: updatedJournal.title })
      setJournals(prev => prev.map(j => j.id === saved.id ? saved : j))
      setEditingJournal(null)
    } catch (err) {
      setError(err.message)
    }
  }

  const filtered = journalList.filter(j =>
    j.title.toLowerCase().includes(searchText.toLowerCase())
  )

  return (
    <div className="space-y-6">
      
      {/* Header Section */}
      <div className="border-b border-[#f3f0f7] dark:border-gray-800 pb-5">
        <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 dark:text-gray-100 tracking-tight">
          My Journals
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Write, reflect and grow every day
        </p>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 rounded-2xl p-4 text-sm font-medium">
          {error}
        </div>
      )}

      {/* Add Journal Form */}
      <div className="bg-white/40 dark:bg-gray-800/20 p-1.5 rounded-2xl">
        <JournalForm
          addJournal={addJournal}
          editingJournal={editingJournal}
          updateJournal={handleUpdate}
        />
      </div>

      {/* Search and Filters group */}
      <div className="flex gap-3 w-full mt-4">
        {/* Search Input with search icon */}
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </div>
          <input
            type="text"
            aria-label="Search journals"
            placeholder="Search journals..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-white dark:bg-gray-800 border border-[#e2def0] dark:border-gray-700 rounded-2xl text-base text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition-all shadow-[0_2px_12px_rgba(0,0,0,0.015)]"
          />
        </div>

        {/* Filter Dropdown */}
        <div className="relative shrink-0">
          <div className="flex items-center gap-2 px-4 py-3 bg-white dark:bg-gray-800 border border-[#e2def0] dark:border-gray-700 rounded-2xl text-sm font-bold text-gray-600 dark:text-gray-300 shadow-[0_2px_12px_rgba(0,0,0,0.015)] select-none">
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
            </svg>
            <span className="hidden sm:inline">All journals</span>
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>
        </div>
      </div>

      {/* List of Entries */}
      <div className="mt-4 flex-1">
        <ErrorBoundary>
          <JournalList
            journals={filtered}
            deleteJournal={handleDelete}
            startEditing={setEditingJournal}
          />
        </ErrorBoundary>
      </div>



    </div>
  )
}

export default JournalPage
