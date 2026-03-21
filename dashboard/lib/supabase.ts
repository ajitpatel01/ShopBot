import { createBrowserClient as createBrowserSupabase } from "@supabase/ssr"

export function createBrowserClient() {
  return createBrowserSupabase(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
