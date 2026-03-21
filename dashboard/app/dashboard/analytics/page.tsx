"use client"

import { useEffect, useState, useMemo } from "react"
import { motion } from "framer-motion"
import {
  getShops,
  getStats,
  getRevenueStats,
  getPeakHoursStats,
  getTopItemsStats,
  getCustomerStats,
  type Shop,
  type Stats,
  type RevenueDay,
  type PeakHourEntry,
  type TopItem,
  type CustomerStats,
} from "@/lib/api"
import { ShopSelector } from "@/components/ShopSelector"
import { LoadingSpinner } from "@/components/LoadingSpinner"
import { StatCard } from "@/components/StatCard"
import { DollarSign, ShoppingBag, Users, TrendingUp } from "lucide-react"
import {
  AreaChart,
  Area,
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
import { cn } from "@/lib/utils"

const PIE_COLORS = ["#ffffff", "#a0a0a0", "#555555", "#2a2a2a", "#1a1a1a"]
const RANGE_OPTIONS = [
  { label: "7d", days: 7 },
  { label: "14d", days: 14 },
  { label: "30d", days: 30 },
  { label: "90d", days: 90 },
]
const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

function getHeatColor(count: number) {
  if (count === 0) return "bg-[#0a0a0a]"
  if (count <= 2) return "bg-[#1a2a1a]"
  if (count <= 5) return "bg-[#1e4a1e]"
  if (count <= 10) return "bg-[#22c55e40]"
  return "bg-[#22c55e80]"
}

const DarkTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; name?: string }>; label?: string }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-[#1f1f1f] bg-[#111] px-3 py-2 text-xs">
      <p className="text-[#666]">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="font-medium text-white">
          {p.name === "revenue" ? "₹" : ""}{typeof p.value === "number" ? p.value.toLocaleString("en-IN") : p.value}
        </p>
      ))}
    </div>
  )
}

