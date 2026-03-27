"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { getShops, getBookings, updateBookingStatus, type Shop, type Booking } from "@/lib/api"
import { ShopSelector } from "@/components/ShopSelector"
import { StatusBadge } from "@/components/StatusBadge"
import { LoadingSpinner } from "@/components/LoadingSpinner"
import { EmptyState } from "@/components/EmptyState"
import { Calendar } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

const STATUSES = ["all", "pending", "confirmed", "cancelled"] as const

function formatBookingDate(dateStr: string) {
  return new Date(dateStr).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function isPast(dateStr: string) {
  return new Date(dateStr).getTime() < Date.now()
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

export default function BookingsPage() {
  const [shops, setShops] = useState<Shop[]>([])
  const [activeShopId, setActiveShopId] = useState("")
  const [bookings, setBookings] = useState<Booking[]>([])
  const [filter, setFilter] = useState<string>("all")
  const [loading, setLoading] = useState(true)
  const [shopsReady, setShopsReady] = useState(false)

  useEffect(() => {
    getShops()
      .then(({ shops }) => {
        setShops(shops)
        if (shops.length > 0) setActiveShopId(shops[0].id)
      })
      .catch(() => {})
      .finally(() => setShopsReady(true))
  }, [])

  useEffect(() => {
    if (!shopsReady) return
    if (!activeShopId) {
      setLoading(false)
      return
    }
    loadBookings()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeShopId, filter, shopsReady])

  function loadBookings() {
    setLoading(true)
    const params: Record<string, string> = filter !== "all" ? { status: filter } : {}
    getBookings(activeShopId, params)
      .then(({ bookings }) => setBookings(bookings))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  async function handleStatusChange(bookingId: string, newStatus: string) {
    const prev = [...bookings]
    setBookings((b) =>
      b.map((booking) =>
        booking.id === bookingId
          ? { ...booking, status: newStatus as Booking["status"] }
          : booking
      )
    )
    try {
      await updateBookingStatus(bookingId, activeShopId, newStatus)
      toast.success(`Booking ${newStatus} — Customer notified via WhatsApp`)
    } catch (err) {
      setBookings(prev)
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
        <h1 className="text-2xl font-bold tracking-tight text-white">Bookings</h1>
        <ShopSelector shops={shops} activeShopId={activeShopId} onSelect={setActiveShopId} />
      </div>

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
      ) : bookings.length === 0 ? (
        <EmptyState
          title="No bookings"
          description="Bookings will appear here once customers schedule them via WhatsApp"
          icon={Calendar}
        />
      ) : (
        <div className="rounded-xl border border-[#1f1f1f] bg-[#0a0a0a]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#1f1f1f] bg-[#050505]">
                <th className="px-6 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-[#555]">Customer</th>
                <th className="px-6 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-[#555]">Service</th>
                <th className="px-6 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-[#555]">Date & Time</th>
                <th className="px-6 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-[#555]">Status</th>
                <th className="px-6 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-[#555]">Booked</th>
                <th className="px-6 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-[#555]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((booking) => {
                const past = booking.booking_datetime && isPast(booking.booking_datetime)
                return (
                  <tr key={booking.id} className={cn(
                    "border-b border-[#0f0f0f] transition-colors duration-100 last:border-0 hover:bg-[#0d0d0d]",
                    past && "opacity-40"
                  )}>
                    <td className="px-6 py-3 font-medium text-white">
                      {booking.customer_name || booking.customer_phone || "Customer"}
                    </td>
                    <td className="px-6 py-3 text-[#aaa]">{booking.service || "—"}</td>
                    <td className={cn("px-6 py-3", !past ? "font-medium text-[#22c55e]" : "text-[#555]")}>
                      {booking.booking_datetime ? formatBookingDate(booking.booking_datetime) : "—"}
                    </td>
                    <td className="px-6 py-3"><StatusBadge status={booking.status} /></td>
                    <td className="px-6 py-3 text-[#444]">{timeAgo(booking.created_at)}</td>
                    <td className="px-6 py-3">
                      <div className="flex gap-2">
                        {booking.status === "pending" && (
                          <>
                            <button
                              onClick={() => handleStatusChange(booking.id, "confirmed")}
                              className="rounded-lg border border-[#22c55e30] bg-[#22c55e15] px-3 py-1 text-[11px] font-medium text-[#22c55e] transition-colors hover:bg-[#22c55e25]"
                            >
                              Confirm
                            </button>
                            <button
                              onClick={() => handleStatusChange(booking.id, "cancelled")}
                              className="rounded-lg border border-[#ef444430] bg-[#ef444415] px-3 py-1 text-[11px] font-medium text-[#ef4444] transition-colors hover:bg-[#ef444425]"
                            >
                              Cancel
                            </button>
                          </>
                        )}
                        {booking.status === "confirmed" && (
                          <button
                            onClick={() => handleStatusChange(booking.id, "cancelled")}
                            className="rounded-lg border border-[#ef444430] bg-[#ef444415] px-3 py-1 text-[11px] font-medium text-[#ef4444] transition-colors hover:bg-[#ef444425]"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </motion.div>
  )
}
