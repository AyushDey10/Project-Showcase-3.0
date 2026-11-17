
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code')

  const loginUrl = new URL('/admin/login', request.url)

  if (!code) {
    loginUrl.searchParams.set('error', 'invalid_invitation')
    return NextResponse.redirect(loginUrl)
  }

  const supabase = await createClient()

  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    loginUrl.searchParams.set(
      'error',
      'invitation_verification_failed'
    )
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.redirect(
    new URL('/admin/setup-password', request.url)
  )
}
