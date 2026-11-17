import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * The email invitation workflow has been replaced with Direct Admin Account Creation.
 * POST /api/admin/users is now used by Super Admins to create accounts directly.
 */
export async function POST() {
  return NextResponse.json(
    {
      error:
        'The invitation workflow has been deprecated. Super Admins create accounts directly via POST /api/admin/users.',
    },
    { status: 410, headers: { 'Cache-Control': 'no-store' } }
  )
}
