"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { getShops, updateShop, type Shop, type MenuItem, type FAQ } from "@/lib/api"
import { LoadingSpinner } from "@/components/LoadingSpinner"
import { Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

type SettingsTab = "basic" | "menu" | "hours" | "faqs"

type HoursMap = Record<string, { open: boolean; start: string; end: string }>

function defaultHours(): HoursMap {
  const h: HoursMap = {}
  DAYS.forEach((d) => { h[d] = { open: true, start: "09:00", end: "21:00" } })
  return h
}

export default function SettingsPage() {
  const [shop, setShop] = useState<Shop | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<SettingsTab>("basic")

  const [name, setName] = useState("")
  const [type, setType] = useState("other")
  const [ownerWhatsapp, setOwnerWhatsapp] = useState("")
  const [botTone, setBotTone] = useState("friendly")
  const [menu, setMenu] = useState<MenuItem[]>([])
  const [hours, setHours] = useState<HoursMap>(defaultHours())
  const [faqs, setFaqs] = useState<FAQ[]>([])

  useEffect(() => {
    getShops()
      .then(({ shops }) => {
        if (shops.length > 0) {
          const s = shops[0]
          setShop(s)
          setName(s.name || "")
          setType(s.type || "other")
          setOwnerWhatsapp(s.owner_whatsapp || "")
          setBotTone(s.bot_tone || "friendly")
          setMenu(s.menu || [])
          setHours(s.hours && Object.keys(s.hours).length > 0 ? s.hours as HoursMap : defaultHours())
          setFaqs(s.faqs || [])
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  async function saveField(data: Partial<Shop>) {
    if (!shop) return
    setSaving(true)
    try {
      await updateShop(shop.id, data)
      toast.success("Settings saved")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save")
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <LoadingSpinner />
  if (!shop) return <p className="text-center text-[#555]">No shop found</p>

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <h1 className="text-2xl font-bold tracking-tight text-white">Settings</h1>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-[#1f1f1f]">
        {(["basic", "menu", "hours", "faqs"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "border-b-2 px-4 py-2.5 text-sm font-medium capitalize transition-colors duration-150",
              activeTab === tab
                ? "border-white text-white"
                : "border-transparent text-[#555] hover:text-[#aaa]"
            )}
          >
            {tab === "basic" ? "Basic Info" : tab === "menu" ? "Menu / Services" : tab === "hours" ? "Business Hours" : "FAQs"}
          </button>
        ))}
      </div>

      {/* Basic Info */}
      {activeTab === "basic" && (
        <div className="rounded-xl border border-[#1f1f1f] bg-[#0a0a0a] p-6">
          <div className="space-y-5">
            <div>
              <label className="mb-1.5 block text-xs text-[#666]">Shop Name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-10 w-full rounded-lg border border-[#1f1f1f] bg-[#0a0a0a] px-3 text-sm text-white placeholder-[#444] transition-colors focus:border-[#333] focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs text-[#666]">Shop Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="h-10 w-full rounded-lg border border-[#1f1f1f] bg-[#0a0a0a] px-3 text-sm text-white focus:border-[#333] focus:outline-none"
              >
                <option value="restaurant">Restaurant</option>
                <option value="salon">Salon</option>
                <option value="pharmacy">Pharmacy</option>
                <option value="grocery">Grocery</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs text-[#666]">WhatsApp Number</label>
              <input
                value={shop.whatsapp_number}
                disabled
                className="h-10 w-full cursor-not-allowed rounded-lg border border-[#1f1f1f] bg-[#050505] px-3 text-sm text-[#555]"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs text-[#666]">Your Public Page</label>
              <div className="flex items-center gap-2">
                <input
                  value={"shopbot.in/shop/" + name.toLowerCase().replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, "-")}
                  disabled
                  className="h-10 flex-1 cursor-not-allowed rounded-lg border border-[#1f1f1f] bg-[#050505] px-3 text-sm text-[#555]"
                />
                <button
                  onClick={() => {
                    const slug = name.toLowerCase().replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, "-")
                    window.open("/shop/" + slug, "_blank")
                  }}
                  className="h-10 rounded-lg border border-[#1f1f1f] bg-[#111] px-3 text-xs font-medium text-[#a0a0a0] transition-colors hover:border-[#2a2a2a] hover:text-white"
                >
                  Open
                </button>
                <button
                  onClick={() => {
                    const slug = name.toLowerCase().replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, "-")
                    navigator.clipboard.writeText("https://shopbot.in/shop/" + slug)
                    toast.success("Public page link copied!")
                  }}
                  className="h-10 rounded-lg border border-[#1f1f1f] bg-[#111] px-3 text-xs font-medium text-[#a0a0a0] transition-colors hover:border-[#2a2a2a] hover:text-white"
                >
                  Copy
                </button>
                <button
                  onClick={() => {
                    const slug = name.toLowerCase().replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, "-")
                    const msg = encodeURIComponent("Check out our shop page: https://shopbot.in/shop/" + slug)
                    window.open("https://wa.me/?text=" + msg, "_blank")
                  }}
                  className="h-10 rounded-lg bg-[#25D366] px-3 text-xs font-medium text-white transition-colors hover:bg-[#20bd5a]"
                >
                  Share
                </button>
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-xs text-[#666]">Owner WhatsApp</label>
              <input
                value={ownerWhatsapp}
                onChange={(e) => setOwnerWhatsapp(e.target.value)}
                placeholder="+91XXXXXXXXXX"
                className="h-10 w-full rounded-lg border border-[#1f1f1f] bg-[#0a0a0a] px-3 text-sm text-white placeholder-[#444] transition-colors focus:border-[#333] focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs text-[#666]">Bot Tone</label>
              <div className="space-y-2">
                {(["formal", "friendly", "casual"] as const).map((tone) => (
                  <label
                    key={tone}
                    className="flex cursor-pointer items-center gap-3 rounded-lg border border-[#1f1f1f] p-3 transition-colors hover:border-[#2a2a2a]"
                  >
                    <input
                      type="radio"
                      name="tone"
                      value={tone}
                      checked={botTone === tone}
                      onChange={() => setBotTone(tone)}
                      className="accent-white"
                    />
                    <div>
                      <p className="text-sm font-medium capitalize text-white">{tone}</p>
                      <p className="text-xs text-[#555]">
                        {tone === "formal" && "Professional, polite language"}
                        {tone === "friendly" && "Warm and approachable"}
                        {tone === "casual" && "Relaxed, conversational style"}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
            <div className="border-t border-[#1f1f1f] pt-5">
              <button
                onClick={() => saveField({ name, type, owner_whatsapp: ownerWhatsapp, bot_tone: botTone as "formal" | "friendly" | "casual" })}
                disabled={saving}
                className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black transition-colors duration-150 hover:bg-[#f0f0f0] disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Menu / Services */}
      {activeTab === "menu" && (
        <div className="rounded-xl border border-[#1f1f1f] bg-[#0a0a0a] p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-medium text-white">Menu / Services</h2>
            <button
              onClick={() => setMenu([...menu, { name: "", price: 0, category: "", description: "" }])}
              className="flex items-center gap-1 rounded-lg border border-[#1f1f1f] px-3 py-1.5 text-xs text-[#aaa] transition-colors hover:border-[#2a2a2a] hover:text-white"
            >
              <Plus className="h-3 w-3" /> Add Item
            </button>
          </div>
          <div className="space-y-3">
            {menu.length === 0 && (
              <p className="text-sm text-[#555]">No items yet. Add your first menu item.</p>
            )}
            {menu.map((item, i) => (
              <div key={i} className="flex items-end gap-2 rounded-xl border border-[#1f1f1f] bg-[#050505] p-4">
                <div className="flex-1">
                  <label className="mb-1 block text-[11px] text-[#555]">Name</label>
                  <input
                    value={item.name}
                    onChange={(e) => { const c = [...menu]; c[i] = { ...c[i], name: e.target.value }; setMenu(c) }}
                    placeholder="Item name"
                    className="h-9 w-full rounded-lg border border-[#1f1f1f] bg-[#0a0a0a] px-3 text-sm text-white placeholder-[#444] focus:border-[#333] focus:outline-none"
                  />
                </div>
                <div className="w-20">
                  <label className="mb-1 block text-[11px] text-[#555]">Price (₹)</label>
                  <input
                    type="number"
                    value={item.price}
                    onChange={(e) => { const c = [...menu]; c[i] = { ...c[i], price: Number(e.target.value) }; setMenu(c) }}
                    className="h-9 w-full rounded-lg border border-[#1f1f1f] bg-[#0a0a0a] px-3 text-sm text-[#22c55e] focus:border-[#333] focus:outline-none"
                  />
                </div>
                <div className="flex-1">
                  <label className="mb-1 block text-[11px] text-[#555]">Category</label>
                  <input
                    value={item.category || ""}
                    onChange={(e) => { const c = [...menu]; c[i] = { ...c[i], category: e.target.value }; setMenu(c) }}
                    placeholder="e.g. Main Course"
                    className="h-9 w-full rounded-lg border border-[#1f1f1f] bg-[#0a0a0a] px-3 text-sm text-white placeholder-[#444] focus:border-[#333] focus:outline-none"
                  />
                </div>
                <button
                  onClick={() => setMenu(menu.filter((_, idx) => idx !== i))}
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-[#444] transition-colors hover:text-[#ef4444]"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
          <div className="mt-4 border-t border-[#1f1f1f] pt-4">
            <button
              onClick={() => saveField({ menu })}
              disabled={saving}
              className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black transition-colors duration-150 hover:bg-[#f0f0f0] disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Menu"}
            </button>
          </div>
        </div>
      )}

      {/* Business Hours */}
      {activeTab === "hours" && (
        <div className="rounded-xl border border-[#1f1f1f] bg-[#0a0a0a] p-6">
          <div className="space-y-3">
            {DAYS.map((day) => {
              const h = hours[day] || { open: true, start: "09:00", end: "21:00" }
              return (
                <div key={day} className="flex items-center gap-4">
                  <div className="w-28 text-sm font-medium text-white">{day}</div>
                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="checkbox"
                      checked={h.open}
                      onChange={(e) => setHours({ ...hours, [day]: { ...h, open: e.target.checked } })}
                      className="accent-white"
                    />
                    <span className="text-sm text-[#aaa]">{h.open ? "Open" : "Closed"}</span>
                  </label>
                  {h.open && (
                    <>
                      <input
                        type="time"
                        className="h-9 w-32 rounded-lg border border-[#1f1f1f] bg-[#0a0a0a] px-3 text-sm text-white focus:border-[#333] focus:outline-none"
                        value={h.start}
                        onChange={(e) => setHours({ ...hours, [day]: { ...h, start: e.target.value } })}
                      />
                      <span className="text-[#555]">to</span>
                      <input
                        type="time"
                        className="h-9 w-32 rounded-lg border border-[#1f1f1f] bg-[#0a0a0a] px-3 text-sm text-white focus:border-[#333] focus:outline-none"
                        value={h.end}
                        onChange={(e) => setHours({ ...hours, [day]: { ...h, end: e.target.value } })}
                      />
                    </>
                  )}
                </div>
              )
            })}
          </div>
          <div className="mt-4 border-t border-[#1f1f1f] pt-4">
            <button
              onClick={() => saveField({ hours })}
              disabled={saving}
              className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black transition-colors duration-150 hover:bg-[#f0f0f0] disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Hours"}
            </button>
          </div>
        </div>
      )}

      {/* FAQs */}
      {activeTab === "faqs" && (
        <div className="rounded-xl border border-[#1f1f1f] bg-[#0a0a0a] p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-medium text-white">FAQs</h2>
            <button
              onClick={() => {
                if (faqs.length >= 10) { toast.error("Maximum 10 FAQs allowed"); return }
                setFaqs([...faqs, { question: "", answer: "" }])
              }}
              className="flex items-center gap-1 rounded-lg border border-[#1f1f1f] px-3 py-1.5 text-xs text-[#aaa] transition-colors hover:border-[#2a2a2a] hover:text-white"
            >
              <Plus className="h-3 w-3" /> Add FAQ
            </button>
          </div>
          <div className="space-y-3">
            {faqs.length === 0 && (
              <p className="text-sm text-[#555]">No FAQs yet. Add common questions your customers ask.</p>
            )}
            {faqs.map((faq, i) => (
              <div key={i} className="rounded-xl border border-[#1f1f1f] bg-[#050505] p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 space-y-2">
                    <input
                      value={faq.question}
                      onChange={(e) => { const c = [...faqs]; c[i] = { ...c[i], question: e.target.value }; setFaqs(c) }}
                      placeholder="Question"
                      className="h-9 w-full rounded-lg border border-[#1f1f1f] bg-[#0a0a0a] px-3 text-sm text-white placeholder-[#444] focus:border-[#333] focus:outline-none"
                    />
                    <textarea
                      value={faq.answer}
                      onChange={(e) => { const c = [...faqs]; c[i] = { ...c[i], answer: e.target.value }; setFaqs(c) }}
                      placeholder="Answer"
                      rows={2}
                      className="w-full rounded-lg border border-[#1f1f1f] bg-[#0a0a0a] px-3 py-2 text-sm text-white placeholder-[#444] focus:border-[#333] focus:outline-none"
                    />
                  </div>
                  <button
                    onClick={() => setFaqs(faqs.filter((_, idx) => idx !== i))}
                    className="mt-1 text-[#444] transition-colors hover:text-[#ef4444]"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-[#444]">{faqs.length}/10 FAQs</p>
          <div className="mt-4 border-t border-[#1f1f1f] pt-4">
            <button
              onClick={() => saveField({ faqs })}
              disabled={saving}
              className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black transition-colors duration-150 hover:bg-[#f0f0f0] disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save FAQs"}
            </button>
          </div>
        </div>
      )}
    </motion.div>
  )
}
