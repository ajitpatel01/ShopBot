import type { LucideIcon } from "lucide-react"

interface EmptyStateProps {
  title: string
  description: string
  icon: LucideIcon
}

export function EmptyState({ title, description, icon: Icon }: EmptyStateProps) {
  return (
    <div className="flex min-h-[200px] flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-[#1f1f1f] p-8 text-center">
      <Icon className="h-10 w-10 text-[#333]" />
      <div>
        <p className="text-sm font-medium text-[#666]">{title}</p>
        <p className="text-xs text-[#444]">{description}</p>
      </div>
    </div>
  )
}
