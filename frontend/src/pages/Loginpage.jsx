import { useState } from "react"
import { useForm } from "react-hook-form"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import { authClient } from "../services/auth-client"

function LoginPage() {
  const [isSignup, setIsSignup] = useState(false)
  const [authError, setAuthError] = useState("")
  const { signup, login } = useAuth()
  const navigate = useNavigate()

  const { register, handleSubmit, reset, formState: { errors } } = useForm()

  async function onSubmit(data) {
    setAuthError("")
    try {
      if (isSignup) {
        await signup(data.email, data.username, data.password)
      } else {
        await login(data.email, data.password)
      }
      reset()
      navigate("/")
    } catch (err) {
      setAuthError(err.message)
    }
  }

  async function handleGoogleLogin() {
    try {
      await authClient.signIn.social({
        provider: "google",
        callbackURL: `${window.location.origin}/`
      })
    } catch (err) {
      setAuthError(err.message || "Failed to login with Google")
    }
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center">
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm p-8 w-full max-w-sm">

        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-1">
          {isSignup ? "Create account" : "Welcome back"}
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          {isSignup ? "Sign up to get started" : "Sign in to your account"}
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
            <input
              {...register("email", { 
                required: "Email is required",
                pattern: {
                  value: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]/,
                  message: "Invalid email address"
                }
              })}
              type="text"
              placeholder="Enter your email"
              className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 rounded-lg text-sm placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-400"
            />
            {errors.email && <p className="text-red-500 text-xs">{errors.email.message}</p>}
          </div>

          {isSignup && (
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Username</label>
              <input
                {...register("username", { required: "Username is required" })}
                type="text"
                placeholder="Enter your username"
                className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 rounded-lg text-sm placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-400"
              />
              {errors.username && <p className="text-red-500 text-xs">{errors.username.message}</p>}
            </div>
          )}

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Password</label>
            <input
              {...register("password", {
                required: "Password is required",
                minLength: { value: 8, message: "Password must be at least 8 characters" }
              })}
              type="password"
              placeholder="Enter your password"
              className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 rounded-lg text-sm placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-400"
            />
            {errors.password && <p className="text-red-500 text-xs">{errors.password.message}</p>}
          </div>

          {authError && <p className="text-red-500 text-xs">{authError}</p>}

          <button
            type="submit"
            className="bg-purple-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors mt-2 cursor-pointer"
          >
            {isSignup ? "Sign Up" : "Log In"}
          </button>
        </form>

        <div className="relative my-5">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200 dark:border-gray-700"></div>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white dark:bg-gray-800 px-2 text-gray-400 dark:text-gray-500">Or continue with</span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleGoogleLogin}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Google
        </button>

        <p className="text-xs text-center text-gray-500 dark:text-gray-400 mt-4">
          {isSignup ? "Already have an account?" : "Don't have an account?"}
          <button
            onClick={() => { setIsSignup(!isSignup); setAuthError(""); reset() }}
            className="text-purple-700 dark:text-purple-400 ml-1 hover:underline font-medium cursor-pointer"
          >
            {isSignup ? "Log in" : "Sign up"}
          </button>
        </p>

      </div>
    </div>
  )
}

export default LoginPage
