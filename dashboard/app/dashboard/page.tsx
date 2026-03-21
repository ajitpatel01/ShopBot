"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
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
  const [stats, setStats] = useState({ totalMessages: 0, inboundMessages: 0, intentBreakdown: {} as Record<string, number>, escalations: 0 })
  const [orders, setOrders] = useState<Order[]>([])
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [pendingOrders, setPendingOrders] = useState(0)
  const [pendingBookings, setPendingBookings] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getShops().then(({ shops }) => {
      setShops(shops)
      if (shops.length > 0) setActiveShopId(shops[0].id)
    }).catch(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!activeShopId) return
    setLoading(true)
    Promise.all([
      getStats(activeShopId).catch(() => ({ totalMessages: 0, inboundMessages: 0, intentBreakdown: {}, escalations: 0 })),
      getOrders(activeShopId, { limit: "5" }).catch(() => ({ orders: [], count: 0 })),
      getOrders(activeShopId, { status: "pending" }).catch(() => ({ orders: [], count: 0 })),
      getConversations(activeShopId, { limit: "5" }).catch(() => ({ conversations: [], count: 0 })),
      // Reuse bookings count from API — we just need the pending count
      import("@/lib/api").then(m => m.getBookings(activeShopId, { status: "pending" })).catch(() => ({ bookings: [], count: 0 })),
    ]).then(([statsData, ordersData, pendingOrdersData, convsData, bookingsData]) => {
      setStats(statsData)
      setOrders(ordersData.orders)
      setPendingOrders(pendingOrdersData.count)
      setConversations(convsData.conversations)
      setPendingBookings(bookingsData.count)
    }).finally(() => setLoading(false))
  }, [activeShopId])

  if (loading) return <LoadingSpinner />

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Overview</h1>
        <ShopSelector shops={shops} activeShopId={activeShopId} onSelect={setActiveShopId} />
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Messages (30d)"
          value={stats.totalMessages}
          icon={MessageSquare}
          color="blue"
        />
        <StatCard
          title="Pending Orders"
          value={pendingOrders}
          icon={ShoppingBag}
          color="amber"
          change={pendingOrders > 0 ? "Needs action" : undefined}
        />
        <StatCard
          title="Pending Bookings"
          value={pendingBookings}
          icon={Calendar}
          color="green"
        />
        <StatCard
          title="Needs Attention"
          value={stats.escalations}
          icon={AlertCircle}
          color="red"
          change={stats.escalations > 0 ? "Escalations" : undefined}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent Orders */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Recent Orders</CardTitle>
            <Link href="/dashboard/orders" className="text-sm text-primary hover:underline">
              View all
            </Link>
          </CardHeader>
          <CardContent>
            {orders.length === 0 ? (
              <EmptyState title="No orders yet" description="Orders from WhatsApp will appear here" icon={ShoppingBag} />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">
                        {order.customer_name || order.customer_phone || "Customer"}
                      </TableCell>
                      <TableCell className="max-w-[120px] truncate text-sm text-muted-foreground">
                        {order.items.map(i => i.name).join(", ") || "—"}
                      </TableCell>
                      <TableCell>₹{order.total || 0}</TableCell>
                      <TableCell><StatusBadge status={order.status} /></TableCell>
                      <TableCell className="text-sm text-muted-foreground">{timeAgo(order.created_at)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Recent Conversations */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Recent Conversations</CardTitle>
            <Link href="/dashboard/conversations" className="text-sm text-primary hover:underline">
              View all
            </Link>
          </CardHeader>
          <CardContent>
            {conversations.length === 0 ? (
              <EmptyState title="No conversations yet" description="Your bot is ready to receive messages" icon={Inbox} />
            ) : (
              <div className="space-y-3">
                {conversations.map((conv) => (
                  <Link
                    key={conv.id}
                    href={`/dashboard/conversations/${conv.id}`}
                    className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-accent"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
                      {(conv.customer_name || conv.customer_phone || "?")[0].toUpperCase()}
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <p className="text-sm font-medium">
                        {conv.customer_name || conv.customer_phone}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {conv.latest_message || "No messages"}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {timeAgo(conv.last_message_at || conv.created_at)}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
