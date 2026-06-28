import usePosts from "../hooks/usePosts"

function HomePage() {
  const { posts, loading, error } = usePosts()

  // Helper to format mock dates sequentially to match mockup (e.g. May 21, 2025, May 20, 2025...)
  const getMockDate = (id) => {
    const baseDate = new Date(2025, 4, 21) // May 21, 2025
    baseDate.setDate(baseDate.getDate() - ((id - 1) % 30))
    return baseDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] space-y-3">
        <div className="w-10 h-10 border-4 border-purple-200 dark:border-purple-900 border-t-purple-600 dark:border-t-purple-400 rounded-full animate-spin"></div>
        <p className="text-gray-400 text-sm">Loading recent posts...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500 font-medium">{error}</p>
      </div>
    )
  }

  // Display only the first 6 posts to match mockup scale
  const displayedPosts = posts.slice(0, 6)

  return (
    <div className="space-y-6">
      
      {/* Header section */}
      <div className="border-b border-[#f3f0f7] dark:border-gray-800 pb-6">
        <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 dark:text-gray-100 tracking-tight">Posts</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Your recent thoughts and ideas</p>
      </div>

      {/* Posts List */}
      <div className="flex flex-col gap-3.5 mt-6">
        {displayedPosts.map((post) => (
          <div 
            key={post.id} 
            className="bg-white dark:bg-gray-800 border border-[#f3f0f7] dark:border-gray-700 rounded-2xl px-6 py-4.5 shadow-[0_2px_10px_rgba(0,0,0,0.01)] hover:shadow-[0_8px_25px_rgba(124,58,237,0.05)] hover:border-purple-100 dark:hover:border-purple-900/50 transition-all duration-200 flex items-center justify-between group cursor-pointer"
          >
            <div className="flex items-center gap-4 min-w-0">
              {/* Document Icon */}
              <div className="p-3 bg-purple-50 dark:bg-purple-950/20 text-purple-600 dark:text-purple-400 rounded-xl flex-shrink-0 group-hover:scale-105 transition-transform duration-200">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5.586a1 1 0 0 1 .707.293l5.414 5.414a1 1 0 0 1 .293.707V19a2 2 0 0 1-2 2z" />
                </svg>
              </div>
              <span className="text-base font-bold text-gray-800 dark:text-gray-200 capitalize truncate group-hover:text-purple-700 dark:group-hover:text-purple-400 transition-colors">
                {post.title}
              </span>
            </div>
            <span className="text-sm font-semibold text-gray-400 dark:text-gray-500 whitespace-nowrap ml-4">
              {getMockDate(post.id)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default HomePage
