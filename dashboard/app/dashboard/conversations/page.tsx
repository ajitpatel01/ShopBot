"use client"

import { useEffect, useState, useMemo, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { getShops, getConversations, deleteConversation, resolveConversation, type Shop, type Conversation } from "@/lib/api"
import { createBrowserClient } from "@/lib/supabase"
import { ShopSelector } from "@/components/ShopSelector"
import { LoadingSpinner } from "@/components/LoadingSpinner"
import { EmptyState } from "@/components/EmptyState"
import { MessageSquare, Search, Trash2, CheckCircle } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

const FILTER_TABS = ["all", "active", "resolved"] as const

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
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [filter, setFilter] = useState<string>("all")
  const [loading, setLoading] = useState(true)
  const [deleteTarget, setDeleteTarget] = useState<Conversation | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    getShops().then(({ shops }) => {
      setShops(shops)
      if (shops.length > 0) setActiveShopId(shops[0].id)
    }).catch(() => setLoading(false))
  }, [])

  const fetchConversations = useCallback(() => {
    if (!activeShopId) return
    setLoading(true)
    const params: Record<string, string> = {}
    if (debouncedSearch) params.search = debouncedSearch
    if (filter === "active") params.resolved = "false"
    else if (filter === "resolved") params.resolved = "true"

    getConversations(activeShopId, params)
      .then(({ conversations }) => setConversations(conversations))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [activeShopId, debouncedSearch, filter])

  useEffect(() => {
    fetchConversations()
  }, [fetchConversations])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => setDebouncedSearch(search), 300)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [search])

  useEffect(() => {
    if (!activeShopId) return
    const supabase = createBrowserClient()
    const channel = supabase
      .channel("conversations-" + activeShopId)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "conversations", filter: "shop_id=eq." + activeShopId },
        () => { fetchConversations() }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [activeShopId, fetchConversations])

  async function handleDelete() {
    if (!deleteTarget) return
    const prev = [...conversations]
    setConversations(c => c.filter(x => x.id !== deleteTarget.id))
    setDeleteTarget(null)
    try {
      await deleteConversation(deleteTarget.id, activeShopId)
      toast.success("Conversation deleted")
    } catch {
      setConversations(prev)
      toast.error("Failed to delete conversation")
    }
  }

  async function handleResolve(conv: Conversation, e: React.MouseEvent) {
    e.stopPropagation()
    const newResolved = !conv.resolved
    setConversations(c => c.map(x => x.id === conv.id ? { ...x, resolved: newResolved } : x))
    try {
      await resolveConversation(conv.id, activeShopId, newResolved)
      toast.success(newResolved ? "Marked as resolved" : "Marked as active")
    } catch {
      setConversations(c => c.map(x => x.id === conv.id ? { ...x, resolved: !newResolved } : x))
      toast.error("Failed to update")
    }
  }

  if (loading && conversations.length === 0) return <LoadingSpinner />

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-white">Conversations</h1>
        <ShopSelector shops={shops} activeShopId={activeShopId} onSelect={setActiveShopId} />
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#444]" />
        <input
          placeholder="Search by phone or name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-10 w-full rounded-lg border border-[#1f1f1f] bg-[#0a0a0a] pl-10 pr-3 text-sm text-white placeholder-[#444] transition-colors focus:border-[#333] focus:outline-none"
        />
      </div>

      <div className="flex gap-1 border-b border-[#1f1f1f]">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={cn(
              "border-b-2 px-4 py-2.5 text-sm font-medium capitalize transition-colors duration-150",
              filter === tab
                ? "border-white text-white"
                : "border-transparent text-[#555] hover:text-[#aaa]"
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {conversations.length === 0 ? (
        <EmptyState
          title="No conversations"
          description={search ? "No results match your search" : "Your bot is ready to receive messages"}
          icon={MessageSquare}
        />
      ) : (
        <div className="rounded-xl border border-[#1f1f1f] bg-[#0a0a0a]">
          {conversations.map((conv, i) => (
            <div
              key={conv.id}
              className={cn(
                "group relative flex w-full items-center gap-3 px-5 py-4 text-left transition-colors duration-100 hover:bg-[#0d0d0d]",
                i < conversations.length - 1 ? "border-b border-[#0f0f0f]" : "",
                conv.resolved && "opacity-40"
              )}
            >
              <button
                onClick={() => router.push(`/dashboard/conversations/${conv.id}`)}
                className="flex flex-1 items-center gap-3"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#1a1a1a] text-[13px] font-medium text-white">
                  {(conv.customer_name || conv.customer_phone || "?")[0].toUpperCase()}
                </div>
                <div className="flex-1 overflow-hidden">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-white">
                      {conv.customer_name || conv.customer_phone}
                    </p>
                    {conv.needs_owner_reply && (
                      <span className="h-1.5 w-1.5 rounded-full bg-white" />
                    )}
                    {conv.resolved && (
                      <CheckCircle className="h-3.5 w-3.5 text-[#22c55e]" />
                    )}
                  </div>
                  <p className="truncate text-xs text-[#555]">
                    {conv.latest_message || "No messages yet"}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-xs text-[#444]">
                    {timeAgo(conv.last_message_at || conv.created_at)}
                  </p>
                  <p className="text-xs text-[#333]">
                    {conv.message_count} msgs
                  </p>
                </div>
              </button>

              <div className="absolute right-4 top-1/2 flex -translate-y-1/2 gap-1 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                <button
                  onClick={(e) => handleResolve(conv, e)}
                  className="flex h-7 w-7 items-center justify-center rounded-lg transition-colors hover:bg-[#1a1a1a]"
                  title={conv.resolved ? "Mark active" : "Mark resolved"}
                >
                  <CheckCircle className={cn("h-4 w-4", conv.resolved ? "text-[#22c55e]" : "text-[#555] hover:text-[#22c55e]")} />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setDeleteTarget(conv) }}
                  className="flex h-7 w-7 items-center justify-center rounded-lg transition-colors hover:bg-[#1a1a1a]"
                  title="Delete conversation"
                >
                  <Trash2 className="h-4 w-4 text-[#555] transition-colors hover:text-[#ef4444]" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete conversation?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete all messages with {deleteTarget?.customer_name || deleteTarget?.customer_phone || "this customer"}. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  )
}
