"use client"

import { useEffect, useState } from "react"
import { getShops, type Shop } from "@/lib/api"
import { LoadingSpinner } from "@/components/LoadingSpinner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

interface PlanCard {
  name: string
  price: string
  period: string
  features: string[]
  highlighted?: boolean
}

const plans: PlanCard[] = [
  {
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
    name: "Growth",
    price: "₹1,299",
    period: "/month",
    highlighted: true,
    features: [
      "1 WhatsApp number",
      "2,000 messages/month",
      "Priority AI responses",
      "Advanced analytics",
      "Owner notifications",
      "Custom bot tone",
    ],
  },
  {
    name: "Multi-shop",
    price: "₹2,999",
    period: "/month",
    features: [
      "Up to 5 WhatsApp numbers",
      "10,000 messages/month",
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
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Billing</h1>

      {/* Current plan */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Current Plan</CardTitle>
          <CardDescription>
            You are on the <span className="font-medium capitalize">{currentPlan}</span> plan
            {shop?.subscription_status === "trial" && trialEnds && (
              <span className="ml-2">
                <Badge variant="secondary">Trial until {trialEnds}</Badge>
              </span>
            )}
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Pricing cards */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {plans.map((plan) => {
          const isCurrent = plan.name.toLowerCase() === currentPlan
          return (
            <Card
              key={plan.name}
              className={cn(
                "relative",
                plan.highlighted && "border-primary shadow-md"
              )}
            >
              {plan.highlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge>Most Popular</Badge>
                </div>
              )}
              <CardHeader>
                <CardTitle>{plan.name}</CardTitle>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold">{plan.price}</span>
                  <span className="text-muted-foreground">{plan.period}</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-green-600" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Button
                  className="w-full"
                  variant={isCurrent ? "secondary" : plan.highlighted ? "default" : "outline"}
                  disabled
                >
                  {isCurrent ? "Current Plan" : "Coming in next update"}
                </Button>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
