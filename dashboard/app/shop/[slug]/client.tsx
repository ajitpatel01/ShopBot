"use client"

import { useState } from "react"
import { MessageCircle, Clock, ChevronDown, ChevronUp } from "lucide-react"

interface ShopData {
  id: string
  name: string
  type: string
  menu: Array<{ name: string; price: number; category?: string; description?: string }>
  hours: Record<string, { open: boolean; start?: string; end?: string }>
  faqs: Array<{ question: string; answer: string }>
  bot_tone: string
  whatsapp_number: string
  is_active: boolean
  slug: string
}

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

const TYPE_LABELS: Record<string, string> = {
  restaurant: "Restaurant",
  salon: "Salon",
  pharmacy: "Pharmacy",
  grocery: "Grocery",
  other: "Business",
}

function getWhatsAppLink(number: string, text?: string) {
  const clean = number.replace(/[^0-9]/g, "")
  return "https://wa.me/" + clean + (text ? "?text=" + encodeURIComponent(text) : "?text=" + encodeURIComponent("Hi!"))
}

function isOpenNow(hours: ShopData["hours"]) {
  const now = new Date()
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
  const today = dayNames[now.getDay()]
  const todayHours = hours[today] || hours[today.toLowerCase()]
  if (!todayHours || !todayHours.open) return false
  if (!todayHours.start || !todayHours.end) return true
  const currentTime = now.getHours().toString().padStart(2, "0") + ":" + now.getMinutes().toString().padStart(2, "0")
  return currentTime >= todayHours.start && currentTime <= todayHours.end
}

function getTodayClosing(hours: ShopData["hours"]) {
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
  const today = dayNames[new Date().getDay()]
  const todayHours = hours[today] || hours[today.toLowerCase()]
  if (!todayHours || !todayHours.open || !todayHours.end) return null
  return todayHours.end
}

