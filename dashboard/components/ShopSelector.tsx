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
      <SelectTrigger className="w-[220px]">
        <SelectValue placeholder="Select shop" />
      </SelectTrigger>
      <SelectContent>
        {shops.map((shop) => (
          <SelectItem key={shop.id} value={shop.id}>
            {shop.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
