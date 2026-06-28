import { useNavigate } from "react-router-dom"

function JournalCard({ journal, deleteJournal, startEditing }) {
  const navigate = useNavigate()

  // Helper to parse dateStr (YYYY-MM-DD) into calendar parts
  const getCalendarDate = (dateStr) => {
    if (!dateStr) return { month: 'MAY', day: '21', year: '2025' }
    
    // Fallback manual parse if standard parsing fails for YYYY-MM-DD
    const parts = dateStr.split('-')
    if (parts.length === 3) {
      const year = parts[0]
      const monthIndex = parseInt(parts[1], 10) - 1
      const day = parseInt(parts[2], 10).toString()
      const months = ['MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC', 'JAN', 'FEB', 'MAR', 'APR']
      const formattedMonths = ['MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC', 'JAN', 'FEB', 'MAR', 'APR']
      
      // Let's use clean calendar display names
      const monthsNames = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']
      return {
        month: monthsNames[monthIndex] || 'MAY',
        day: day,
        year: year
      }
    }

    const date = new Date(dateStr)
    if (isNaN(date.getTime())) {
      return { month: 'MAY', day: '21', year: '2025' }
    }
    const monthsNames = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']
    return {
      month: monthsNames[date.getMonth()],
      day: date.getDate().toString(),
      year: date.getFullYear().toString()
    }
  }

  // Parse time from MongoDB ObjectId hex prefix (first 8 chars)
  const getFormattedTime = (id) => {
    if (id && /^[a-f\d]{24}$/i.test(id)) {
      const timestamp = parseInt(id.substring(0, 8), 16) * 1000
      return new Date(timestamp).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      })
    }
    return new Date().toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    })
  }

  const { month, day, year } = getCalendarDate(journal.date)
  const formattedTime = getFormattedTime(journal.id)
  const readTime = Math.max(1, Math.ceil(journal.title.split(' ').length / 200))

  return (
    <div className="bg-white dark:bg-gray-800 border border-[#f3f0f7] dark:border-gray-700 rounded-2xl p-3.5 sm:p-5 shadow-[0_2px_10px_rgba(0,0,0,0.01)] hover:shadow-[0_8px_30px_rgba(124,58,237,0.04)] hover:border-purple-100 dark:hover:border-purple-900/50 transition-all duration-200 flex items-center justify-between gap-3 sm:gap-5 group">
      
      {/* Left and Center side: Date Box and Details */}
      <div className="flex items-center gap-3 sm:gap-5 min-w-0">
        
        {/* Date Box (Calendar style) */}
        <div className="w-13 h-15 sm:w-16 sm:h-18 bg-purple-50/50 dark:bg-purple-950/20 border border-[#f1ecfc] dark:border-purple-900/40 rounded-xl flex flex-col items-center justify-center flex-shrink-0 select-none">
          <span className="text-[9px] sm:text-[10px] font-bold text-purple-500 dark:text-purple-400 tracking-wider uppercase">
            {month}
          </span>
          <span className="text-xl sm:text-2xl font-extrabold text-purple-700 dark:text-purple-300 leading-none my-0.5">
            {day}
          </span>
          <span className="text-[9px] sm:text-[10px] font-semibold text-purple-400 dark:text-purple-500">
            {year}
          </span>
        </div>

        {/* Entry Details */}
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-0.5 sm:mb-1">
            <h3 className="text-base sm:text-lg font-bold text-gray-800 dark:text-gray-100 capitalize truncate leading-tight">
              {journal.title}
            </h3>
            <span className="hidden sm:inline-block text-[11px] font-mono text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-900 px-2 py-0.5 rounded border border-[#f3f0f7] dark:border-gray-800 truncate">
              #{journal.id}
            </span>
          </div>
          
          <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500 font-medium">
            <span>{formattedTime}</span>
            <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-600"></span>
            <span>{readTime} min read</span>
          </div>
        </div>

      </div>

      {/* Right side: Action Buttons */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 justify-end">
        {/* View Action */}
        <button
          onClick={() => navigate(`/journals/${journal.id}`)}
          aria-label="View Entry"
          className="p-2 sm:p-2.5 rounded-xl border border-[#f3f0f7] dark:border-gray-700 text-gray-400 dark:text-gray-500 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/20 transition-all cursor-pointer"
        >
          <svg className="w-4 h-4 sm:w-4.5 sm:h-4.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
        </button>

        {/* Edit Action */}
        <button
          onClick={() => startEditing(journal)}
          aria-label="Edit Entry"
          className="p-2 sm:p-2.5 rounded-xl border border-[#f3f0f7] dark:border-gray-700 text-gray-400 dark:text-gray-500 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/20 transition-all cursor-pointer"
        >
          <svg className="w-4 h-4 sm:w-4.5 sm:h-4.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
        </button>

        {/* Delete Action */}
        <button
          onClick={() => deleteJournal(journal.id)}
          aria-label="Delete Entry"
          className="p-2 sm:p-2.5 rounded-xl border border-red-50 dark:border-red-950/30 text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all cursor-pointer"
        >
          <svg className="w-4 h-4 sm:w-4.5 sm:h-4.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>

    </div>
  )
}

export default JournalCard
