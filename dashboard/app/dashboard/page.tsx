"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import {
  getShops,
  getConversations,
  getOrders,
  getStats,
  type Shop,
  type Conversation,
  type Order,
} from "@/lib/api"
import { StatCard } from "@/components/StatCard"
import { StatusBadge } from "@/components/StatusBadge"
import { ShopSelector } from "@/components/ShopSelector"
import { LoadingSpinner } from "@/components/LoadingSpinner"
import { EmptyState } from "@/components/EmptyState"
import { ShopFetchError } from "@/components/ShopFetchError"
import { MessageSquare, ShoppingBag, Calendar, AlertCircle, Inbox } from "lucide-react"

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "just now"
  if (mins < 60) return mins + "m ago"
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return hrs + "h ago"
  const days = Math.floor(hrs / 24)
  return days + "d ago"
}

export default function OverviewPage() {
  const [shops, setShops] = useState<Shop[]>([])
  const [activeShopId, setActiveShopId] = useState("")
  const [shopsReady, setShopsReady] = useState(false)
  const [stats, setStats] = useState({ totalMessages: 0, inboundMessages: 0, intentBreakdown: {} as Record<string, number>, escalations: 0 })
  const [orders, setOrders] = useState<Order[]>([])
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [pendingOrders, setPendingOrders] = useState(0)
  const [pendingBookings, setPendingBookings] = useState(0)
  const [loading, setLoading] = useState(true)
  const [shopsError, setShopsError] = useState<string | null>(null)

  useEffect(() => {
    getShops()
      .then(({ shops }) => {
        setShopsError(null)
        setShops(shops)
        if (shops.length > 0) setActiveShopId(shops[0].id)
      })
      .catch((err: unknown) => {
        setShops([])
        setShopsError(err instanceof Error ? err.message : "Request failed")
      })
      .finally(() => setShopsReady(true))
  }, [])

  useEffect(() => {
    if (!shopsReady) return
    if (!activeShopId) {
      queueMicrotask(() => setLoading(false))
      return
    }
    queueMicrotask(() => setLoading(true))
    Promise.all([
      getStats(activeShopId).catch(() => ({ totalMessages: 0, inboundMessages: 0, intentBreakdown: {}, escalations: 0 })),
      getOrders(activeShopId, { limit: "5" }).catch(() => ({ orders: [], count: 0 })),
      getOrders(activeShopId, { status: "pending" }).catch(() => ({ orders: [], count: 0 })),
      getConversations(activeShopId, { limit: "5" }).catch(() => ({ conversations: [], count: 0 })),
      import("@/lib/api").then(m => m.getBookings(activeShopId, { status: "pending" })).catch(() => ({ bookings: [], count: 0 })),
    ]).then(([statsData, ordersData, pendingOrdersData, convsData, bookingsData]) => {
      setStats(statsData)
      setOrders(ordersData.orders)
      setPendingOrders(pendingOrdersData.count)
      setConversations(convsData.conversations)
      setPendingBookings(bookingsData.count)
    }).finally(() => setLoading(false))
  }, [activeShopId, shopsReady])

  if (loading) return <LoadingSpinner />

  if (shops.length === 0 && shopsError) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold tracking-tight text-white">Overview</h1>
        <ShopFetchError message={shopsError} />
        <p className="text-sm text-[#666]">If the API is running, try signing out and back in so your session token is sent with requests.</p>
      </div>
    )
  }

  if (shops.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold tracking-tight text-white">Overview</h1>
        <EmptyState
          title="No shop yet"
          description="Create a shop in Settings using the same WhatsApp number you connected to the bot. The bot only replies when that number matches your shop."
          icon={Inbox}
        />
        <Link
          href="/dashboard/settings"
          className="inline-flex rounded-lg border border-[#2a2a2a] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#111]"
        >
          Go to Settings
        </Link>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-8"
    >
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-white">Overview</h1>
        <ShopSelector shops={shops} activeShopId={activeShopId} onSelect={setActiveShopId} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Messages (30d)" value={stats.totalMessages} icon={MessageSquare} color="blue" />
        <StatCard title="Pending Orders" value={pendingOrders} icon={ShoppingBag} color="amber" change={pendingOrders > 0 ? "Needs action" : undefined} />
        <StatCard title="Pending Bookings" value={pendingBookings} icon={Calendar} color="green" />
        <StatCard title="Needs Attention" value={stats.escalations} icon={AlertCircle} color="red" change={stats.escalations > 0 ? "Escalations" : undefined} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent Orders */}
        <div className="rounded-xl border border-[#1f1f1f] bg-[#0a0a0a]">
          <div className="flex items-center justify-between border-b border-[#1f1f1f] px-6 py-4">
            <h2 className="text-sm font-medium text-white">Recent Orders</h2>
            <Link href="/dashboard/orders" className="text-xs text-[#555] transition-colors hover:text-[#aaa]">
              View all →
            </Link>
          </div>
          <div className="p-0">
            {orders.length === 0 ? (
              <div className="p-6">
                <EmptyState title="No orders yet" description="Orders from WhatsApp will appear here" icon={ShoppingBag} />
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#1f1f1f] bg-[#050505]">
                    <th className="px-6 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-[#555]">Customer</th>
                    <th className="px-6 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-[#555]">Items</th>
                    <th className="px-6 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-[#555]">Total</th>
                    <th className="px-6 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-[#555]">Status</th>
                    <th className="px-6 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-[#555]">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order.id} className="border-b border-[#0f0f0f] transition-colors duration-100 last:border-0 hover:bg-[#0d0d0d]">
                      <td className="px-6 py-3 font-medium text-white">
                        {order.customer_name || order.customer_phone || "Customer"}
                      </td>
                      <td className="max-w-[120px] truncate px-6 py-3 text-[#666]">
                        {order.items.map(i => i.name).join(", ") || "—"}
                      </td>
                      <td className="px-6 py-3 text-white">₹{order.total || 0}</td>
                      <td className="px-6 py-3"><StatusBadge status={order.status} /></td>
                      <td className="px-6 py-3 text-[#444]">{timeAgo(order.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Recent Conversations */}
        <div className="rounded-xl border border-[#1f1f1f] bg-[#0a0a0a]">
          <div className="flex items-center justify-between border-b border-[#1f1f1f] px-6 py-4">
            <h2 className="text-sm font-medium text-white">Recent Conversations</h2>
            <Link href="/dashboard/conversations" className="text-xs text-[#555] transition-colors hover:text-[#aaa]">
              View all →
            </Link>
          </div>
          <div>
            {conversations.length === 0 ? (
              <div className="p-6">
                <EmptyState title="No conversations yet" description="Your bot is ready to receive messages" icon={Inbox} />
              </div>
            ) : (
              <div>
                {conversations.map((conv) => (
                  <Link
                    key={conv.id}
                    href={`/dashboard/conversations/${conv.id}`}
                    className="flex items-center gap-3 border-b border-[#0f0f0f] px-6 py-4 transition-colors duration-100 last:border-0 hover:bg-[#0d0d0d]"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#1a1a1a] text-[13px] font-medium text-white">
                      {(conv.customer_name || conv.customer_phone || "?")[0].toUpperCase()}
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <p className="text-sm font-medium text-white">
                        {conv.customer_name || conv.customer_phone}
                      </p>
                      <p className="truncate text-xs text-[#555]">
                        {conv.latest_message || "No messages"}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs text-[#444]">
                      {timeAgo(conv.last_message_at || conv.created_at)}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  )
}
