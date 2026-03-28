"use client"

import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"
import { createBrowserClient } from "@/lib/supabase"
import type { User } from "@supabase/supabase-js"
import {
  LayoutDashboard,
  MessageSquare,
  ShoppingBag,
  Calendar,
  Settings,
  BarChart3,
  CreditCard,
  Gift,
  LogOut,
  Lock,
} from "lucide-react"
import { cn } from "@/lib/utils"

const navItems = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/conversations", label: "Conversations", icon: MessageSquare },
  { href: "/dashboard/orders", label: "Orders", icon: ShoppingBag },
  { href: "/dashboard/bookings", label: "Bookings", icon: Calendar },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
  { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/dashboard/billing", label: "Billing", icon: CreditCard },
  { href: "/dashboard/referral", label: "Refer & Earn", icon: Gift },
]

const mobileNavItems = navItems.filter((_, i) => [0, 1, 2, 4].includes(i))

const GUEST_RESTRICTED_PREFIXES = ["/dashboard/settings", "/dashboard/billing", "/dashboard/referral"]

function isGuestRestrictedPath(pathname: string) {
  return GUEST_RESTRICTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"))
}

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
    if (error) console.error("[Dashboard] profile insert:", error.message)
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
    console.error("[Dashboard] profile update:", upErr.message)
    return
  }
  const { error: rpcErr } = await supabase.rpc("increment_login_count", { user_id: user.id })
  if (rpcErr) console.error("[Dashboard] increment_login_count:", rpcErr.message)
}

