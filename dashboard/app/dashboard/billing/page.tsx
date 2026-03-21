"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { getShops, type Shop } from "@/lib/api"
import { LoadingSpinner } from "@/components/LoadingSpinner"
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

interface PlanCard {
  key: string
  name: string
  price: string
  period: string
  features: string[]
  highlighted?: boolean
}

const plans: PlanCard[] = [
  {
    key: "starter",
    name: "Starter",
    price: "₹499",
    period: "/month",
    features: [
      "1 WhatsApp number",
      "500 messages/month",
      "AI-powered replies",
      "Order & booking management",
      "Basic analytics",
    ],
  },
  {
    key: "growth",
    name: "Growth",
    price: "₹1,299",
    period: "/month",
    highlighted: true,
    features: [
      "1 WhatsApp number",
      "Unlimited messages",
      "Priority AI responses",
      "Advanced analytics",
      "Owner notifications",
      "Custom bot tone",
    ],
  },
  {
    key: "multi_shop",
    name: "Multi-shop",
    price: "₹2,999",
    period: "/month",
    features: [
      "Up to 5 WhatsApp numbers",
      "Unlimited messages",
      "All Growth features",
      "Multi-shop dashboard",
      "Priority support",
      "API access",
    ],
  },
]

export default function BillingPage() {
  const [shop, setShop] = useState<Shop | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getShops()
      .then(({ shops }) => {
        if (shops.length > 0) setShop(shops[0])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <LoadingSpinner />

  const currentPlan = shop?.plan || "starter"
  const trialEnds = shop?.trial_ends_at
    ? new Date(shop.trial_ends_at).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-8"
    >
      <h1 className="text-2xl font-bold tracking-tight text-white">Billing</h1>

      {/* Current plan */}
      <div className="rounded-xl border border-[#1f1f1f] bg-[#0a0a0a] p-6">
        <h2 className="text-sm font-medium text-white">Current Plan</h2>
        <p className="mt-1 text-sm text-[#666]">
          You are on the <span className="font-medium capitalize text-white">{currentPlan}</span> plan
          {shop?.subscription_status === "trial" && trialEnds && (
            <span className="ml-2 inline-flex items-center rounded-full border border-[#f59e0b30] bg-[#f59e0b15] px-2 py-0.5 text-[11px] font-medium text-[#f59e0b]">
              Trial until {trialEnds}
            </span>
          )}
        </p>
      </div>

      {/* Pricing cards */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {plans.map((plan) => {
          const isCurrent = plan.key === currentPlan
          return (
            <div
              key={plan.key}
              className={cn(
                "relative rounded-2xl border p-6",
                plan.highlighted
                  ? "border-[#333] bg-[#0f0f0f]"
                  : "border-[#1f1f1f] bg-[#0a0a0a]"
              )}
            >
              {plan.highlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="rounded-full bg-white px-3 py-1 text-[10px] font-semibold text-black">
                    Most Popular
                  </span>
                </div>
              )}
              <div className="mb-4">
                <p className="text-xs font-medium uppercase tracking-[0.1em] text-[#666]">{plan.name}</p>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-[40px] font-bold leading-none text-white">{plan.price}</span>
                  <span className="text-sm text-[#555]">{plan.period}</span>
                </div>
              </div>
              <ul className="mb-6 space-y-2.5">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-[13px] text-[#aaa]">
                    <Check className="h-4 w-4 shrink-0 text-[#22c55e]" />
                    {f}
                  </li>
                ))}
              </ul>
              <button
                disabled
                className={cn(
                  "w-full rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors duration-150 disabled:opacity-60",
                  isCurrent
                    ? "border border-[#1f1f1f] bg-transparent text-[#555]"
                    : plan.highlighted
                      ? "bg-white text-black hover:bg-[#f0f0f0]"
                      : "border border-[#1f1f1f] text-white hover:border-[#333]"
                )}
              >
                {isCurrent ? "Current Plan" : "Coming Soon"}
              </button>
            </div>
          )
        })}
      </div>
    </motion.div>
  )
}
