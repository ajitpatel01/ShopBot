"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createBrowserClient } from "@/lib/supabase"
import { motion } from "framer-motion"
import type { User } from "@supabase/supabase-js"

function isNetworkAuthError(err: unknown): boolean {
  if (err instanceof TypeError) return true
  if (err instanceof Error) {
    const m = err.message.toLowerCase()
    return m.includes("failed to fetch") || m.includes("fetch")
  }
  return false
}

/** Supabase default is persistSession: true via createBrowserClient (@supabase/ssr). */
async function syncUserProfile(supabase: ReturnType<typeof createBrowserClient>, user: User) {
  const isGuest = typeof window !== "undefined" && localStorage.getItem("is_guest") === "true"
  const meta = (user.user_metadata || {}) as Record<string, unknown>
  const fullName = (meta.full_name as string) || (meta.name as string) || null
  const avatarUrl = (meta.avatar_url as string) || (meta.picture as string) || null

  const { data: existing } = await supabase.from("profiles").select("id").eq("id", user.id).maybeSingle()

  if (!existing) {
    const { error } = await supabase.from("profiles").insert({
      id: user.id,
      email: user.email,
      full_name: fullName,
      avatar_url: avatarUrl,
      is_guest: isGuest,
      last_login_at: new Date().toISOString(),
      login_count: 1,
    })
    if (error) console.error("[Login] profile insert:", error.message)
    return
  }

  const { error: upErr } = await supabase
    .from("profiles")
    .update({
      email: user.email,
      full_name: fullName,
      avatar_url: avatarUrl,
      is_guest: isGuest,
    })
    .eq("id", user.id)
  if (upErr) {
    console.error("[Login] profile update:", upErr.message)
    return
  }
  const { error: rpcErr } = await supabase.rpc("increment_login_count", { user_id: user.id })
  if (rpcErr) console.error("[Login] increment_login_count:", rpcErr.message)
}

