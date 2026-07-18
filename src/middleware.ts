import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const adminToken = request.cookies.get('dental_admin_token')
  const { pathname } = request.nextUrl

  // Admin routes protection
  if (pathname.startsWith('/admin')) {
    // Exclude login and capture routes
    if (pathname === '/admin/login' || pathname.startsWith('/admin/capture')) {
      // If user is already logged in, redirect away from login page to admin dashboard
      if (pathname === '/admin/login' && adminToken?.value === 'true') {
        return NextResponse.redirect(new URL('/admin', request.url))
      }
      return NextResponse.next()
    }

    // Require authentication for all other /admin/* routes
    if (!adminToken || adminToken.value !== 'true') {
      return NextResponse.redirect(new URL('/admin/login', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*']
}
