"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createBrowserClient } from "@/lib/supabase"
import { motion } from "framer-motion"

function isNetworkAuthError(err: unknown): boolean {
  if (err instanceof TypeError) return true
  if (err instanceof Error) {
    const m = err.message.toLowerCase()
    return m.includes("failed to fetch") || m.includes("fetch")
  }
  return false
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
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        })
        if (signUpError) {
          setError(signUpError.message)
        } else if (data.session) {
          router.push("/dashboard")
        } else {
          setSuccessMessage("Check your email to confirm your account")
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (signInError) {
          setError(signInError.message)
        } else {
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
        </div>
      </motion.div>
    </div>
  )
}
