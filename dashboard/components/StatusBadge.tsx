import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface StatusBadgeProps {
  status: string
}

const statusStyles: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800 hover:bg-amber-100",
  confirmed: "bg-green-100 text-green-800 hover:bg-green-100",
  completed: "bg-blue-100 text-blue-800 hover:bg-blue-100",
  cancelled: "bg-gray-100 text-gray-600 hover:bg-gray-100",
  escalation: "bg-red-100 text-red-800 hover:bg-red-100",
}

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <Badge
      variant="secondary"
      className={cn("capitalize", statusStyles[status] || statusStyles.pending)}
    >
      {status}
    </Badge>
  )
}