export default function PublicShopClient({ shop }: { shop: ShopData }) {
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null)
  const open = isOpenNow(shop.hours)
  const closing = getTodayClosing(shop.hours)

  const menuCategories: Record<string, typeof shop.menu> = {}
  if (shop.menu && shop.menu.length > 0) {
    for (const item of shop.menu) {
      const cat = item.category || "Menu"
      if (!menuCategories[cat]) menuCategories[cat] = []
      menuCategories[cat].push(item)
    }
  }

  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
  const todayName = dayNames[new Date().getDay()]

  return (
    <div className="min-h-screen bg-black">
      <div className="mx-auto max-w-2xl px-4 py-8 sm:py-12">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">{shop.name}</h1>
          <div className="mt-3 flex items-center justify-center gap-3">
            <span className="rounded-full border border-[#1f1f1f] bg-[#0a0a0a] px-3 py-1 text-xs font-medium text-[#a0a0a0]">
              {TYPE_LABELS[shop.type] || shop.type}
            </span>
            <span className="flex items-center gap-1.5 text-xs">
              <span className={"inline-block h-2 w-2 rounded-full " + (open ? "bg-[#22c55e]" : "bg-[#ef4444]")} />
              <span className={open ? "text-[#22c55e]" : "text-[#ef4444]"}>
                {open ? "Open now" : "Closed"}
              </span>
            </span>
          </div>
          {open && closing && (
            <p className="mt-1 text-xs text-[#555]">Open until {closing} tonight</p>
          )}
        </div>

        {/* WhatsApp CTA */}
        <a
          href={getWhatsAppLink(shop.whatsapp_number)}
          target="_blank"
          rel="noopener noreferrer"
          className="group mb-10 flex w-full items-center justify-center gap-3 rounded-2xl bg-[#25D366] px-6 py-4 text-lg font-semibold text-white transition-all duration-150 hover:bg-[#20bd5a] hover:shadow-[0_0_30px_rgba(37,211,102,0.2)]"
        >
          <MessageCircle className="h-6 w-6 animate-pulse" />
          Chat with us on WhatsApp
        </a>

        {/* Menu */}
        {Object.keys(menuCategories).length > 0 && (
          <section className="mb-10">
            <h2 className="mb-4 text-lg font-semibold text-white">Our Menu</h2>
            {Object.entries(menuCategories).map(([category, items]) => (
              <div key={category} className="mb-6">
                <h3 className="mb-3 text-sm font-medium uppercase tracking-wider text-[#555]">{category}</h3>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {items.map((item, i) => (
                    <div key={i} className="rounded-xl border border-[#1f1f1f] bg-[#0a0a0a] p-4 transition-colors duration-150 hover:border-[#2a2a2a]">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <p className="text-[15px] font-semibold text-white">{item.name}</p>
                          {item.description && (
                            <p className="mt-0.5 text-[13px] text-[#666]">{item.description}</p>
                          )}
                        </div>
                        <p className="text-base font-bold text-[#22c55e]">₹{item.price}</p>
                      </div>
                      <a
                        href={getWhatsAppLink(shop.whatsapp_number, "I want to order " + item.name)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-3 inline-block rounded-lg border border-[#1f1f1f] px-3 py-1.5 text-xs font-medium text-[#a0a0a0] transition-colors duration-150 hover:border-[#2a2a2a] hover:text-white"
                      >
                        Order via WhatsApp
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </section>
        )}

        {/* Hours */}
        {shop.hours && Object.keys(shop.hours).length > 0 && (
          <section className="mb-10">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
              <Clock className="h-5 w-5" />
              Business Hours
            </h2>
            <div className="rounded-xl border border-[#1f1f1f] bg-[#0a0a0a]">
              {DAYS.map((day) => {
                const h = shop.hours[day] || shop.hours[day.toLowerCase()]
                const isToday = day === todayName
                return (
                  <div
                    key={day}
                    className={
                      "flex items-center justify-between border-b border-[#0f0f0f] px-5 py-3 last:border-0" +
                      (isToday ? " border-l-2 border-l-white bg-[#111]" : "")
                    }
                  >
                    <span className={"text-sm font-medium " + (isToday ? "text-white" : "text-[#a0a0a0]")}>
                      {day}{isToday ? " (Today)" : ""}
                    </span>
                    {h && h.open ? (
                      <span className="text-sm text-[#22c55e]">{h.start || "Open"} – {h.end || ""}</span>
                    ) : (
                      <span className="text-sm text-[#ef4444]">Closed</span>
                    )}
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* FAQs */}
        {shop.faqs && shop.faqs.length > 0 && (
          <section className="mb-10">
            <h2 className="mb-4 text-lg font-semibold text-white">Frequently Asked Questions</h2>
            <div className="space-y-2">
              {shop.faqs.map((faq, i) => (
                <div key={i} className="rounded-xl border border-[#1f1f1f] bg-[#0a0a0a] transition-colors duration-150 hover:border-[#2a2a2a]">
                  <button
                    onClick={() => setExpandedFaq(expandedFaq === i ? null : i)}
                    className="flex w-full items-center justify-between px-5 py-4 text-left"
                  >
                    <span className="text-sm font-medium text-white">{faq.question}</span>
                    {expandedFaq === i ? (
                      <ChevronUp className="h-4 w-4 text-[#555]" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-[#555]" />
                    )}
                  </button>
                  {expandedFaq === i && (
                    <div className="border-t border-[#1f1f1f] px-5 py-4 text-sm text-[#a0a0a0]">
                      {faq.answer}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Footer */}
        <footer className="border-t border-[#1f1f1f] pt-8 text-center">
          <p className="text-sm text-[#555]">
            Powered by <span className="font-medium text-white">ShopBot</span>
          </p>
          <a
            href="https://shopbot.in"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 inline-block text-xs text-[#444] transition-colors hover:text-[#888]"
          >
            Get your own AI WhatsApp assistant &rarr; shopbot.in
          </a>
        </footer>
      </div>
    </div>
  )
}
