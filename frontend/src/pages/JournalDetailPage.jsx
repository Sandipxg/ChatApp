import { useEffect, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { fetchJournal } from "../services/journalService"

function JournalDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [entry, setEntry] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchJournal(id)
      .then(setEntry)
      .catch(() => setEntry(null))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <p className="text-center text-gray-500 dark:text-gray-400 mt-10 animate-pulse">Loading...</p>

  if (!entry) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500 dark:text-gray-400 text-lg">Journal entry not found.</p>
        <button onClick={() => navigate("/journals")} className="mt-4 text-purple-700 dark:text-purple-400 hover:underline text-sm font-medium">
          ← Back to journals
        </button>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-6 py-8 shadow-sm">
      <button onClick={() => navigate("/journals")} className="text-sm text-purple-700 dark:text-purple-400 hover:underline mb-6 block font-medium">
        ← Back to journals
      </button>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">#{entry.id}</p>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">{entry.title}</h1>
    </div>
  )
}

export default JournalDetailPage