function GuestRoutePlaceholder() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-4 text-center">
      <Lock className="h-12 w-12 text-[#444]" aria-hidden />
      <p className="text-lg font-medium text-white">Sign up to unlock</p>
      <p className="max-w-md text-sm text-[#666]">
        Guest mode is view-only. Create a free account to change settings, manage billing, and use Refer &amp; Earn.
      </p>
      <Link
        href="/login"
        className="rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-black transition-colors hover:bg-[#f0f0f0]"
      >
        Sign up
      </Link>
    </div>
  )
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [isGuest, setIsGuest] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined") return
    queueMicrotask(() => {
      setIsGuest(localStorage.getItem("is_guest") === "true")
    })
  }, [])

  useEffect(() => {
    if (typeof window === "undefined") return
    const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined
    if (nav?.type === "reload" && sessionStorage.getItem("session_only") === "true") {
      const supabase = createBrowserClient()
      supabase.auth.signOut().then(() => {
        sessionStorage.removeItem("session_only")
        router.replace("/login")
      })
    }
  }, [router])

  useEffect(() => {
    const supabase = createBrowserClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      setUserEmail(user?.email ?? null)
      if (!user) return
      const provider = user.app_metadata?.provider
      if (provider !== "google") return
      const key = "oauth_profile_synced_" + user.id
      if (sessionStorage.getItem(key)) return
      await syncUserProfile(supabase, user)
      sessionStorage.setItem(key, "1")
    })
  }, [])

  async function handleLogout() {
    const supabase = createBrowserClient()
    localStorage.removeItem("is_guest")
    sessionStorage.removeItem("session_only")
    await supabase.auth.signOut()
    router.push("/login")
  }

  function isActive(href: string) {
    if (href === "/dashboard") return pathname === "/dashboard"
    return pathname.startsWith(href)
  }

  const guestRestrictedView = isGuest && isGuestRestrictedPath(pathname)
  const guestOrdersBookingsNote =
    isGuest &&
    (pathname.startsWith("/dashboard/orders") || pathname.startsWith("/dashboard/bookings"))

  function NavLink(item: (typeof navItems)[0]) {
    const Icon = item.icon
    const active = isActive(item.href)
    const restricted =
      isGuest &&
      (item.href === "/dashboard/settings" ||
        item.href === "/dashboard/billing" ||
        item.href === "/dashboard/referral")

    if (restricted) {
      return (
        <Link
          key={item.href}
          href="/login"
          className={cn(
            "relative flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors duration-150",
            "border-l-2 border-transparent text-[#555] hover:bg-[#111] hover:text-[#888]"
          )}
          title="Sign up to unlock"
        >
          <Lock className="h-4 w-4 shrink-0 text-[#555]" aria-hidden />
          {item.label}
        </Link>
      )
    }

    return (
      <Link
        key={item.href}
        href={item.href}
        className={cn(
          "relative flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors duration-150",
          active
            ? "border-l-2 border-white bg-[#111] text-white"
            : "border-l-2 border-transparent text-[#666] hover:bg-[#111] hover:text-[#aaa]"
        )}
      >
        <Icon className="h-4 w-4" />
        {item.label}
        {item.href === "/dashboard/referral" && (
          <span className="ml-auto rounded-full bg-[#22c55e15] px-2 py-0.5 text-[10px] font-medium text-[#22c55e]">
            Free months
          </span>
        )}
      </Link>
    )
  }

  return (
    <div className="min-h-screen bg-black">
      {isGuest && (
        <div className="border-b border-amber-500/30 bg-amber-950/40 px-4 py-2.5 text-center text-[13px] text-amber-100/95 md:pl-[calc(15rem+1rem)]">
          <span>You&apos;re in guest mode — Sign up to save your data. </span>
          <Link href="/login" className="font-semibold text-white underline-offset-2 hover:underline">
            Sign Up
          </Link>
        </div>
      )}

      {/* Desktop Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-[#1f1f1f] bg-[#0a0a0a] md:flex">
        <div className="flex h-16 items-center gap-2 border-b border-[#1f1f1f] px-6">
          <span className="text-lg font-bold tracking-tight text-white">💬 ShopBot</span>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {navItems.map((item) => NavLink(item))}
        </nav>

        <div className="border-t border-[#1f1f1f] p-4">
          <p className="mb-2 truncate text-xs text-[#555]">{userEmail || (isGuest ? "Guest" : "")}</p>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm text-[#666] transition-colors duration-150 hover:text-white"
          >
            <LogOut className="h-4 w-4" />
            Log out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="min-h-screen bg-black pb-20 md:ml-60 md:pb-0">
        <div className="mx-auto max-w-[1280px] p-4 md:p-8">
          {guestOrdersBookingsNote && !guestRestrictedView && (
            <div
              className="mb-4 flex items-start gap-2 rounded-lg border border-[#2a2a2a] bg-[#111] px-4 py-3 text-sm text-[#aaa]"
              title="Sign up to unlock"
            >
              <Lock className="mt-0.5 h-4 w-4 shrink-0 text-[#666]" aria-hidden />
              <p>
                View only — bookings and orders from your bot appear here.{" "}
                <Link href="/login" className="font-medium text-white underline-offset-2 hover:underline">
                  Sign up
                </Link>{" "}
                to manage orders and settings from the dashboard.
              </p>
            </div>
          )}
          {guestRestrictedView ? <GuestRoutePlaceholder /> : children}
        </div>
      </main>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-around border-t border-[#1f1f1f] bg-[#0a0a0a] py-2 md:hidden">
        {mobileNavItems.map((item) => {
          const Icon = item.icon
          const restricted =
            isGuest &&
            (item.href === "/dashboard/settings" ||
              item.href === "/dashboard/billing" ||
              item.href === "/dashboard/referral")
          if (restricted) {
            return (
              <Link
                key={item.href}
                href="/login"
                className="flex flex-col items-center gap-1 px-3 py-1 text-xs text-[#555]"
                title="Sign up to unlock"
              >
                <Lock className="h-5 w-5" />
                {item.label}
              </Link>
            )
          }
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-1 px-3 py-1 text-xs transition-colors duration-150",
                isActive(item.href) ? "text-white" : "text-[#555]"
              )}
            >
              <Icon className="h-5 w-5" />
              {item.label}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
