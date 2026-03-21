import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers } })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: Record<string, unknown>) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          request.cookies.set({ name, value, ...options } as any)
          response = NextResponse.next({ request: { headers: request.headers } })
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          response.cookies.set({ name, value, ...options } as any)
        },
        remove(name: string, options: Record<string, unknown>) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          request.cookies.set({ name, value: "", ...options } as any)
          response = NextResponse.next({ request: { headers: request.headers } })
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          response.cookies.set({ name, value: "", ...options } as any)
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const isAuthRoute =
    request.nextUrl.pathname.startsWith("/login") ||
    request.nextUrl.pathname.startsWith("/auth")
  const isDashboardRoute = request.nextUrl.pathname.startsWith("/dashboard")

  if (isDashboardRoute && !user) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  if (isAuthRoute && user) {
    return NextResponse.redirect(new URL("/dashboard", request.url))
  }

  return response
}

export const config = {
  matcher: ["/dashboard/:path*", "/login", "/auth/:path*"],
}
