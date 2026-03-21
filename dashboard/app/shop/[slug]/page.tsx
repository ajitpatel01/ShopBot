import { notFound } from "next/navigation"
import type { Metadata } from "next"
import PublicShopClient from "./client"

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001"

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

async function getShopData(slug: string): Promise<ShopData | null> {
  try {
    const res = await fetch(BACKEND_URL + "/public/shop/" + slug, {
      cache: "no-store",
    })
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const shop = await getShopData(slug)
  if (!shop) {
    return { title: "Shop Not Found" }
  }
  return {
    title: shop.name + " — Order on WhatsApp",
    description: "Chat with " + shop.name + " on WhatsApp. View menu, place orders, book appointments 24/7.",
    openGraph: {
      title: shop.name + " — Order on WhatsApp",
      description: "Chat with " + shop.name + " on WhatsApp. View menu, place orders, book appointments 24/7.",
      type: "website",
    },
  }
}

export default async function PublicShopPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const shop = await getShopData(slug)
  if (!shop) notFound()

  return <PublicShopClient shop={shop} />
}
