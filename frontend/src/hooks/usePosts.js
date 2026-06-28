import { useEffect, useReducer } from "react"
import { fetchPosts } from "../services/postService"

const initialState = { posts: [], loading: true, error: null }

function reducer(state, action) {
  if (action.type === "FETCH_START")   return { ...state, loading: true }
  if (action.type === "FETCH_SUCCESS") return { ...state, loading: false, posts: action.payload }
  if (action.type === "FETCH_ERROR")   return { ...state, loading: false, error: action.payload }
  return state
}

function usePosts() {
  const [state, dispatch] = useReducer(reducer, initialState)

  useEffect(() => {
    async function load() {
      dispatch({ type: "FETCH_START" })
      try {
        const data = await fetchPosts()
        dispatch({ type: "FETCH_SUCCESS", payload: data })
      } catch {
        dispatch({ type: "FETCH_ERROR", payload: "Failed to fetch posts" })
      }
    }
    load()
  }, [])

  return state
}

export default usePosts
