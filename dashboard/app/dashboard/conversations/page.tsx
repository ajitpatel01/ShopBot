"use client"

import { useEffect, useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { getShops, getConversations, type Shop, type Conversation } from "@/lib/api"
import { createBrowserClient } from "@/lib/supabase"
import { ShopSelector } from "@/components/ShopSelector"
import { LoadingSpinner } from "@/components/LoadingSpinner"
import { EmptyState } from "@/components/EmptyState"
import { Input } from "@/components/ui/input"
import { MessageSquare, Search } from "lucide-react"

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

export default function ConversationsPage() {
  const router = useRouter()
  const [shops, setShops] = useState<Shop[]>([])
  const [activeShopId, setActiveShopId] = useState("")
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [search, setSearch] = useState("")
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
    getConversations(activeShopId)
      .then(({ conversations }) => setConversations(conversations))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [activeShopId])

  // Realtime subscription
  useEffect(() => {
    if (!activeShopId) return
    const supabase = createBrowserClient()
    const channel = supabase
      .channel("conversations-" + activeShopId)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "conversations", filter: "shop_id=eq." + activeShopId },
        () => {
          getConversations(activeShopId)
            .then(({ conversations }) => setConversations(conversations))
            .catch(() => {})
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [activeShopId])

  const filtered = useMemo(() => {
    if (!search) return conversations
    const q = search.toLowerCase()
    return conversations.filter(
      (c) =>
        c.customer_phone?.toLowerCase().includes(q) ||
        c.customer_name?.toLowerCase().includes(q)
    )
  }, [conversations, search])

  if (loading) return <LoadingSpinner />

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Conversations</h1>
        <ShopSelector shops={shops} activeShopId={activeShopId} onSelect={setActiveShopId} />
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by phone or name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="No conversations"
          description={search ? "No results match your search" : "Your bot is ready to receive messages"}
          icon={MessageSquare}
        />
      ) : (
        <div className="space-y-2">
          {filtered.map((conv) => (
            <button
              key={conv.id}
              onClick={() => router.push(`/dashboard/conversations/${conv.id}`)}
              className="flex w-full items-center gap-3 rounded-lg border p-4 text-left transition-colors hover:bg-accent"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
                {(conv.customer_name || conv.customer_phone || "?")[0].toUpperCase()}
              </div>
              <div className="flex-1 overflow-hidden">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium">
                    {conv.customer_name || conv.customer_phone}
                  </p>
                  {conv.needs_owner_reply && (
                    <span className="h-2 w-2 rounded-full bg-red-500" />
                  )}
                </div>
                <p className="truncate text-xs text-muted-foreground">
                  {conv.latest_message || "No messages yet"}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-xs text-muted-foreground">
                  {timeAgo(conv.last_message_at || conv.created_at)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {conv.message_count} msgs
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
