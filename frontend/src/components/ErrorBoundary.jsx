import { Component } from "react"

class ErrorBoundary extends Component {
  state = { hasError: false, isChunkError: false }

  static getDerivedStateFromError(error) {
    const isChunkError = 
      error.name === 'ChunkLoadError' || 
      /chunk|loading/i.test(error.message) || 
      /Failed to fetch dynamically imported module/i.test(error.message)
    return { hasError: true, isChunkError }
  }

  componentDidCatch(error, errorInfo) {
    console.error('[Error Boundary] Caught error:', error, errorInfo)
  }

  handleRetry = () => {
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      if (this.state.isChunkError) {
        return (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
            <svg className="w-12 h-12 text-purple-500 mb-4 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Page Offline</h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-2 max-w-sm">
              This page hasn't been cached yet and requires an active internet connection to load.
            </p>
            <button
              onClick={this.handleRetry}
              className="mt-6 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium shadow-sm transition-all active:scale-95 cursor-pointer"
            >
              Retry Connection
            </button>
          </div>
        )
      }

      return (
        <div className="text-center py-10">
          <p className="text-red-500 font-medium">Something went wrong.</p>
          <p className="text-gray-400 text-sm mt-1">Try refreshing the page.</p>
          <button
            onClick={this.handleRetry}
            className="mt-4 px-4 py-1.5 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 rounded-md text-xs font-medium cursor-pointer"
          >
            Refresh
          </button>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
