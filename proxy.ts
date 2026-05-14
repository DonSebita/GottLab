import { updateSession } from '@/lib/supabase/middleware'
import { NextResponse, type NextRequest } from 'next/server'

const protectedPrefixes = ['/admin', '/panel-empleado', '/mi-cuenta']

export async function proxy(request: NextRequest) {
  const { supabaseResponse, user } = await updateSession(request)
  const pathname = request.nextUrl.pathname
  const needsAuth = protectedPrefixes.some((p) => pathname.startsWith(p))

  if (needsAuth && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('redirect', pathname)
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|placeholder.avif|.*\.(?:svg|png|jpg|jpeg|gif|webp|avif)$).*)'],
}
