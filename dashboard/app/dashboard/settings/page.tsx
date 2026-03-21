"use client"

import { useEffect, useState } from "react"
import { getShops, updateShop, type Shop, type MenuItem, type FAQ } from "@/lib/api"
import { LoadingSpinner } from "@/components/LoadingSpinner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

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

  // Basic info state
  const [name, setName] = useState("")
  const [type, setType] = useState("other")
  const [ownerWhatsapp, setOwnerWhatsapp] = useState("")
  const [botTone, setBotTone] = useState("friendly")

  // Menu state
  const [menu, setMenu] = useState<MenuItem[]>([])

  // Hours state
  const [hours, setHours] = useState<HoursMap>(defaultHours())

  // FAQ state
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
  if (!shop) return <p className="text-center text-muted-foreground">No shop found</p>

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>

      <Tabs defaultValue="basic" className="space-y-6">
        <TabsList>
          <TabsTrigger value="basic">Basic Info</TabsTrigger>
          <TabsTrigger value="menu">Menu / Services</TabsTrigger>
          <TabsTrigger value="hours">Business Hours</TabsTrigger>
          <TabsTrigger value="faqs">FAQs</TabsTrigger>
        </TabsList>

        {/* ── Tab 1: Basic Info ────────────────────────── */}
        <TabsContent value="basic">
          <Card>
            <CardHeader><CardTitle>Basic Information</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Shop Name</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Shop Type</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="restaurant">Restaurant</SelectItem>
                    <SelectItem value="salon">Salon</SelectItem>
                    <SelectItem value="pharmacy">Pharmacy</SelectItem>
                    <SelectItem value="grocery">Grocery</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>WhatsApp Number</Label>
                <Input value={shop.whatsapp_number} disabled className="bg-muted" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="owner_wa">Owner WhatsApp</Label>
                <Input
                  id="owner_wa"
                  value={ownerWhatsapp}
                  onChange={(e) => setOwnerWhatsapp(e.target.value)}
                  placeholder="+91XXXXXXXXXX"
                />
              </div>
              <div className="space-y-2">
                <Label>Bot Tone</Label>
                <div className="space-y-2">
                  {(["formal", "friendly", "casual"] as const).map((tone) => (
                    <label key={tone} className="flex items-center gap-3 rounded-lg border p-3 cursor-pointer hover:bg-accent">
                      <input
                        type="radio"
                        name="tone"
                        value={tone}
                        checked={botTone === tone}
                        onChange={() => setBotTone(tone)}
                        className="accent-primary"
                      />
                      <div>
                        <p className="text-sm font-medium capitalize">{tone}</p>
                        <p className="text-xs text-muted-foreground">
                          {tone === "formal" && "Professional, polite language"}
                          {tone === "friendly" && "Warm and approachable"}
                          {tone === "casual" && "Relaxed, conversational style"}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
              <Button
                onClick={() => saveField({ name, type, owner_whatsapp: ownerWhatsapp, bot_tone: botTone })}
                disabled={saving}
              >
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tab 2: Menu / Services ───────────────────── */}
        <TabsContent value="menu">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Menu / Services</CardTitle>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  setMenu([...menu, { name: "", price: 0, category: "", description: "" }])
                }
              >
                <Plus className="mr-1 h-4 w-4" /> Add Item
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {menu.length === 0 && (
                <p className="text-sm text-muted-foreground">No items yet. Add your first menu item.</p>
              )}
              {menu.map((item, i) => (
                <div key={i} className="grid grid-cols-[1fr_80px_1fr_1fr_auto] gap-2 items-end">
                  <div>
                    <Label className="text-xs">Name</Label>
                    <Input
                      value={item.name}
                      onChange={(e) => {
                        const copy = [...menu]
                        copy[i] = { ...copy[i], name: e.target.value }
                        setMenu(copy)
                      }}
                      placeholder="Item name"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Price (₹)</Label>
                    <Input
                      type="number"
                      value={item.price}
                      onChange={(e) => {
                        const copy = [...menu]
                        copy[i] = { ...copy[i], price: Number(e.target.value) }
                        setMenu(copy)
                      }}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Category</Label>
                    <Input
                      value={item.category || ""}
                      onChange={(e) => {
                        const copy = [...menu]
                        copy[i] = { ...copy[i], category: e.target.value }
                        setMenu(copy)
                      }}
                      placeholder="e.g. Main Course"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Description</Label>
                    <Input
                      value={item.description || ""}
                      onChange={(e) => {
                        const copy = [...menu]
                        copy[i] = { ...copy[i], description: e.target.value }
                        setMenu(copy)
                      }}
                      placeholder="Optional"
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => setMenu(menu.filter((_, idx) => idx !== i))}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button onClick={() => saveField({ menu })} disabled={saving}>
                {saving ? "Saving..." : "Save Menu"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tab 3: Business Hours ────────────────────── */}
        <TabsContent value="hours">
          <Card>
            <CardHeader><CardTitle>Business Hours</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {DAYS.map((day) => {
                const h = hours[day] || { open: true, start: "09:00", end: "21:00" }
                return (
                  <div key={day} className="flex items-center gap-4">
                    <div className="w-28 text-sm font-medium">{day}</div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={h.open}
                        onChange={(e) =>
                          setHours({ ...hours, [day]: { ...h, open: e.target.checked } })
                        }
                        className="accent-primary"
                      />
                      <span className="text-sm">{h.open ? "Open" : "Closed"}</span>
                    </label>
                    {h.open && (
                      <>
                        <Input
                          type="time"
                          className="w-32"
                          value={h.start}
                          onChange={(e) =>
                            setHours({ ...hours, [day]: { ...h, start: e.target.value } })
                          }
                        />
                        <span className="text-muted-foreground">to</span>
                        <Input
                          type="time"
                          className="w-32"
                          value={h.end}
                          onChange={(e) =>
                            setHours({ ...hours, [day]: { ...h, end: e.target.value } })
                          }
                        />
                      </>
                    )}
                  </div>
                )
              })}
              <Button onClick={() => saveField({ hours })} disabled={saving}>
                {saving ? "Saving..." : "Save Hours"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tab 4: FAQs ──────────────────────────────── */}
        <TabsContent value="faqs">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>FAQs</CardTitle>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  if (faqs.length >= 10) {
                    toast.error("Maximum 10 FAQs allowed")
                    return
                  }
                  setFaqs([...faqs, { question: "", answer: "" }])
                }}
              >
                <Plus className="mr-1 h-4 w-4" /> Add FAQ
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {faqs.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No FAQs yet. Add common questions your customers ask.
                </p>
              )}
              {faqs.map((faq, i) => (
                <div key={i} className="space-y-2 rounded-lg border p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 space-y-2">
                      <Input
                        value={faq.question}
                        onChange={(e) => {
                          const copy = [...faqs]
                          copy[i] = { ...copy[i], question: e.target.value }
                          setFaqs(copy)
                        }}
                        placeholder="Question"
                      />
                      <Textarea
                        value={faq.answer}
                        onChange={(e) => {
                          const copy = [...faqs]
                          copy[i] = { ...copy[i], answer: e.target.value }
                          setFaqs(copy)
                        }}
                        placeholder="Answer"
                        rows={2}
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setFaqs(faqs.filter((_, idx) => idx !== i))}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
              <p className="text-xs text-muted-foreground">{faqs.length}/10 FAQs</p>
              <Button onClick={() => saveField({ faqs })} disabled={saving}>
                {saving ? "Saving..." : "Save FAQs"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
