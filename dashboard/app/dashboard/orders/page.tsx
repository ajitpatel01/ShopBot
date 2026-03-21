"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { getShops, getOrders, updateOrderStatus, type Shop, type Order } from "@/lib/api"
import { ShopSelector } from "@/components/ShopSelector"
import { StatusBadge } from "@/components/StatusBadge"
import { LoadingSpinner } from "@/components/LoadingSpinner"
import { EmptyState } from "@/components/EmptyState"
import { ShoppingBag, ClipboardCopy } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

const STATUSES = ["all", "pending", "confirmed", "completed", "cancelled"] as const

function getPaymentStatus(customerNote: string | null) {
  if (!customerNote) return null
  const match = customerNote.match(/PAYMENT_STATUS:(\w+)/)
  return match ? match[1] : null
}

function getOrderDisplayId(customerNote: string | null) {
  if (!customerNote) return null
  const match = customerNote.match(/REF:(ORD-[A-Z0-9]+)/)
  return match ? match[1] : null
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "just now"
  if (mins < 60) return mins + "m ago"
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return hrs + "h ago"
  return Math.floor(hrs / 24) + "d ago"
}

export default function OrdersPage() {
  const [shops, setShops] = useState<Shop[]>([])
  const [activeShopId, setActiveShopId] = useState("")
  const [orders, setOrders] = useState<Order[]>([])
  const [filter, setFilter] = useState<string>("all")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getShops().then(({ shops }) => {
      setShops(shops)
      if (shops.length > 0) setActiveShopId(shops[0].id)
    }).catch(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!activeShopId) return
    loadOrders()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeShopId, filter])

  function loadOrders() {
    setLoading(true)
    const params: Record<string, string> = filter !== "all" ? { status: filter } : {}
    getOrders(activeShopId, params)
      .then(({ orders }) => setOrders(orders))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  function copyTracking(order: Order) {
    const displayId = getOrderDisplayId(order.customer_note) || order.id.substring(0, 8).toUpperCase()
    const msg = `Your order ${displayId} is currently: ${order.status}`
    navigator.clipboard.writeText(msg)
    toast.success("Tracking message copied! Paste it in WhatsApp")
  }

  async function handleStatusChange(orderId: string, newStatus: string) {
    const prev = [...orders]
    setOrders((o) => o.map((order) => order.id === orderId ? { ...order, status: newStatus as Order["status"] } : order))
    try {
      await updateOrderStatus(orderId, activeShopId, newStatus)
      toast.success(`Order ${newStatus} — Customer notified via WhatsApp`)
    } catch (err) {
      setOrders(prev)
      toast.error(err instanceof Error ? err.message : "Failed to update status")
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-white">Orders</h1>
        <ShopSelector shops={shops} activeShopId={activeShopId} onSelect={setActiveShopId} />
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 border-b border-[#1f1f1f]">
        {STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={cn(
              "border-b-2 px-4 py-2.5 text-sm font-medium capitalize transition-colors duration-150",
              filter === s
                ? "border-white text-white"
                : "border-transparent text-[#555] hover:text-[#aaa]"
            )}
          >
            {s}
          </button>
        ))}
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : orders.length === 0 ? (
        <EmptyState title="No orders" description="Orders will appear here once customers place them via WhatsApp" icon={ShoppingBag} />
      ) : (
        <div className="rounded-xl border border-[#1f1f1f] bg-[#0a0a0a]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#1f1f1f] bg-[#050505]">
                <th className="px-6 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-[#555]">Customer</th>
                <th className="px-6 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-[#555]">Items</th>
                <th className="px-6 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-[#555]">Total</th>
                <th className="px-6 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-[#555]">Payment</th>
                <th className="px-6 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-[#555]">Status</th>
                <th className="px-6 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-[#555]">Time</th>
                <th className="px-6 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-[#555]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id} className="border-b border-[#0f0f0f] transition-colors duration-100 last:border-0 hover:bg-[#0d0d0d]">
                  <td className="px-6 py-3 font-medium text-white">
                    {order.customer_name || order.customer_note || order.customer_phone || "Customer"}
                  </td>
                  <td className="max-w-[150px] truncate px-6 py-3 text-[#666]">
                    {order.items.map((i) => `${i.name} x${i.quantity}`).join(", ") || "—"}
                  </td>
                  <td className="px-6 py-3 text-white">₹{order.total || 0}</td>
                  <td className="px-6 py-3">
                    {(() => {
                      const ps = getPaymentStatus(order.customer_note)
                      if (ps === "paid") return <span className="rounded-full border border-[#22c55e30] bg-[#22c55e15] px-2.5 py-0.5 text-[11px] font-medium text-[#22c55e]">Paid ✓</span>
                      if (ps === "pending") return <span className="rounded-full border border-[#f59e0b30] bg-[#f59e0b15] px-2.5 py-0.5 text-[11px] font-medium text-[#f59e0b]">Awaiting</span>
                      return <span className="text-[11px] text-[#555]">COD</span>
                    })()}
                  </td>
                  <td className="px-6 py-3"><StatusBadge status={order.status} /></td>
                  <td className="px-6 py-3 text-[#444]">{timeAgo(order.created_at)}</td>
                  <td className="px-6 py-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => copyTracking(order)}
                        className="rounded-lg border border-[#ffffff15] bg-[#ffffff08] px-2.5 py-1 text-[11px] font-medium text-[#888] transition-colors hover:bg-[#ffffff15] hover:text-white"
                        title="Copy tracking message"
                      >
                        <ClipboardCopy className="inline-block h-3 w-3 mr-1" />
                        Track
                      </button>
                      {order.status === "pending" && (
                        <>
                          <button
                            onClick={() => handleStatusChange(order.id, "confirmed")}
                            className="rounded-lg border border-[#22c55e30] bg-[#22c55e15] px-3 py-1 text-[11px] font-medium text-[#22c55e] transition-colors hover:bg-[#22c55e25]"
                          >
                            Confirm
                          </button>
                          <button
                            onClick={() => handleStatusChange(order.id, "cancelled")}
                            className="rounded-lg border border-[#ef444430] bg-[#ef444415] px-3 py-1 text-[11px] font-medium text-[#ef4444] transition-colors hover:bg-[#ef444425]"
                          >
                            Cancel
                          </button>
                        </>
                      )}
                      {order.status === "confirmed" && (
                        <>
                          <button
                            onClick={() => handleStatusChange(order.id, "completed")}
                            className="rounded-lg border border-[#3b82f630] bg-[#3b82f615] px-3 py-1 text-[11px] font-medium text-[#3b82f6] transition-colors hover:bg-[#3b82f625]"
                          >
                            Complete
                          </button>
                          <button
                            onClick={() => handleStatusChange(order.id, "cancelled")}
                            className="rounded-lg border border-[#ef444430] bg-[#ef444415] px-3 py-1 text-[11px] font-medium text-[#ef4444] transition-colors hover:bg-[#ef444425]"
                          >
                            Cancel
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </motion.div>
  )
}
