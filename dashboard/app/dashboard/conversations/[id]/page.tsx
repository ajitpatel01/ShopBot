"use client"

import { useEffect, useState, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import { getShops, getMessages, type Message } from "@/lib/api"
import { createBrowserClient } from "@/lib/supabase"
import { LoadingSpinner } from "@/components/LoadingSpinner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowLeft, AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"

const intentColors: Record<string, string> = {
  faq: "bg-blue-100 text-blue-700",
  order: "bg-green-100 text-green-700",
  booking: "bg-purple-100 text-purple-700",
  escalation: "bg-red-100 text-red-700",
  complaint: "bg-orange-100 text-orange-700",
  other: "bg-gray-100 text-gray-600",
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
  const [loading, setLoading] = useState(true)
  const [needsAttention, setNeedsAttention] = useState(false)

  useEffect(() => {
    getShops().then(({ shops }) => {
      if (shops.length > 0) setShopId(shops[0].id)
    })
  }, [])

  useEffect(() => {
    if (!shopId || !conversationId) return
    setLoading(true)
    getMessages(conversationId, shopId)
      .then(({ messages }) => {
        setMessages(messages)
        setNeedsAttention(messages.some((m) => m.needs_owner_reply))
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [shopId, conversationId])

  // Realtime subscription for new messages
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

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  if (loading) return <LoadingSpinner />

  const customerInfo = messages[0]
    ? messages.find((m) => m.direction === "inbound")
    : null

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 border-b pb-4">
        <Button variant="ghost" size="sm" onClick={() => router.push("/dashboard/conversations")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <p className="font-medium">Conversation</p>
          <p className="text-sm text-muted-foreground">{messages.length} messages</p>
        </div>
      </div>

      {/* Needs attention banner */}
      {needsAttention && (
        <div className="mt-2 flex items-center gap-2 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">
          <AlertTriangle className="h-4 w-4" />
          Needs your attention — a customer message was escalated
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto py-4 space-y-3">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={cn(
              "flex flex-col max-w-[75%] gap-1",
              msg.direction === "inbound" ? "items-start" : "ml-auto items-end"
            )}
          >
            <div
              className={cn(
                "rounded-2xl px-4 py-2.5 text-sm",
                msg.direction === "inbound"
                  ? "bg-muted text-foreground rounded-bl-sm"
                  : "bg-primary text-primary-foreground rounded-br-sm"
              )}
            >
              {msg.content}
            </div>
            <div className="flex items-center gap-2 px-1">
              <span className="text-[11px] text-muted-foreground">
                {formatTime(msg.created_at)}
              </span>
              {msg.intent && (
                <Badge
                  variant="secondary"
                  className={cn("text-[10px] px-1.5 py-0", intentColors[msg.intent] || intentColors.other)}
                >
                  {msg.intent}
                </Badge>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
    </div>
  )
}
