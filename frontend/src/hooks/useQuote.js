import { useEffect, useState } from "react"
import { fetchQuote } from "../services/QuoteService"

function useQuote() {
  const [quote, setQuote] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function loadQuote() {
      try {
        const data = await fetchQuote()
        setQuote(data)
      } catch (err) {
        setError("Failed to load quote")
      } finally {
        setLoading(false)
      }
    }

    loadQuote()
  }, [])

  return { quote, loading, error }
}

export default useQuote
