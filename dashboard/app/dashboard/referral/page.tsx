"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { getReferralCode, redeemReferralCode, getShops, type ReferralStats, type Shop } from "@/lib/api"
import { LoadingSpinner } from "@/components/LoadingSpinner"
import { Copy, Share2, MessageCircle, Link2, CheckCircle, Gift } from "lucide-react"
import { toast } from "sonner"

export default function ReferralPage() {
  const [loading, setLoading] = useState(true)
  const [code, setCode] = useState("")
  const [referralUrl, setReferralUrl] = useState("")
  const [stats, setStats] = useState<ReferralStats | null>(null)
  const [shops, setShops] = useState<Shop[]>([])
  const [redeemCode, setRedeemCode] = useState("")
  const [redeeming, setRedeeming] = useState(false)

  useEffect(() => {
    Promise.all([
      getReferralCode(),
      getShops(),
    ])
      .then(([refData, shopData]) => {
        setCode(refData.code)
        setReferralUrl(refData.referralUrl)
        setStats(refData.stats)
        setShops(shopData.shops)
      })
      .catch(() => toast.error("Failed to load referral data"))
      .finally(() => setLoading(false))
  }, [])

  function copyCode() {
    navigator.clipboard.writeText(code)
    toast.success("Referral code copied!")
  }

  function copyShareMessage() {
    const msg = `Hey! I've been using ShopBot to automate my WhatsApp orders. It's amazing — try it free with my referral code ${code}\nSign up here: ${referralUrl}`
    navigator.clipboard.writeText(msg)
    toast.success("Share message copied!")
  }

  function shareWhatsApp() {
    const msg = encodeURIComponent(
      `Hey! Check out ShopBot — it automates WhatsApp orders for shops. Use my code ${code} for an extended free trial!\n${referralUrl}`
    )
    window.open("https://wa.me/?text=" + msg, "_blank")
  }

  async function handleRedeem() {
    if (!redeemCode.trim() || shops.length === 0) return
    setRedeeming(true)
    try {
      const result = await redeemReferralCode(redeemCode.trim(), shops[0].id)
      toast.success(`Code applied! You now have an extended trial until ${new Date(result.newTrialEndsAt).toLocaleDateString()}`)
      setRedeemCode("")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Invalid referral code")
    } finally {
      setRedeeming(false)
    }
  }

  if (loading) return <LoadingSpinner />

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-8"
    >
      {/* Hero */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Refer & Earn</h1>
        <p className="mt-1 text-sm text-[#a0a0a0]">
          Share ShopBot with other shop owners. You get 1 month free. They get an extended trial.
        </p>
      </div>

      {/* Referral Code Card */}
      <div className="rounded-2xl border border-[#1f1f1f] bg-[#0a0a0a] p-8">
        <p className="mb-2 text-xs font-medium uppercase tracking-wider text-[#555]">Your referral code</p>
        <p className="mb-6 font-mono text-3xl font-bold tracking-widest text-white">{code}</p>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={copyCode}
            className="flex items-center gap-2 rounded-lg border border-[#1f1f1f] bg-[#111] px-4 py-2.5 text-sm font-medium text-white transition-colors duration-150 hover:border-[#2a2a2a] hover:bg-[#1a1a1a]"
          >
            <Copy className="h-4 w-4" />
            Copy Code
          </button>
          <button
            onClick={copyShareMessage}
            className="flex items-center gap-2 rounded-lg border border-[#1f1f1f] bg-[#111] px-4 py-2.5 text-sm font-medium text-white transition-colors duration-150 hover:border-[#2a2a2a] hover:bg-[#1a1a1a]"
          >
            <Share2 className="h-4 w-4" />
            Copy Message
          </button>
          <button
            onClick={shareWhatsApp}
            className="flex items-center gap-2 rounded-lg bg-[#25D366] px-4 py-2.5 text-sm font-medium text-white transition-colors duration-150 hover:bg-[#20bd5a]"
          >
            <MessageCircle className="h-4 w-4" />
            Share on WhatsApp
          </button>
        </div>
      </div>

      {/* Stats Row */}
      {stats && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[
            { label: "Total Referrals", value: stats.totalReferrals },
            { label: "Months Earned", value: stats.monthsEarned },
            { label: "Pending Referrals", value: stats.pendingReferrals },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-[#1f1f1f] bg-[#0a0a0a] p-5">
              <p className="text-xs font-medium text-[#555]">{s.label}</p>
              <p className="mt-1 text-2xl font-bold text-white">{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Referral History */}
      {stats && stats.redemptions && stats.redemptions.length > 0 && (
        <div className="rounded-xl border border-[#1f1f1f] bg-[#0a0a0a]">
          <div className="border-b border-[#1f1f1f] px-6 py-4">
            <h2 className="text-sm font-semibold text-white">Referral History</h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#1f1f1f] bg-[#050505]">
                <th className="px-6 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-[#555]">Date</th>
                <th className="px-6 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-[#555]">Status</th>
                <th className="px-6 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-[#555]">Reward</th>
              </tr>
            </thead>
            <tbody>
              {stats.redemptions.map((r) => (
                <tr key={r.id} className="border-b border-[#0f0f0f] last:border-0">
                  <td className="px-6 py-3 text-[#a0a0a0]">{new Date(r.created_at).toLocaleDateString()}</td>
                  <td className="px-6 py-3">
                    {r.referrer_rewarded ? (
                      <span className="rounded-full border border-[#22c55e30] bg-[#22c55e15] px-2.5 py-0.5 text-[11px] font-medium text-[#22c55e]">Rewarded</span>
                    ) : (
                      <span className="rounded-full border border-[#f59e0b30] bg-[#f59e0b15] px-2.5 py-0.5 text-[11px] font-medium text-[#f59e0b]">Pending</span>
                    )}
                  </td>
                  <td className="px-6 py-3 text-white">
                    {r.referrer_rewarded ? "1 month free" : "Awaiting subscription"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* How It Works */}
      <div className="rounded-2xl border border-[#1f1f1f] bg-[#0a0a0a] p-8">
        <h2 className="mb-6 text-lg font-semibold text-white">How it works</h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          {[
            { icon: Link2, step: "1", title: "Share your code", desc: "Send your referral code to other shop owners" },
            { icon: CheckCircle, step: "2", title: "They sign up", desc: "They get 28 days free trial instead of 14" },
            { icon: Gift, step: "3", title: "You earn free months", desc: "When they subscribe, you get 1 month free!" },
          ].map((s) => (
            <div key={s.step} className="text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-[#1f1f1f] bg-[#111]">
                <s.icon className="h-5 w-5 text-white" />
              </div>
              <p className="text-sm font-semibold text-white">{s.title}</p>
              <p className="mt-1 text-xs text-[#555]">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Redeem Code */}
      <div className="rounded-2xl border border-[#1f1f1f] bg-[#0a0a0a] p-8">
        <h2 className="mb-2 text-lg font-semibold text-white">Have a referral code?</h2>
        <p className="mb-4 text-sm text-[#555]">Enter it here for an extended trial</p>
        <div className="flex gap-3">
          <input
            value={redeemCode}
            onChange={(e) => setRedeemCode(e.target.value.toUpperCase())}
            placeholder="Enter code e.g. SBAE3F..."
            className="h-10 flex-1 rounded-lg border border-[#1f1f1f] bg-[#0a0a0a] px-3 text-sm text-white placeholder-[#444] transition-colors focus:border-[#333] focus:outline-none"
          />
          <button
            onClick={handleRedeem}
            disabled={redeeming || !redeemCode.trim()}
            className="rounded-lg bg-white px-5 py-2 text-sm font-medium text-black transition-colors duration-150 hover:bg-[#e0e0e0] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {redeeming ? "Applying..." : "Apply Code"}
          </button>
        </div>
      </div>
    </motion.div>
  )
}
