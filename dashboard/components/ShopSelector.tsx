"use client"

import type { Shop } from "@/lib/api"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface ShopSelectorProps {
  shops: Shop[]
  activeShopId: string
  onSelect: (shopId: string) => void
}

export function ShopSelector({ shops, activeShopId, onSelect }: ShopSelectorProps) {
  if (shops.length <= 1) return null

  return (
    <Select value={activeShopId} onValueChange={onSelect}>
      <SelectTrigger className="w-[200px] border-[#1f1f1f] bg-[#0a0a0a] text-sm text-white">
        <SelectValue placeholder="Select shop" />
      </SelectTrigger>
      <SelectContent className="border-[#1f1f1f] bg-[#111]">
        {shops.map((shop) => (
          <SelectItem key={shop.id} value={shop.id} className="text-[#aaa] focus:bg-[#1a1a1a] focus:text-white">
            {shop.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
