"use client"

import { useEffect, useState } from "react"
import { getShops, getStats, type Shop, type Stats } from "@/lib/api"
import { ShopSelector } from "@/components/ShopSelector"
import { LoadingSpinner } from "@/components/LoadingSpinner"
import { StatCard } from "@/components/StatCard"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MessageSquare, ShoppingBag, Calendar, AlertCircle } from "lucide-react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts"

const PIE_COLORS: Record<string, string> = {
  faq: "#3b82f6",
  order: "#22c55e",
  booking: "#a855f7",
  escalation: "#ef4444",
  complaint: "#f97316",
  other: "#6b7280",
}

export default function AnalyticsPage() {
  const [shops, setShops] = useState<Shop[]>([])
  const [activeShopId, setActiveShopId] = useState("")
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getShops()
      .then(({ shops }) => {
        setShops(shops)
        if (shops.length > 0) setActiveShopId(shops[0].id)
      })
      .catch(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!activeShopId) return
    setLoading(true)
    getStats(activeShopId)
      .then((data) => setStats(data))
      .catch(() => setStats({ totalMessages: 0, inboundMessages: 0, intentBreakdown: {}, escalations: 0 }))
      .finally(() => setLoading(false))
  }, [activeShopId])

  if (loading) return <LoadingSpinner />
  if (!stats) return null

  // Build daily message data (placeholder — real per-day data would come from a dedicated endpoint)
  const dailyData = Array.from({ length: 30 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (29 - i))
    return {
      date: d.toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
      messages: i === 29 ? stats.totalMessages : 0,
    }
  })
  // Distribute total messages across the last bar to show something meaningful
  if (stats.totalMessages > 0) {
    dailyData[29].messages = stats.totalMessages
  }

  const intentData = Object.entries(stats.intentBreakdown).map(([name, value]) => ({
    name,
    value,
  }))

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Analytics</h1>
        <ShopSelector shops={shops} activeShopId={activeShopId} onSelect={setActiveShopId} />
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Total Messages" value={stats.totalMessages} icon={MessageSquare} color="blue" />
        <StatCard title="Inbound Messages" value={stats.inboundMessages} icon={MessageSquare} color="green" />
        <StatCard
          title="Orders Captured"
          value={stats.intentBreakdown.order || 0}
          icon={ShoppingBag}
          color="amber"
        />
        <StatCard title="Escalations" value={stats.escalations} icon={AlertCircle} color="red" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Messages per day */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Messages (Last 30 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} interval={4} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="messages" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Intent breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Intent Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            {intentData.length === 0 ? (
              <p className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
                No intent data yet
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={intentData}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {intentData.map((entry) => (
                      <Cell key={entry.name} fill={PIE_COLORS[entry.name] || PIE_COLORS.other} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
