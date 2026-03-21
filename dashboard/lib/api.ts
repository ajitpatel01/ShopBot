"use client"

import { createBrowserClient } from "@/lib/supabase"

const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001"

async function getAuthHeader(): Promise<Record<string, string>> {
  const supabase = createBrowserClient()
  const { data: { session } } = await supabase.auth.getSession()
  return session ? { Authorization: "Bearer " + session.access_token } : {}
}

async function apiRequest<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
  const authHeader = await getAuthHeader()
  const response = await fetch(BASE_URL + path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...authHeader,
      ...options.headers,
    },
  })
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Request failed" }))
    throw new Error(error.error || "Request failed")
  }
  return response.json()
}

export function getShops() {
  return apiRequest<{ shops: Shop[]; count: number }>("/shops")
}

export function getShop(id: string) {
  return apiRequest<{ shop: Shop }>("/shops/" + id)
}

export function updateShop(id: string, data: Partial<Shop>) {
  return apiRequest<{ shop: Shop }>("/shops/" + id, {
    method: "PUT",
    body: JSON.stringify(data),
  })
}

export function getConversations(shopId: string, params?: Record<string, string>) {
  const query = new URLSearchParams({ shop_id: shopId, ...params }).toString()
  return apiRequest<{ conversations: Conversation[]; count: number }>("/conversations?" + query)
}

export function getMessages(conversationId: string, shopId: string) {
  return apiRequest<{ messages: Message[] }>(
    "/conversations/" + conversationId + "/messages?shop_id=" + shopId
  )
}

export function getOrders(shopId: string, params?: Record<string, string>) {
  const query = new URLSearchParams({ shop_id: shopId, ...params }).toString()
  return apiRequest<{ orders: Order[]; count: number }>("/orders?" + query)
}

export function updateOrderStatus(orderId: string, shopId: string, status: string) {
  return apiRequest<{ order: Order }>("/orders/" + orderId + "/status?shop_id=" + shopId, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  })
}

export function getBookings(shopId: string, params?: Record<string, string>) {
  const query = new URLSearchParams({ shop_id: shopId, ...params }).toString()
  return apiRequest<{ bookings: Booking[]; count: number }>("/bookings?" + query)
}

export function updateBookingStatus(bookingId: string, shopId: string, status: string) {
  return apiRequest<{ booking: Booking }>("/bookings/" + bookingId + "/status?shop_id=" + shopId, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  })
}

export function getStats(shopId: string) {
  const now = new Date().toISOString()
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  return apiRequest<Stats>(
    "/conversations/stats?shop_id=" + shopId + "&from=" + thirtyDaysAgo + "&to=" + now
  )
}

// ── Types ──

