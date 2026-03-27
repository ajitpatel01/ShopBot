"use client"

const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001"

export function ShopFetchError({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-amber-500/35 bg-amber-950/25 px-4 py-3 text-sm">
      <p className="font-medium text-amber-100">Couldn&apos;t load your shops</p>
      <p className="mt-1 text-amber-200/90">{message}</p>
      <p className="mt-3 text-xs leading-relaxed text-[#78716c]">
        The dashboard calls the ShopBot API at{" "}
        <code className="rounded bg-black/50 px-1.5 py-0.5 font-mono text-[11px] text-amber-100/90">
          {backendUrl}
        </code>
        . Start the backend on that port (default in code is{" "}
        <code className="rounded bg-black/50 px-1 py-0.5 font-mono text-[11px]">3001</code>
        ) or set <code className="rounded bg-black/50 px-1 py-0.5 font-mono text-[11px]">NEXT_PUBLIC_BACKEND_URL</code> in{" "}
        <code className="rounded bg-black/50 px-1 py-0.5 font-mono text-[11px]">.env.local</code> to match.
      </p>
    </div>
  )
}
