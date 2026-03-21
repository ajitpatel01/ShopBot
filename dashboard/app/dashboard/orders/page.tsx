"use client"

import { useEffect, useState } from "react"
import { getShops, getOrders, updateOrderStatus, type Shop, type Order } from "@/lib/api"
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
import { ShoppingBag } from "lucide-react"
import { toast } from "sonner"

const STATUSES = ["all", "pending", "confirmed", "completed", "cancelled"] as const

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
    const params = filter !== "all" ? { status: filter } : {}
    getOrders(activeShopId, params)
      .then(({ orders }) => setOrders(orders))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  async function handleStatusChange(orderId: string, newStatus: string) {
    const prev = [...orders]
    // Optimistic update
    setOrders((o) => o.map((order) => order.id === orderId ? { ...order, status: newStatus as Order["status"] } : order))
    try {
      await updateOrderStatus(orderId, activeShopId, newStatus)
      toast.success(`Order ${newStatus}`)
    } catch (err) {
      setOrders(prev)
      toast.error(err instanceof Error ? err.message : "Failed to update status")
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Orders</h1>
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
      ) : orders.length === 0 ? (
        <EmptyState title="No orders" description="Orders will appear here once customers place them via WhatsApp" icon={ShoppingBag} />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{orders.length} order{orders.length !== 1 ? "s" : ""}</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">
                      {order.customer_name || order.customer_note || order.customer_phone || "Customer"}
                    </TableCell>
                    <TableCell className="max-w-[150px] truncate text-sm text-muted-foreground">
                      {order.items.map((i) => `${i.name} x${i.quantity}`).join(", ") || "—"}
                    </TableCell>
                    <TableCell>₹{order.total || 0}</TableCell>
                    <TableCell><StatusBadge status={order.status} /></TableCell>
                    <TableCell className="text-sm text-muted-foreground">{timeAgo(order.created_at)}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {order.status === "pending" && (
                          <>
                            <Button size="sm" variant="default" onClick={() => handleStatusChange(order.id, "confirmed")}>
                              Confirm
                            </Button>
                            <Button size="sm" variant="destructive" onClick={() => handleStatusChange(order.id, "cancelled")}>
                              Cancel
                            </Button>
                          </>
                        )}
                        {order.status === "confirmed" && (
                          <>
                            <Button size="sm" variant="default" onClick={() => handleStatusChange(order.id, "completed")}>
                              Complete
                            </Button>
                            <Button size="sm" variant="destructive" onClick={() => handleStatusChange(order.id, "cancelled")}>
                              Cancel
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
