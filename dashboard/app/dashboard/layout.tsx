"use client"

import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"
import { createBrowserClient } from "@/lib/supabase"
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

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [userEmail, setUserEmail] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createBrowserClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserEmail(user?.email ?? null)
    })
  }, [])

  async function handleLogout() {
    const supabase = createBrowserClient()
    await supabase.auth.signOut()
    router.push("/login")
  }

  function isActive(href: string) {
    if (href === "/dashboard") return pathname === "/dashboard"
    return pathname.startsWith(href)
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Desktop Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-[#1f1f1f] bg-[#0a0a0a] md:flex">
        <div className="flex h-16 items-center gap-2 border-b border-[#1f1f1f] px-6">
          <span className="text-lg font-bold tracking-tight text-white">💬 ShopBot</span>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {navItems.map((item) => {
            const Icon = item.icon
            const active = isActive(item.href)
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
          })}
        </nav>

        <div className="border-t border-[#1f1f1f] p-4">
          <p className="mb-2 truncate text-xs text-[#555]">{userEmail}</p>
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
        <div className="mx-auto max-w-[1280px] p-4 md:p-8">{children}</div>
      </main>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-around border-t border-[#1f1f1f] bg-[#0a0a0a] py-2 md:hidden">
        {mobileNavItems.map((item) => {
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-1 px-3 py-1 text-xs transition-colors duration-150",
                isActive(item.href)
                  ? "text-white"
                  : "text-[#555]"
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