export default function AnalyticsPage() {
  const [shops, setShops] = useState<Shop[]>([])
  const [activeShopId, setActiveShopId] = useState("")
  const [rangeDays, setRangeDays] = useState(30)
  const [loading, setLoading] = useState(true)

  const [stats, setStats] = useState<Stats | null>(null)
  const [revenueData, setRevenueData] = useState<RevenueDay[]>([])
  const [peakHours, setPeakHours] = useState<PeakHourEntry[]>([])
  const [topItems, setTopItems] = useState<TopItem[]>([])
  const [customerStats, setCustomerStats] = useState<CustomerStats | null>(null)

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

    const now = new Date()
    const from = new Date(now.getTime() - rangeDays * 24 * 60 * 60 * 1000).toISOString()
    const to = now.toISOString()

    Promise.all([
      getStats(activeShopId).catch(() => ({ totalMessages: 0, inboundMessages: 0, intentBreakdown: {}, escalations: 0 })),
      getRevenueStats(activeShopId, from, to).catch(() => ({ revenueByDay: [] })),
      getPeakHoursStats(activeShopId).catch(() => ({ peakHours: [] })),
      getTopItemsStats(activeShopId).catch(() => ({ topItems: [] })),
      getCustomerStats(activeShopId, from).catch(() => ({ newCustomers: 0, returningCustomers: 0, totalCustomers: 0, retentionRate: 0 })),
    ]).then(([statsData, revData, peakData, itemsData, custData]) => {
      setStats(statsData as Stats)
      setRevenueData(revData.revenueByDay)
      setPeakHours(peakData.peakHours)
      setTopItems(itemsData.topItems)
      setCustomerStats(custData as CustomerStats)
    }).finally(() => setLoading(false))
  }, [activeShopId, rangeDays])

  const totalRevenue = useMemo(() => revenueData.reduce((sum, d) => sum + d.revenue, 0), [revenueData])
  const totalOrders = useMemo(() => revenueData.reduce((sum, d) => sum + d.order_count, 0), [revenueData])

  const intentData = useMemo(() => {
    if (!stats) return []
    return Object.entries(stats.intentBreakdown).map(([name, value]) => ({ name, value }))
  }, [stats])

  const peakMatrix = useMemo(() => {
    const m: Record<string, number> = {}
    for (const entry of peakHours) {
      m[entry.day_of_week + ":" + entry.hour] = entry.message_count
    }
    return m
  }, [peakHours])

  const topItemsChart = useMemo(() => topItems.slice(0, 8).reverse(), [topItems])

  if (loading) return <LoadingSpinner />

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-8"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-white">Analytics</h1>
        <div className="flex items-center gap-3">
          <div className="flex gap-1 rounded-lg border border-[#1f1f1f] bg-[#0a0a0a] p-1">
            {RANGE_OPTIONS.map((opt) => (
              <button
                key={opt.days}
                onClick={() => setRangeDays(opt.days)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-xs font-medium transition-colors duration-150",
                  rangeDays === opt.days
                    ? "bg-white text-black"
                    : "bg-transparent text-[#666] hover:text-[#aaa]"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <ShopSelector shops={shops} activeShopId={activeShopId} onSelect={setActiveShopId} />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Total Revenue" value={totalRevenue} icon={DollarSign} color="green" prefix="₹" />
        <StatCard title="Total Orders" value={totalOrders} icon={ShoppingBag} color="blue" />
        <StatCard title="New Customers" value={customerStats?.newCustomers || 0} icon={Users} color="white" />
        <StatCard title="Retention Rate" value={customerStats?.retentionRate || 0} icon={TrendingUp} color="purple" suffix="%" />
      </div>

      {/* Revenue Chart */}
      <div className="rounded-xl border border-[#1f1f1f] bg-[#0a0a0a] p-6">
        <h2 className="mb-4 text-sm font-medium text-white">Revenue Over Time</h2>
        {revenueData.length === 0 ? (
          <p className="flex h-[300px] items-center justify-center text-sm text-[#555]">
            No confirmed revenue yet
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={revenueData}>
              <defs>
                <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#1f1f1f" strokeDasharray="4 4" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: "#555" }}
                axisLine={{ stroke: "#1f1f1f" }}
                tickLine={false}
                tickFormatter={(d: string) => {
                  const dt = new Date(d)
                  return dt.toLocaleDateString("en-IN", { day: "numeric", month: "short" })
                }}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#555" }}
                axisLine={{ stroke: "#1f1f1f" }}
                tickLine={false}
                tickFormatter={(v: number) => "₹" + v.toLocaleString("en-IN")}
              />
              <Tooltip content={<DarkTooltip />} cursor={{ stroke: "#ffffff20" }} />
              <Area type="monotone" dataKey="revenue" stroke="#22c55e" strokeWidth={2} fill="url(#revenueGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Peak Hours + Intent Breakdown */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Peak Hours Heatmap */}
        <div className="rounded-xl border border-[#1f1f1f] bg-[#0a0a0a] p-6">
          <h2 className="mb-1 text-sm font-medium text-white">Peak Hours (Last 30 Days)</h2>
          <p className="mb-4 text-xs text-[#555]">Darker green = more customer messages</p>
          <div className="overflow-x-auto">
            <div className="min-w-[500px]">
              {/* Hour labels */}
              <div className="mb-1 flex pl-10">
                {Array.from({ length: 24 }, (_, i) => i).map((h) => (
                  <div key={h} className="flex-1 text-center text-[9px] text-[#444]">
                    {h % 6 === 0 ? h : ""}
                  </div>
                ))}
              </div>
              {/* Grid rows */}
              {DAY_LABELS.map((day, dow) => (
                <div key={dow} className="flex items-center gap-1">
                  <span className="w-9 text-right text-[10px] text-[#555]">{day}</span>
                  <div className="flex flex-1 gap-[2px]">
                    {Array.from({ length: 24 }, (_, h) => {
                      const count = peakMatrix[dow + ":" + h] || 0
                      return (
                        <div
                          key={h}
                          className={cn("aspect-square flex-1 rounded-[2px] transition-colors", getHeatColor(count))}
                          title={`${day} ${h}:00 — ${count} messages`}
                        />
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Intent Breakdown */}
        <div className="rounded-xl border border-[#1f1f1f] bg-[#0a0a0a] p-6">
          <h2 className="mb-4 text-sm font-medium text-white">Intent Breakdown</h2>
          {intentData.length === 0 ? (
            <p className="flex h-[280px] items-center justify-center text-sm text-[#555]">
              No intent data yet
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={intentData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={100}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                  stroke="#0a0a0a"
                  strokeWidth={2}
                >
                  {intentData.map((_, index) => (
                    <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#111",
                    border: "1px solid #1f1f1f",
                    borderRadius: "8px",
                    fontSize: "12px",
                    color: "#fff",
                  }}
                />
                <Legend wrapperStyle={{ fontSize: "12px", color: "#666" }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Top Items + Customer Breakdown */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Top Ordered Items */}
        <div className="rounded-xl border border-[#1f1f1f] bg-[#0a0a0a] p-6">
          <h2 className="mb-4 text-sm font-medium text-white">Top Ordered Items</h2>
          {topItemsChart.length === 0 ? (
            <p className="flex h-[280px] items-center justify-center text-sm text-[#555]">
              No order data yet
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={topItemsChart} layout="vertical">
                <CartesianGrid stroke="#1f1f1f" strokeDasharray="4 4" horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fontSize: 11, fill: "#555" }}
                  axisLine={{ stroke: "#1f1f1f" }}
                  tickLine={false}
                  allowDecimals={false}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 11, fill: "#aaa" }}
                  axisLine={{ stroke: "#1f1f1f" }}
                  tickLine={false}
                  width={100}
                />
                <Tooltip content={<DarkTooltip />} cursor={{ fill: "#ffffff08" }} />
                <Bar dataKey="quantity" fill="#ffffff" radius={[0, 4, 4, 0]} barSize={20} label={{ position: "right", fill: "#666", fontSize: 11 }} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Customer Breakdown */}
        <div className="rounded-xl border border-[#1f1f1f] bg-[#0a0a0a] p-6">
          <h2 className="mb-6 text-sm font-medium text-white">Customer Breakdown</h2>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-3xl font-extrabold text-white">{customerStats?.newCustomers || 0}</p>
              <p className="mt-1 text-[11px] text-[#555]">New this period</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-extrabold text-[#aaa]">{customerStats?.returningCustomers || 0}</p>
              <p className="mt-1 text-[11px] text-[#555]">Returning</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-extrabold text-[#22c55e]">{customerStats?.retentionRate || 0}%</p>
              <p className="mt-1 text-[11px] text-[#555]">Retention</p>
            </div>
          </div>
          <div className="mt-8 flex justify-center">
            <ResponsiveContainer width={180} height={180}>
              <PieChart>
                <Pie
                  data={[
                    { name: "New", value: customerStats?.newCustomers || 0 },
                    { name: "Returning", value: customerStats?.returningCustomers || 0 },
                  ]}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  dataKey="value"
                  stroke="#0a0a0a"
                  strokeWidth={2}
                >
                  <Cell fill="#ffffff" />
                  <Cell fill="#333333" />
                </Pie>
                <Legend wrapperStyle={{ fontSize: "11px", color: "#666" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
