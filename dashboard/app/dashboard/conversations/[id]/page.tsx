"use client"

import { useEffect, useState, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { getShops, getMessages, getConversations, addConversationNote, type Message, type Conversation } from "@/lib/api"
import { createBrowserClient } from "@/lib/supabase"
import { LoadingSpinner } from "@/components/LoadingSpinner"
import { ArrowLeft, AlertTriangle, User, ChevronDown, ChevronUp, Save } from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import Link from "next/link"

const intentColors: Record<string, string> = {
  faq: "bg-[#a855f715] text-[#a855f7] border-[#a855f730]",
  order: "bg-[#22c55e15] text-[#22c55e] border-[#22c55e30]",
  booking: "bg-[#3b82f615] text-[#3b82f6] border-[#3b82f630]",
  escalation: "bg-[#ef444415] text-[#ef4444] border-[#ef444430]",
  complaint: "bg-[#f59e0b15] text-[#f59e0b] border-[#f59e0b30]",
  other: "bg-[#55555515] text-[#888] border-[#55555530]",
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "numeric",
    month: "short",
  })
}

export default function ConversationDetailPage() {
  const params = useParams()
  const router = useRouter()
  const conversationId = params.id as string
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const [messages, setMessages] = useState<Message[]>([])
  const [shopId, setShopId] = useState("")
  const [shopsReady, setShopsReady] = useState(false)
  const [loading, setLoading] = useState(true)
  const [needsAttention, setNeedsAttention] = useState(false)
  const [conversation, setConversation] = useState<Conversation | null>(null)
  const [note, setNote] = useState("")
  const [notesOpen, setNotesOpen] = useState(false)
  const [savingNote, setSavingNote] = useState(false)

  useEffect(() => {
    getShops()
      .then(({ shops }) => {
        if (shops.length > 0) setShopId(shops[0].id)
      })
      .catch(() => {})
      .finally(() => setShopsReady(true))
  }, [])

  useEffect(() => {
    if (!shopsReady) return
    if (!shopId || !conversationId) {
      setLoading(false)
      return
    }
    setLoading(true)

    Promise.all([
      getMessages(conversationId, shopId),
      getConversations(shopId, { limit: "100" }),
    ])
      .then(([msgData, convData]) => {
        setMessages(msgData.messages)
        const conv = convData.conversations.find(c => c.id === conversationId)
        if (conv) {
          setConversation(conv)
          setNote(conv.owner_note || "")
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [shopsReady, shopId, conversationId])

  useEffect(() => {
    if (!conversationId) return
    const supabase = createBrowserClient()
    const channel = supabase
      .channel("messages-" + conversationId)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: "conversation_id=eq." + conversationId,
        },
        (payload) => {
          const newMsg = payload.new as Message
          setMessages((prev) => [...prev, newMsg])
          if (newMsg.needs_owner_reply) setNeedsAttention(true)
        }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [conversationId])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

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

  if (shopsReady && !shopId) {
    return (
      <div className="space-y-4 p-2">
        <button
          type="button"
          onClick={() => router.push("/dashboard/conversations")}
          className="flex items-center gap-2 text-sm text-[#666] hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <p className="text-[#888]">
          No shop found. Add a shop in Settings with your bot&apos;s WhatsApp number, then open this conversation again.
        </p>
      </div>
    )
  }

  const customerName = conversation?.customer_name || conversation?.customer_phone || "Customer"
  const customerPhone = conversation?.customer_phone || ""

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex h-[calc(100vh-8rem)] flex-col"
    >
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-[#1f1f1f] pb-4">
        <button
          onClick={() => router.push("/dashboard/conversations")}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-[#666] transition-colors hover:bg-[#111] hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-white">{customerName}</p>
            <Link
              href={`/dashboard/conversations/${conversationId}/customer`}
              className="flex items-center gap-1 text-xs text-[#555] transition-colors hover:text-white"
            >
              <User className="h-3 w-3" />
              View Profile
            </Link>
          </div>
          <p className="text-xs text-[#555]">{customerPhone} · {messages.length} messages</p>
        </div>
      </div>

      {needsAttention && (
        <div className="mt-2 flex items-center gap-2 rounded-lg border border-[#ef444430] bg-[#ef444410] px-4 py-2 text-[13px] text-[#ef4444]">
          <AlertTriangle className="h-4 w-4" />
          This customer needs your personal attention
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 space-y-3 overflow-y-auto py-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={cn(
              "flex max-w-[70%] flex-col gap-1",
              msg.direction === "inbound" ? "items-start" : "ml-auto items-end"
            )}
          >
            <div
              className={cn(
                "rounded-2xl px-4 py-2.5 text-sm",
                msg.direction === "inbound"
                  ? "rounded-tl-sm bg-[#111] text-[#ccc]"
                  : "rounded-tr-sm bg-[#1a1a1a] text-white"
              )}
            >
              {msg.content}
            </div>
            <div className="flex items-center gap-2 px-1">
              <span className="text-[11px] text-[#444]">
                {formatTime(msg.created_at)}
              </span>
              {msg.intent && (
                <span
                  className={cn(
                    "inline-flex items-center rounded-full border px-1.5 py-0 text-[10px] font-medium",
                    intentColors[msg.intent] || intentColors.other
                  )}
                >
                  {msg.intent}
                </span>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Owner Notes */}
      <div className="border-t border-[#1f1f1f] pt-3">
        <button
          onClick={() => setNotesOpen(!notesOpen)}
          className="flex w-full items-center justify-between text-xs font-medium text-[#555] transition-colors hover:text-white"
        >
          <span>Owner Notes (private)</span>
          {notesOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>
        {notesOpen && (
          <div className="mt-2 space-y-2">
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add a private note about this customer..."
              rows={3}
              className="w-full resize-none rounded-lg border border-[#1f1f1f] bg-[#0a0a0a] px-3 py-2 text-sm text-[#aaa] placeholder-[#333] transition-colors focus:border-[#333] focus:outline-none"
            />
            <button
              onClick={handleSaveNote}
              disabled={savingNote}
              className="flex items-center gap-1.5 rounded-lg border border-[#1f1f1f] px-3 py-1.5 text-xs font-medium text-[#888] transition-colors hover:border-[#2a2a2a] hover:text-white disabled:opacity-50"
            >
              <Save className="h-3 w-3" />
              {savingNote ? "Saving..." : "Save note"}
            </button>
          </div>
        )}
      </div>
    </motion.div>
  )
}
