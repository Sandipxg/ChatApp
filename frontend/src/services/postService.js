// Used by Homepage to show a public posts feed
const PLACEHOLDER_URL = "https://jsonplaceholder.typicode.com"

export async function fetchPosts() {
  const res = await fetch(`${PLACEHOLDER_URL}/posts`)
  if (!res.ok) throw new Error("Failed to fetch posts")
  return res.json()
}
