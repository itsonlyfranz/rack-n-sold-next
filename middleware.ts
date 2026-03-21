import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  
  // Create a Supabase client using the server client
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name) => req.cookies.get(name)?.value,
        set: (name, value, options) => {
          res.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove: (name, options) => {
          res.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  // First try to get authenticated user (more secure)
  let user: any = null
  let userError: any = null
  
  try {
    const result = await supabase.auth.getUser()
    user = result.data.user
    userError = result.error
  } catch (err: any) {
    // Handle JSON parsing errors from corrupted cookies
    if (err?.message?.includes('JSON') || err?.message?.includes('Unexpected token')) {
      console.warn('[Middleware] Corrupted auth cookie detected, clearing cookies')
      // Clear corrupted auth cookies
      const authCookieNames = ['sb-ukamngdajouofvynqjcn-auth-token', 'sb-auth-token']
      authCookieNames.forEach(name => {
        res.cookies.delete(name)
      })
      userError = { message: 'Corrupted session cookie cleared' }
    } else {
      userError = err
    }
  }
  
  // Debug logging to understand auth issues
  if (process.env.NODE_ENV === 'development') {
    console.log('[Middleware Debug] Path:', req.nextUrl.pathname)
    console.log('[Middleware Debug] Has user:', !!user)
    console.log('[Middleware Debug] User ID:', user?.id || 'none')
    console.log('[Middleware Debug] Auth error:', userError?.message || 'none')
    console.log('[Middleware Debug] Cookies:', req.cookies.getAll().map(c => c.name))
  }
  
  // We have an authenticated user if there's no error and we have a user object
  // OR if the only error is "session missing" (which is expected) but we still have a user
  const hasAuthenticatedUser = !!user
  
  // Only get session if we have an authenticated user (to minimize warnings)
  let session = null
  if (hasAuthenticatedUser) {
    const { data: sessionData } = await supabase.auth.getSession()
    session = sessionData.session
  }

  // Get current URL path
  const url = req.nextUrl.pathname

  // Handle redirects BEFORE authentication checks
  // Redirect /marketplace to /gallery
  if (url === '/marketplace' || url.startsWith('/marketplace/')) {
    return NextResponse.redirect(new URL('/gallery', req.url))
  }

  // Redirect /account to /profile (consolidated pages)
  if (url === '/account') {
    return NextResponse.redirect(new URL('/profile', req.url))
  }

  // Define protected paths
  const adminPaths = ['/admin']
  // Combine buyer/seller paths as general authenticated paths
  // Note: /profile removed - handles its own auth via useAuth hook
  const authenticatedPaths = ['/seller', '/artwork/create', '/buyer', '/cart']

  // Check if path requires authentication
  const isAdminPath = adminPaths.some(path => url.startsWith(path))
  const isAuthenticatedPath = authenticatedPaths.some(path => url.startsWith(path))
  
  // Redirect to login if not authenticated for protected paths
  if ((isAdminPath || isAuthenticatedPath) && !hasAuthenticatedUser) {
    const redirectUrl = new URL('/auth/login', req.url)
    redirectUrl.searchParams.set('redirectedFrom', req.nextUrl.pathname)
    return NextResponse.redirect(redirectUrl)
  }

  // If user is authenticated, check for admin path access
  if (hasAuthenticatedUser && isAdminPath && user) {
    // Fetch user role from DB
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    const role = userData?.role

    // Redirect non-admins away from admin paths
    if (role !== 'admin') {
      return NextResponse.redirect(new URL('/', req.url))
    }
  }
  
  // All other authenticated paths are accessible if logged in

  return res
}

// Define which paths this middleware should run on
export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|assets).*)',
  ],
} 