export default function LoginPage() {
  const router = useRouter()
  const [mode, setMode] = useState<"signin" | "signup">("signin")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState("")
  const [successMessage, setSuccessMessage] = useState("")
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [guestLoading, setGuestLoading] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)

  useEffect(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem("saved_email") : null
    if (saved) setEmail(saved)
  }, [])

  function applyRememberMeFlags() {
    if (typeof window === "undefined") return
    if (rememberMe) {
      sessionStorage.removeItem("session_only")
      if (email.trim()) localStorage.setItem("saved_email", email.trim())
    } else {
      sessionStorage.setItem("session_only", "true")
      localStorage.removeItem("saved_email")
    }
  }

  function switchMode(next: "signin" | "signup") {
    setMode(next)
    setError("")
    setSuccessMessage("")
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setSuccessMessage("")
    setLoading(true)
    try {
      const supabase = createBrowserClient()

      if (mode === "signup") {
        if (password !== confirmPassword) {
          setError("Passwords do not match")
          setLoading(false)
          return
        }
        localStorage.removeItem("is_guest")
        applyRememberMeFlags()
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        })
        if (signUpError) {
          setError(signUpError.message)
        } else if (data.session && data.user) {
          await syncUserProfile(supabase, data.user)
          router.push("/dashboard")
        } else {
          setSuccessMessage("Check your email to confirm your account")
        }
      } else {
        localStorage.removeItem("is_guest")
        applyRememberMeFlags()
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (signInError) {
          setError(signInError.message)
        } else if (data.user) {
          await syncUserProfile(supabase, data.user)
          router.push("/dashboard")
        }
      }
    } catch (err) {
      if (isNetworkAuthError(err)) {
        setError("Cannot connect to auth server. Check your configuration.")
      } else {
        setError("An unexpected error occurred")
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleGoogleLogin() {
    setGoogleLoading(true)
    setError("")
    try {
      localStorage.removeItem("is_guest")
      if (rememberMe) {
        sessionStorage.removeItem("session_only")
        if (email.trim()) localStorage.setItem("saved_email", email.trim())
      } else {
        sessionStorage.setItem("session_only", "true")
        localStorage.removeItem("saved_email")
      }
      const supabase = createBrowserClient()
      await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      })
    } catch {
      setError("Failed to start Google sign-in")
      setGoogleLoading(false)
    }
  }

  const handleGuestLogin = async () => {
    setGuestLoading(true)
    setError("")
    try {
      const supabase = createBrowserClient()
      const { data, error } = await supabase.auth.signInAnonymously()
      if (error) {
        setError(error.message)
        return
      }
      if (data?.session) {
        localStorage.setItem("is_guest", "true")
        window.location.href = "/dashboard"
      }
    } catch {
      setError("Guest login failed. Please try again.")
    } finally {
      setGuestLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-black px-4">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-sm"
      >
        <div className="rounded-xl border border-[#1f1f1f] bg-[#0a0a0a] p-8">
          <div className="mb-6 text-center">
            <div className="text-[28px] font-bold tracking-tight text-white">
              💬 ShopBot
            </div>
            <p className="mt-1 text-[13px] text-[#555]">Owner dashboard</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-11 w-full rounded-lg border border-[#1f1f1f] bg-[#111] px-3 text-sm text-white placeholder-[#444] transition-colors focus:border-[#ffffff40] focus:outline-none"
              />
            </div>
            <div>
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="h-11 w-full rounded-lg border border-[#1f1f1f] bg-[#111] px-3 text-sm text-white placeholder-[#444] transition-colors focus:border-[#ffffff40] focus:outline-none"
              />
            </div>
            {mode === "signup" && (
              <div>
                <input
                  type="password"
                  placeholder="Confirm password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                  className="h-11 w-full rounded-lg border border-[#1f1f1f] bg-[#111] px-3 text-sm text-white placeholder-[#444] transition-colors focus:border-[#ffffff40] focus:outline-none"
                />
              </div>
            )}

            <label className="flex cursor-pointer items-center gap-2 text-[13px] text-[#888]">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 rounded border-[#333] bg-[#111] text-white focus:ring-white/20"
              />
              Remember me
            </label>

            {error && (
              <p className="text-sm text-[#ef4444] animate-in fade-in duration-200">
                {error}
              </p>
            )}
            {successMessage && (
              <p className="text-sm text-[#22c55e] animate-in fade-in duration-200">
                {successMessage}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="h-11 w-full rounded-lg bg-white text-sm font-semibold text-black transition-colors duration-150 hover:bg-[#f0f0f0] disabled:opacity-50"
            >
              {loading
                ? mode === "signup"
                  ? "Creating account..."
                  : "Signing in..."
                : mode === "signup"
                  ? "Sign up"
                  : "Sign In"}
            </button>
          </form>

          <p className="mt-4 text-center text-[13px] text-[#666]">
            {mode === "signin" ? (
              <>
                Don&apos;t have an account?{" "}
                <button
                  type="button"
                  onClick={() => switchMode("signup")}
                  className="font-medium text-white underline-offset-2 hover:underline"
                >
                  Sign up
                </button>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => switchMode("signin")}
                  className="font-medium text-white underline-offset-2 hover:underline"
                >
                  Sign in
                </button>
              </>
            )}
          </p>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#1f1f1f]" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-[#0a0a0a] px-3 text-[#444]">or</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={googleLoading}
            className="h-11 w-full rounded-lg border border-[#1f1f1f] bg-transparent text-sm font-medium text-white transition-colors duration-150 hover:border-[#2a2a2a] disabled:opacity-50"
          >
            {googleLoading ? "Redirecting..." : "Continue with Google"}
          </button>

          <button
            type="button"
            onClick={handleGuestLogin}
            disabled={guestLoading}
            className="mt-3 h-11 w-full rounded-lg border border-[#2a2a2a] bg-[#111] text-sm font-medium text-[#ccc] transition-colors duration-150 hover:border-[#3a3a3a] hover:text-white disabled:opacity-50"
          >
            {guestLoading ? "Continuing..." : "Continue as Guest"}
          </button>
        </div>
      </motion.div>
    </div>
  )
}
