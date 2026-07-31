import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifyToken } from '@/lib/auth'

export async function middleware(request: NextRequest) {
  const adminToken = request.cookies.get('dental_admin_token')
  const { pathname } = request.nextUrl

  // Admin routes protection
  if (pathname.startsWith('/admin')) {
    const verifiedAdmin = await verifyToken(adminToken?.value)
    const isValid = verifiedAdmin === 'admin'

    // Exclude login and capture routes
    if (pathname === '/admin/login' || pathname.startsWith('/admin/capture')) {
      // If user is already logged in, redirect away from login page to admin dashboard
      if (pathname === '/admin/login' && isValid) {
        return NextResponse.redirect(new URL('/admin', request.url))
      }
      return NextResponse.next()
    }

    // Require authentication for all other /admin/* routes
    if (!isValid) {
      return NextResponse.redirect(new URL('/admin/login', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*']
}
