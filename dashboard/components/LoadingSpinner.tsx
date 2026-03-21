import { LoaderCircle } from "lucide-react"

export function LoadingSpinner() {
  return (
    <div className="flex min-h-[200px] items-center justify-center">
      <LoaderCircle className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  )
}
