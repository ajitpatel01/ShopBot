"use client"

import { useEffect, useState } from "react"
import { getShops, getBookings, updateBookingStatus, type Shop, type Booking } from "@/lib/api"
import { ShopSelector } from "@/components/ShopSelector"
import { StatusBadge } from "@/components/StatusBadge"
import { LoadingSpinner } from "@/components/LoadingSpinner"
import { EmptyState } from "@/components/EmptyState"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
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

  useEffect(() => {
    getShops().then(({ shops }) => {
      setShops(shops)
      if (shops.length > 0) setActiveShopId(shops[0].id)
    }).catch(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!activeShopId) return
    loadBookings()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeShopId, filter])

  function loadBookings() {
    setLoading(true)
    const params = filter !== "all" ? { status: filter } : {}
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
      toast.success(`Booking ${newStatus}`)
    } catch (err) {
      setBookings(prev)
      toast.error(err instanceof Error ? err.message : "Failed to update status")
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Bookings</h1>
        <ShopSelector shops={shops} activeShopId={activeShopId} onSelect={setActiveShopId} />
      </div>

      <Tabs value={filter} onValueChange={setFilter}>
        <TabsList>
          {STATUSES.map((s) => (
            <TabsTrigger key={s} value={s} className="capitalize">
              {s}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {loading ? (
        <LoadingSpinner />
      ) : bookings.length === 0 ? (
        <EmptyState
          title="No bookings"
          description="Bookings will appear here once customers schedule them via WhatsApp"
          icon={Calendar}
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {bookings.length} booking{bookings.length !== 1 ? "s" : ""}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Booked</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bookings.map((booking) => {
                  const past = booking.booking_datetime && isPast(booking.booking_datetime)
                  return (
                    <TableRow key={booking.id} className={cn(past && "opacity-50")}>
                      <TableCell className="font-medium">
                        {booking.customer_name || booking.customer_phone || "Customer"}
                      </TableCell>
                      <TableCell>{booking.service || "—"}</TableCell>
                      <TableCell className={cn(!past && "font-medium text-green-700")}>
                        {booking.booking_datetime
                          ? formatBookingDate(booking.booking_datetime)
                          : "—"}
                      </TableCell>
                      <TableCell><StatusBadge status={booking.status} /></TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {timeAgo(booking.created_at)}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {booking.status === "pending" && (
                            <>
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() => handleStatusChange(booking.id, "confirmed")}
                              >
                                Confirm
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleStatusChange(booking.id, "cancelled")}
                              >
                                Cancel
                              </Button>
                            </>
                          )}
                          {booking.status === "confirmed" && (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleStatusChange(booking.id, "cancelled")}
                            >
                              Cancel
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