export interface Shop {
  id: string
  owner_id: string
  name: string
  type: string
  whatsapp_number: string
  owner_whatsapp: string
  menu: MenuItem[]
  hours: Record<string, { open: boolean; start?: string; end?: string }>
  faqs: FAQ[]
  bot_tone: "formal" | "friendly" | "casual"
  plan: string
  subscription_status: string
  trial_ends_at: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface MenuItem {
  name: string
  price: number
  category?: string
  description?: string
}

export interface FAQ {
  question: string
  answer: string
}

export interface Conversation {
  id: string
  shop_id: string
  customer_phone: string
  customer_name: string | null
  last_message_at: string
  message_count: number
  created_at: string
  latest_message?: string
  needs_owner_reply?: boolean
  resolved?: boolean
  owner_note?: string
}

export interface Message {
  id: string
  conversation_id: string
  shop_id: string
  direction: "inbound" | "outbound"
  content: string
  intent: string | null
  needs_owner_reply: boolean
  created_at: string
}

export interface Order {
  id: string
  shop_id: string
  conversation_id: string
  items: OrderItem[]
  total: number
  status: "pending" | "confirmed" | "cancelled" | "completed"
  customer_note: string | null
  created_at: string
  customer_phone?: string
  customer_name?: string
}

export interface OrderItem {
  name: string
  quantity: number
  price: number
}

export interface Booking {
  id: string
  shop_id: string
  conversation_id: string
  service: string
  booking_datetime: string
  customer_name: string | null
  status: "pending" | "confirmed" | "cancelled"
  created_at: string
  customer_phone?: string
}

export interface Stats {
  totalMessages: number
  inboundMessages: number
  intentBreakdown: Record<string, number>
  escalations: number
}

export interface RevenueDay {
  date: string
  revenue: number
  order_count: number
}

export interface PeakHourEntry {
  day_of_week: number
  hour: number
  message_count: number
}

export interface TopItem {
  name: string
  quantity: number
  revenue: number
}

export interface CustomerStats {
  newCustomers: number
  returningCustomers: number
  totalCustomers: number
  retentionRate: number
}

export interface CustomerProfile {
  conversation: Conversation
  orders: Order[]
  bookings: Booking[]
  messageStats: { total: number; first_message: string | null; last_message: string | null }
  totalSpend: number
}

export function deleteConversation(conversationId: string, shopId: string) {
  return apiRequest<{ success: boolean; deleted: string }>(
    "/conversations/" + conversationId + "?shop_id=" + shopId,
    { method: "DELETE" }
  )
}

export function resolveConversation(conversationId: string, shopId: string, resolved: boolean) {
  return apiRequest<{ conversation: Conversation }>(
    "/conversations/" + conversationId + "/resolve?shop_id=" + shopId,
    { method: "PATCH", body: JSON.stringify({ resolved }) }
  )
}

export function addConversationNote(conversationId: string, shopId: string, note: string) {
  return apiRequest<{ conversation: Conversation }>(
    "/conversations/" + conversationId + "/note?shop_id=" + shopId,
    { method: "PATCH", body: JSON.stringify({ note }) }
  )
}

export function broadcastMessage(shopId: string, message: string, type: string) {
  return apiRequest<{ sent: number; failed: number }>(
    "/shops/" + shopId + "/broadcast",
    { method: "POST", body: JSON.stringify({ message, type }) }
  )
}

export function getRevenueStats(shopId: string, from: string, to: string) {
  return apiRequest<{ revenueByDay: RevenueDay[] }>(
    "/conversations/stats/revenue?shop_id=" + shopId + "&from=" + from + "&to=" + to
  )
}

export function getPeakHoursStats(shopId: string) {
  return apiRequest<{ peakHours: PeakHourEntry[] }>(
    "/conversations/stats/peak-hours?shop_id=" + shopId
  )
}

export function getTopItemsStats(shopId: string) {
  return apiRequest<{ topItems: TopItem[] }>(
    "/conversations/stats/top-items?shop_id=" + shopId
  )
}

export function getCustomerStats(shopId: string, from?: string) {
  const query = "/conversations/stats/customers?shop_id=" + shopId + (from ? "&from=" + from : "")
  return apiRequest<CustomerStats>(query)
}

export function getCustomerProfile(conversationId: string, shopId: string) {
  return apiRequest<CustomerProfile>(
    "/conversations/" + conversationId + "/customer-profile?shop_id=" + shopId
  )
}

// ── Referral ──

export interface ReferralStats {
  code: string | null
  referralUrl: string | null
  totalReferrals: number
  pendingReferrals: number
  monthsEarned: number
  nextRewardAt: number
  redemptions?: Array<{
    id: string
    referrer_rewarded: boolean
    created_at: string
    rewarded_at: string | null
  }>
}

export function getReferralCode() {
  return apiRequest<{ code: string; referralUrl: string; stats: ReferralStats }>("/referral/my-code")
}

export function getReferralStats(shopId: string) {
  return apiRequest<ReferralStats>("/referral/stats?shop_id=" + shopId)
}

export function redeemReferralCode(code: string, shopId: string) {
  return apiRequest<{ success: boolean; extraDays: number; newTrialEndsAt: string }>("/referral/redeem", {
    method: "POST",
    body: JSON.stringify({ code, shopId }),
  })
}

// ── Public Shop ──

export interface PublicShop {
  id: string
  name: string
  type: string
  menu: MenuItem[]
  hours: Record<string, { open: boolean; start?: string; end?: string }>
  faqs: FAQ[]
  bot_tone: string
  whatsapp_number: string
  is_active: boolean
  slug: string
}

export function getPublicShop(slug: string) {
  return fetch(BASE_URL + "/public/shop/" + slug).then((res) => {
    if (!res.ok) throw new Error("Shop not found")
    return res.json() as Promise<PublicShop>
  })
}
