import { cn } from "@/lib/utils"

interface StatusBadgeProps {
  status: string
}

const statusStyles: Record<string, string> = {
  pending: "bg-[#f59e0b15] text-[#f59e0b] border-[#f59e0b30]",
  confirmed: "bg-[#22c55e15] text-[#22c55e] border-[#22c55e30]",
  completed: "bg-[#3b82f615] text-[#3b82f6] border-[#3b82f630]",
  cancelled: "bg-[#55555515] text-[#888] border-[#55555530]",
  escalation: "bg-[#ef444415] text-[#ef4444] border-[#ef444430]",
  faq: "bg-[#a855f715] text-[#a855f7] border-[#a855f730]",
  order: "bg-[#22c55e15] text-[#22c55e] border-[#22c55e30]",
  booking: "bg-[#3b82f615] text-[#3b82f6] border-[#3b82f630]",
  complaint: "bg-[#f59e0b15] text-[#f59e0b] border-[#f59e0b30]",
  other: "bg-[#55555515] text-[#888] border-[#55555530]",
}

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium capitalize",
        statusStyles[status] || statusStyles.pending
      )}
    >
      {status}
    </span>
  )
}
