import { useState } from "react"
import { useForm } from "react-hook-form"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import { authClient } from "../services/auth-client"

// Custom SVG Logo for Yappy
function YappyLogo({ className = "w-12 h-12" }) {
  return (
    <div className={`rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-lg ${className}`}>
      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 9.75a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375m-13.5 3.01c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.184-4.183a1.14 1.14 0 0 1 .778-.332 48.294 48.294 0 0 0 5.83-.498c1.585-.233 2.708-1.626 2.708-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />
      </svg>
    </div>
  )
}

function LoginPage() {
  const [isSignup, setIsSignup] = useState(false)
  const [authError, setAuthError] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [agreeTerms, setAgreeTerms] = useState(false)
  const { signup, login } = useAuth()
  const navigate = useNavigate()

  const { register, handleSubmit, reset, formState: { errors } } = useForm()

  async function onSubmit(data) {
    setAuthError("")
    
    if (isSignup) {
      if (data.password !== data.confirmPassword) {
        setAuthError("Passwords do not match")
        return
      }
      if (!agreeTerms) {
        setAuthError("You must agree to the Terms & Privacy Policy")
        return
      }

      // Generate a unique username from the Full Name
      const sanitizedName = data.fullName.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')
      const randomId = Math.floor(1000 + Math.random() * 9000)
      const generatedUsername = `${sanitizedName}_${randomId}`

      try {
        await signup(data.email, generatedUsername, data.password, data.fullName)
        reset()
        navigate("/")
      } catch (err) {
        setAuthError(err.message)
      }
    } else {
      try {
        await login(data.email, data.password)
        reset()
        navigate("/")
      } catch (err) {
        setAuthError(err.message)
      }
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

  async function handleGithubLogin() {
    try {
      await authClient.signIn.social({
        provider: "github",
        callbackURL: `${window.location.origin}/`
      })
    } catch (err) {
      setAuthError(err.message || "Failed to login with GitHub")
    }
  }

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-6 px-4 select-none font-sans">
      <div className="bg-white dark:bg-gray-900 border border-gray-150 dark:border-gray-800 shadow-[0_20px_50px_rgba(0,0,0,0.06)] rounded-[32px] overflow-hidden max-w-4xl w-full grid grid-cols-1 md:grid-cols-12 min-h-[580px] animate-slide-in">
        
        {/* ── LEFT PANEL: YAPPY BRANDING ── */}
        <div className="md:col-span-5 bg-gradient-to-br from-cyan-400 via-purple-500 to-indigo-600 p-8 text-white flex flex-col justify-between relative overflow-hidden">
          {/* Subtle Decorative Background shapes */}
          <div className="absolute top-[-10%] right-[-10%] w-48 h-48 bg-white/10 rounded-full blur-2xl"></div>
          <div className="absolute bottom-[-10%] left-[-10%] w-60 h-60 bg-white/10 rounded-full blur-3xl"></div>
          
          {/* Diamonds glowing decoration */}
          <div className="absolute top-1/4 right-8 w-3 h-3 bg-white/20 transform rotate-45 animate-pulse"></div>
          <div className="absolute bottom-1/3 left-10 w-2.5 h-2.5 bg-white/25 transform rotate-45"></div>
          <div className="absolute top-1/2 left-6 w-2 h-2 bg-white/30 transform rotate-45 animate-pulse delay-700"></div>

          {/* Logo & Brand text */}
          <div className="z-10 text-left">
            <YappyLogo className="mb-4" />
            <h2 className="text-3xl font-extrabold tracking-tight">ChatApp</h2>
            <p className="text-white/80 text-sm mt-1.5 font-medium">Talk bright. Connect instantly.</p>
          </div>

          {/* Paper Airplane Drawing illustration */}
          <div className="z-10 mt-16 md:mt-0 relative h-32 flex items-end">
            <svg className="w-full h-24 text-white/40" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 3" viewBox="0 0 200 80">
              <path d="M10,65 Q70,25 130,45 Q160,55 180,30" />
              {/* Paper airplane element */}
              <polygon points="175,25 188,27 181,38" fill="white" stroke="white" strokeWidth="1" strokeDasharray="none" />
              <line x1="179" y1="31" x2="182" y2="35" stroke="white" strokeWidth="1" strokeDasharray="none" />
            </svg>
          </div>
        </div>

        {/* ── RIGHT PANEL: FORM CONTENT ── */}
        <div className="md:col-span-7 p-8 sm:p-10 md:p-12 flex flex-col justify-center bg-white dark:bg-gray-900">
          
          <div className="mb-6 text-left">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
              {isSignup ? "Create your account 🚀" : "Welcome back 👋"}
            </h1>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1.5">
              {isSignup ? "Join ChatApp and start chatting" : "Login to continue your conversations"}
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4.5">
            
            {/* Full Name input (Signup only) */}
            {isSignup && (
              <div className="flex flex-col gap-1.5 text-left">
                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Full name</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-400 pointer-events-none">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                    </svg>
                  </span>
                  <input
                    {...register("fullName", { required: "Full name is required" })}
                    type="text"
                    placeholder="Enter your name"
                    className="w-full pl-11 pr-4 py-3 bg-gray-50 dark:bg-gray-800/50 border border-gray-150 dark:border-gray-800 text-gray-900 dark:text-white rounded-2xl text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-accent focus:bg-white dark:focus:bg-gray-800 transition-all"
                  />
                </div>
                {errors.fullName && <p className="text-red-500 text-xs mt-0.5">{errors.fullName.message}</p>}
              </div>
            )}

            {/* Email Address input */}
            <div className="flex flex-col gap-1.5 text-left">
              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Email address</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-400 pointer-events-none">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
                  </svg>
                </span>
                <input
                  {...register("email", { 
                    required: "Email is required",
                    pattern: {
                      value: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]/,
                      message: "Invalid email address"
                    }
                  })}
                  type="text"
                  placeholder="Enter email address"
                  className="w-full pl-11 pr-4 py-3 bg-gray-50 dark:bg-gray-800/50 border border-gray-150 dark:border-gray-800 text-gray-900 dark:text-white rounded-2xl text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-accent focus:bg-white dark:focus:bg-gray-800 transition-all"
                />
              </div>
              {errors.email && <p className="text-red-500 text-xs mt-0.5">{errors.email.message}</p>}
            </div>

            {/* Password input */}
            <div className="flex flex-col gap-1.5 text-left">
              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Password</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-400 pointer-events-none">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0V10.5m-2.852 0a1.5 1.5 0 0 0-1.488 1.482l-.099 7.04A1.5 1.5 0 0 0 2.5 20.5h19a1.5 1.5 0 0 0 1.487-1.478l-.099-7.04a1.5 1.5 0 0 0-1.488-1.482H3.75Z" />
                  </svg>
                </span>
                <input
                  {...register("password", {
                    required: "Password is required",
                    minLength: { value: 8, message: "Password must be at least 8 characters" }
                  })}
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter password"
                  className="w-full pl-11 pr-11 py-3 bg-gray-50 dark:bg-gray-800/50 border border-gray-150 dark:border-gray-800 text-gray-900 dark:text-white rounded-2xl text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-accent focus:bg-white dark:focus:bg-gray-800 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.43 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
              {errors.password && <p className="text-red-500 text-xs mt-0.5">{errors.password.message}</p>}
            </div>

            {/* Confirm Password input (Signup only) */}
            {isSignup && (
              <div className="flex flex-col gap-1.5 text-left">
                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Confirm password</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-400 pointer-events-none">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0V10.5m-2.852 0a1.5 1.5 0 0 0-1.488 1.482l-.099 7.04A1.5 1.5 0 0 0 2.5 20.5h19a1.5 1.5 0 0 0 1.487-1.478l-.099-7.04a1.5 1.5 0 0 0-1.488-1.482H3.75Z" />
                    </svg>
                  </span>
                  <input
                    {...register("confirmPassword", { required: "Confirm password is required" })}
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirm password"
                    className="w-full pl-11 pr-11 py-3 bg-gray-50 dark:bg-gray-800/50 border border-gray-150 dark:border-gray-800 text-gray-900 dark:text-white rounded-2xl text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-accent focus:bg-white dark:focus:bg-gray-800 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showConfirmPassword ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.43 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Form Options (Remember Me / Terms Agreement) */}
            <div className="flex items-center justify-between text-xs text-gray-500 select-none">
              {isSignup ? (
                <label className="flex items-center gap-2 cursor-pointer text-left leading-tight">
                  <input
                    type="checkbox"
                    checked={agreeTerms}
                    onChange={(e) => setAgreeTerms(e.target.checked)}
                    className="w-4.5 h-4.5 text-accent border-gray-300 dark:border-gray-700 rounded-lg focus:ring-accent bg-gray-50 dark:bg-gray-800"
                  />
                  <span>
                    I agree to the <span className="text-accent hover:underline font-bold">Terms & Privacy Policy</span>
                  </span>
                </label>
              ) : (
                <>
                  <label className="flex items-center gap-2 cursor-pointer font-medium">
                    <input
                      type="checkbox"
                      className="w-4.5 h-4.5 text-accent border-gray-300 dark:border-gray-700 rounded-lg focus:ring-accent bg-gray-50 dark:bg-gray-800"
                    />
                    <span>Remember me</span>
                  </label>
                  <button type="button" className="text-accent hover:underline font-bold transition-all">Forgot password?</button>
                </>
              )}
            </div>

            {authError && (
              <p className="text-red-500 text-xs font-semibold bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-950/40 p-3 rounded-xl text-left">
                {authError}
              </p>
            )}

            {/* Login / Sign Up Submit Button */}
            <button
              type="submit"
              className="w-full bg-gradient-to-r from-accent to-indigo-600 hover:to-indigo-700 text-white font-bold py-3 rounded-2xl transition-all shadow-[0_4px_16px_rgba(99,102,241,0.25)] hover:shadow-[0_6px_20px_rgba(99,102,241,0.35)] active:scale-[0.99] cursor-pointer mt-1"
            >
              {isSignup ? "Sign up" : "Login"}
            </button>
          </form>

          {/* Social Logins */}
          <div className="relative my-6 select-none">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-150 dark:border-gray-800"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white dark:bg-gray-900 px-3 text-gray-400 dark:text-gray-500 font-medium">or continue with</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3.5">
            <button
              type="button"
              onClick={handleGoogleLogin}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-200 rounded-2xl text-sm font-semibold hover:bg-gray-50 dark:hover:bg-gray-850 transition-all cursor-pointer shadow-sm active:scale-95"
            >
              <svg className="w-4.5 h-4.5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              <span>Google</span>
            </button>
            
            <button
              type="button"
              onClick={handleGithubLogin}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-200 rounded-2xl text-sm font-semibold hover:bg-gray-50 dark:hover:bg-gray-850 transition-all cursor-pointer shadow-sm active:scale-95"
            >
              <svg className="w-4.5 h-4.5 fill-current text-gray-900 dark:text-white" viewBox="0 0 24 24">
                <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.577.688.48C19.138 20.162 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
              </svg>
              <span>GitHub</span>
            </button>
          </div>

          <p className="text-xs text-center text-gray-400 dark:text-gray-500 mt-6 font-medium">
            {isSignup ? "Already have an account?" : "Don't have an account?"}
            <button
              onClick={() => { setIsSignup(!isSignup); setAuthError(""); reset() }}
              className="text-accent font-bold ml-1 hover:underline cursor-pointer transition-colors"
            >
              {isSignup ? "Sign up" : "Sign up"}
              {/* Wait! The mockup: Screen 1 shows link "Sign up" and Screen 2 shows link "Login". 
                  Let's make sure the text matches exactly! */}
              {isSignup ? "Login" : "Sign up"}
            </button>
          </p>

        </div>
      </div>
    </div>
  )
}

export default LoginPage
