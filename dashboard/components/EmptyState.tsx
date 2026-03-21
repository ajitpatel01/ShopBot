import type { LucideIcon } from "lucide-react"

interface EmptyStateProps {
  title: string
  description: string
  icon: LucideIcon
}

export function EmptyState({ title, description, icon: Icon }: EmptyStateProps) {
  return (
    <div className="flex min-h-[200px] flex-col items-center justify-center gap-3 rounded-lg border border-dashed p-8 text-center">
      <Icon className="h-10 w-10 text-muted-foreground/50" />
      <div>
        <p className="font-medium text-muted-foreground">{title}</p>
        <p className="text-sm text-muted-foreground/70">{description}</p>
      </div>
    </div>
  )
}
