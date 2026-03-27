import { createBrowserClient as createBrowserSupabase } from "@supabase/ssr"

export function createBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url?.trim() || url.includes("your-project")) {
    throw new Error(
      "Supabase URL is not configured. Set NEXT_PUBLIC_SUPABASE_URL in .env.local."
    )
  }
  if (!key?.trim() || key === "your-anon-key") {
    throw new Error(
      "Supabase anon key is not configured. Set NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local."
    )
  }
  return createBrowserSupabase(url, key)
}
