const BASE_URL = "https://motivational-spark-api.vercel.app/api"

export async function fetchQuote() {
  const response = await fetch(`${BASE_URL}/quotes/random`)
  if (!response.ok) throw new Error("Failed to fetch quote")
  return response.json()
}