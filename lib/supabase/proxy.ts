import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * Refreshes the Supabase session cookies for the current request.
 *
 * This file's only job is cookie maintenance — authorisation is enforced by the
 * admin layout and route handlers. `getClaims()` reads (and refreshes, when
 * expired) the session, then verifies the token signature locally for
 * asymmetric signing keys and falls back to the Auth server for symmetric ones.
 * The previous `getUser()` call always paid a full Auth round trip here, which
 * added latency to every navigation, prefetch and API request.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request })
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: { secure: process.env.NODE_ENV === 'production' },
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
        },
      },
    },
  )

  try {
    await supabase.auth.getClaims()
  } catch {
    // Never block a request because session refresh failed; the layout and the
    // API routes still validate the session before returning any data.
  }

  return response
}
