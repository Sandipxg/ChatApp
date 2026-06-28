import { useState, useEffect, useRef } from "react"

function JournalForm({ addJournal, editingJournal, updateJournal }) {
  const [title, setTitle] = useState("")
  const inputRef = useRef(null)

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }, [])

  useEffect(() => {
    if (editingJournal) {
      setTitle(editingJournal.title)
    } else {
      setTitle("")
    }
  }, [editingJournal])

  function handleSubmit(event) {
    event.preventDefault()
    if (title.trim() === "") {
      alert("Entry cannot be empty")
      return
    }
    if (editingJournal) {
      updateJournal({ ...editingJournal, title })
    } else {
      addJournal({ title })
    }
    setTitle("")
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-3 w-full">
      <input
        ref={inputRef}
        type="text"
        aria-label="Journal entry text"
        placeholder="What's on your mind today?"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        className="flex-1 px-5 py-3.5 bg-white dark:bg-gray-800 border border-[#e2def0] dark:border-gray-700 text-gray-900 dark:text-gray-100 rounded-2xl text-base placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent shadow-[0_2px_12px_rgba(0,0,0,0.015)] transition-all duration-200"
      />
      <button
        type="submit"
        className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3.5 rounded-2xl text-sm font-semibold flex items-center gap-2 shadow-[0_4px_14px_rgba(124,58,237,0.2)] hover:shadow-[0_6px_20px_rgba(124,58,237,0.25)] hover:scale-[1.01] active:scale-[0.99] transition-all duration-150 cursor-pointer whitespace-nowrap"
      >
        <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
        <span>{editingJournal ? "Update" : "Add"}</span>
      </button>
    </form>
  )
}

export default JournalForm
