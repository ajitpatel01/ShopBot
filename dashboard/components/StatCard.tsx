"use client"

import { useEffect, useState } from "react"
import type { LucideIcon } from "lucide-react"

interface StatCardProps {
  title: string
  value: string | number
  icon: LucideIcon
  color?: "blue" | "amber" | "green" | "red" | "purple" | "white"
  change?: string
  prefix?: string
  suffix?: string
}

const accentMap: Record<string, string> = {
  blue: "text-[#3b82f6]",
  amber: "text-[#f59e0b]",
  green: "text-[#22c55e]",
  red: "text-[#ef4444]",
  purple: "text-[#a855f7]",
  white: "text-white",
}

export function StatCard({ title, value, icon: Icon, color = "blue", change, prefix, suffix }: StatCardProps) {
  const numValue = typeof value === "string" ? parseInt(value, 10) || 0 : value
  const [displayValue, setDisplayValue] = useState(0)

  useEffect(() => {
    if (!numValue || numValue === 0) {
      setDisplayValue(0)
      return
    }
    const duration = 1000
    const steps = 40
    const increment = numValue / steps
    let current = 0
    const timer = setInterval(() => {
      current += increment
      if (current >= numValue) {
        setDisplayValue(numValue)
        clearInterval(timer)
      } else {
        setDisplayValue(Math.floor(current))
      }
    }, duration / steps)
    return () => clearInterval(timer)
  }, [numValue])

  const hasAccent = (color === "amber" || color === "red") && numValue > 0
  const colorClass = hasAccent ? accentMap[color] : (color === "green" || color === "purple" ? accentMap[color] : "text-white")

  return (
    <div className="rounded-xl border border-[#1f1f1f] bg-[#0a0a0a] p-5 transition-colors duration-150 hover:border-[#2a2a2a]">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium uppercase tracking-[0.1em] text-[#555]">
          {title}
        </span>
        <Icon className="h-4 w-4 text-[#333]" />
      </div>
      <div className="mt-3">
        <span className={`text-4xl font-extrabold tracking-tight ${colorClass}`}>
          {prefix}{displayValue.toLocaleString("en-IN")}{suffix}
        </span>
      </div>
      {change && (
        <p className="mt-1 text-xs text-[#555]">{change}</p>
      )}
    </div>
  )
}
