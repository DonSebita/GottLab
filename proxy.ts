import { updateSession } from '@/lib/supabase/middleware'
import { NextResponse, type NextRequest } from 'next/server'

const PROTECTED_PATHS: Record<string, { role?: string }> = {
  '/admin': { role: 'admin' },
  '/mi-cuenta': {},  // any authenticated user
}

export async function proxy(request: NextRequest) {
  const { supabaseResponse, user } = await updateSession(request)
  const pathname = request.nextUrl.pathname

  // Find matching protected prefix and its requirements
  const prefix = Object.keys(PROTECTED_PATHS).find((p) => pathname.startsWith(p))
  if (!prefix) return supabaseResponse

  const requirements = PROTECTED_PATHS[prefix]

  // Not authenticated → redirect to login
  if (!user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('redirect', pathname)
    return NextResponse.redirect(url)
  }

  // Role check (uses JWT metadata — no extra DB query)
  if (requirements.role) {
    const userRole = user.user_metadata?.role || user.app_metadata?.role
    if (userRole !== requirements.role) {
      const url = request.nextUrl.clone()
      url.pathname = '/'
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|placeholder.avif|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif)$).*)'],
}
