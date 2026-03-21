export function LoadingSpinner() {
  return (
    <div className="space-y-6 p-2">
      <div className="flex items-center justify-between">
        <div className="skeleton h-8 w-32" />
        <div className="skeleton h-9 w-48" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-[#1f1f1f] bg-[#0a0a0a] p-5">
            <div className="skeleton mb-3 h-3 w-24" />
            <div className="skeleton h-9 w-16" />
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-[#1f1f1f] bg-[#0a0a0a] p-6">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 border-b border-[#0f0f0f] py-4 last:border-0">
            <div className="skeleton h-4 w-28" />
            <div className="skeleton h-4 w-40" />
            <div className="skeleton h-4 w-16" />
            <div className="skeleton h-5 w-20" />
          </div>
        ))}
      </div>
    </div>
  )
}
