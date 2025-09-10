import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(request: NextRequest) {
  // Since we're using client-side Firebase auth without server-side session cookies,
  // we'll let the ProtectedRoute component handle authentication checks.
  // This prevents middleware conflicts with client-side auth state.
  
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    "/((?!api|_next/static|_next/image|favicon.ico|logo.png|placeholder.svg).*)",
  ],
}
