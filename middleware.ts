import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

function extractDomainOrSubdomain(hostname: string): string | null {
  // Strip port if present
  const host = hostname.split(":")[0].toLowerCase()

  // Raw localhost or 127.0.0.1 without subdomain
  if (host === "localhost" || host === "127.0.0.1") {
    return null
  }

  // Handle *.localhost (e.g. apex.localhost)
  if (host.endsWith(".localhost")) {
    const parts = host.split(".")
    return parts[0] // e.g. "apex"
  }

  // Handle platforms like *.voltpos.com, *.vercel.app, *.ngrok-free.app
  const rootDomains = ["voltpos.com", "voltpos.io", "vercel.app", "ngrok.app", "ngrok-free.app"]
  for (const root of rootDomains) {
    if (host.endsWith("." + root)) {
      return host.replace("." + root, "")
    }
  }

  // Otherwise treat as custom domain (e.g. apexev.com)
  return host
}

export function middleware(req: NextRequest) {
  const url = req.nextUrl
  const hostname =
    req.headers.get("x-forwarded-host") ||
    req.headers.get("host") ||
    url.hostname
  const pathname = url.pathname

  // Bypass internal next.js files, API endpoints, static assets, and admin routes
  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/super-admin") ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/site") ||
    pathname.includes(".")
  ) {
    return NextResponse.next()
  }

  // 1. Query parameter override for easy localhost / dev testing:
  // e.g. http://localhost:3000/?domain=apex or ?dealership=apex
  const paramDomain =
    url.searchParams.get("domain") ||
    url.searchParams.get("dealership") ||
    url.searchParams.get("subdomain")

  if (paramDomain) {
    const targetPath = `/site/${encodeURIComponent(paramDomain)}${pathname === "/" ? "" : pathname}`
    return NextResponse.rewrite(new URL(targetPath, req.url))
  }

  // 2. Hostname-based routing (subdomain or custom domain)
  const tenant = extractDomainOrSubdomain(hostname)

  if (tenant) {
    const targetPath = `/site/${encodeURIComponent(tenant)}${pathname === "/" ? "" : pathname}`
    return NextResponse.rewrite(new URL(targetPath, req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - static image/asset extensions
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
}
