"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { motion } from "framer-motion"
import {
  getShops,
  getCustomerProfile,
  addConversationNote,
  type CustomerProfile,
  type Order,
  type Booking,
} from "@/lib/api"
import { LoadingSpinner } from "@/components/LoadingSpinner"
import { StatCard } from "@/components/StatCard"
import { StatusBadge } from "@/components/StatusBadge"
import { ArrowLeft, MessageSquare, ShoppingBag, Calendar, DollarSign, Save } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

const TAGS = ["VIP", "Frequent", "Complaint", "New"] as const

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

function daysAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  return Math.floor(diff / (24 * 60 * 60 * 1000))
}

export default function CustomerProfilePage() {
  const params = useParams()
  const router = useRouter()
  const conversationId = params.id as string

  const [shopId, setShopId] = useState("")
  const [profile, setProfile] = useState<CustomerProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [note, setNote] = useState("")
  const [savingNote, setSavingNote] = useState(false)
  const [tags, setTags] = useState<string[]>([])

  useEffect(() => {
    getShops().then(({ shops }) => {
      if (shops.length > 0) setShopId(shops[0].id)
    })
  }, [])

  useEffect(() => {
    if (!shopId || !conversationId) return
    setLoading(true)
    getCustomerProfile(conversationId, shopId)
      .then((data) => {
        setProfile(data)
        setNote(data.conversation.owner_note || "")
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [shopId, conversationId])

  useEffect(() => {
    if (!conversationId) return
    try {
      const stored = localStorage.getItem("customer-tags-" + conversationId)
      if (stored) setTags(JSON.parse(stored))
    } catch {}
  }, [conversationId])

  function toggleTag(tag: string) {
    setTags(prev => {
      const next = prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
      localStorage.setItem("customer-tags-" + conversationId, JSON.stringify(next))
      return next
    })
  }

  async function handleSaveNote() {
    if (!shopId || !conversationId) return
    setSavingNote(true)
    try {
      await addConversationNote(conversationId, shopId, note)
      toast.success("Note saved")
    } catch {
      toast.error("Failed to save note")
    } finally {
      setSavingNote(false)
    }
  }

  if (loading) return <LoadingSpinner />
  if (!profile) return <p className="p-6 text-[#555]">Profile not found</p>

  const { conversation: conv, orders, bookings, messageStats, totalSpend } = profile
  const customerName = conv.customer_name || conv.customer_phone || "Customer"
  const initials = customerName.slice(0, 2).toUpperCase()
  const firstContactDays = messageStats.first_message ? daysAgo(messageStats.first_message) : null

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-8"
    >
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.push("/dashboard/conversations/" + conversationId)}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-[#666] transition-colors hover:bg-[#111] hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-[#1f1f1f] text-lg font-bold text-white">
          {initials}
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">{customerName}</h1>
          <p className="text-sm text-[#555]">{conv.customer_phone}</p>
          {firstContactDays !== null && (
            <p className="text-xs text-[#444]">First contact: {firstContactDays} days ago</p>
          )}
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Total Messages" value={messageStats.total} icon={MessageSquare} color="blue" />
        <StatCard title="Total Orders" value={orders.length} icon={ShoppingBag} color="amber" />
        <StatCard title="Total Bookings" value={bookings.length} icon={Calendar} color="green" />
        <StatCard title="Total Spend" value={totalSpend} icon={DollarSign} color="green" prefix="₹" />
      </div>

      {/* Order History */}
      <div className="rounded-xl border border-[#1f1f1f] bg-[#0a0a0a]">
        <div className="border-b border-[#1f1f1f] px-6 py-4">
          <h2 className="text-sm font-medium text-white">Order History</h2>
        </div>
        {orders.length === 0 ? (
          <p className="p-6 text-sm text-[#555]">No orders yet</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#1f1f1f] bg-[#050505]">
                <th className="px-6 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-[#555]">Date</th>
                <th className="px-6 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-[#555]">Items</th>
                <th className="px-6 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-[#555]">Total</th>
                <th className="px-6 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-[#555]">Status</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order: Order) => (
                <tr key={order.id} className="border-b border-[#0f0f0f] transition-colors duration-100 last:border-0 hover:bg-[#0d0d0d]">
                  <td className="px-6 py-3 text-[#aaa]">{formatDate(order.created_at)}</td>
                  <td className="max-w-[200px] truncate px-6 py-3 text-[#666]">
                    {order.items.map(i => `${i.name} x${i.quantity}`).join(", ") || "—"}
                  </td>
                  <td className="px-6 py-3 font-medium text-white">₹{order.total || 0}</td>
                  <td className="px-6 py-3"><StatusBadge status={order.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Booking History */}
      <div className="rounded-xl border border-[#1f1f1f] bg-[#0a0a0a]">
        <div className="border-b border-[#1f1f1f] px-6 py-4">
          <h2 className="text-sm font-medium text-white">Booking History</h2>
        </div>
        {bookings.length === 0 ? (
          <p className="p-6 text-sm text-[#555]">No bookings yet</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#1f1f1f] bg-[#050505]">
                <th className="px-6 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-[#555]">Date</th>
                <th className="px-6 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-[#555]">Service</th>
                <th className="px-6 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-[#555]">Status</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((booking: Booking) => (
                <tr key={booking.id} className="border-b border-[#0f0f0f] transition-colors duration-100 last:border-0 hover:bg-[#0d0d0d]">
                  <td className="px-6 py-3 text-[#aaa]">
                    {booking.booking_datetime ? formatDate(booking.booking_datetime) : formatDate(booking.created_at)}
                  </td>
                  <td className="px-6 py-3 text-[#666]">{booking.service || "—"}</td>
                  <td className="px-6 py-3"><StatusBadge status={booking.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Owner Notes */}
      <div className="rounded-xl border border-[#1f1f1f] bg-[#0a0a0a] p-6">
        <h2 className="mb-3 text-sm font-medium text-white">Owner Notes</h2>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Add a private note about this customer..."
          rows={4}
          className="w-full resize-none rounded-lg border border-[#1f1f1f] bg-[#050505] px-3 py-2 text-sm text-[#aaa] placeholder-[#333] transition-colors focus:border-[#333] focus:outline-none"
        />
        <button
          onClick={handleSaveNote}
          disabled={savingNote}
          className="mt-2 flex items-center gap-1.5 rounded-lg border border-[#1f1f1f] px-3 py-1.5 text-xs font-medium text-[#888] transition-colors hover:border-[#2a2a2a] hover:text-white disabled:opacity-50"
        >
          <Save className="h-3 w-3" />
          {savingNote ? "Saving..." : "Save note"}
        </button>
      </div>

      {/* Tags */}
      <div className="rounded-xl border border-[#1f1f1f] bg-[#0a0a0a] p-6">
        <h2 className="mb-3 text-sm font-medium text-white">Tags</h2>
        <div className="flex flex-wrap gap-2">
          {TAGS.map((tag) => (
            <button
              key={tag}
              onClick={() => toggleTag(tag)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors duration-150",
                tags.includes(tag)
                  ? "border-white bg-white text-black"
                  : "border-[#1f1f1f] bg-transparent text-[#555] hover:border-[#2a2a2a] hover:text-[#aaa]"
              )}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>
    </motion.div>
  )
}
