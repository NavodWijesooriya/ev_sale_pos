import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  const url = req.nextUrl.clone();
  const pathname = url.pathname;
  const host = (req.headers.get('host') || '').split(':')[0].toLowerCase();

  // 1. Bypass all Next.js internals, API routes, and static assets
  if (
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/_static') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // 2. Bypass shared authentication routes so they are never rewritten
  if (pathname.startsWith('/login')) {
    return NextResponse.next();
  }

  // 3. Extract subdomain from host
  // Examples:
  // - "admin.localhost" or "admin.lvh.me" -> "admin"
  // - "apex.localhost" or "apex.lvh.me" -> "apex"
  // - "localhost" or "lvh.me" -> null
  let subdomain: string | null = null;
  const parts = host.split('.');

  if (host.endsWith('.localhost') && parts.length > 1) {
    subdomain = parts[0];
  } else if (host.endsWith('.lvh.me') && parts.length > 2) {
    subdomain = parts[0];
  } else if (parts.length > 2 && parts[0] !== 'www') {
    subdomain = parts[0];
  }

  // 4. Super Admin Subdomain (e.g. "admin.localhost" or "admin.lvh.me")
  if (subdomain === 'admin') {
    // If accessing root "/", rewrite to the Super Admin Portal
    if (pathname === '/') {
      url.pathname = '/admin-portal';
      return NextResponse.rewrite(url);
    }
    // Allow any other route through (e.g. /admin-portal/..., /login, etc.)
    return NextResponse.next();
  }

  // 5. Tenant Showroom Subdomains (e.g. "apex.localhost" or "apex.lvh.me")
  if (subdomain && subdomain !== 'localhost' && subdomain !== 'lvh' && subdomain !== 'www') {
    // If accessing the tenant's public root "/", rewrite to public showroom: /site/[domain]
    if (pathname === '/') {
      url.pathname = `/site/${encodeURIComponent(subdomain)}`;
      return NextResponse.rewrite(url);
    }
    // For dashboard, inventory, sales, etc., allow direct access without modifying pathname
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api/|_next/|_static/|_vercel|[\\w-]+\\.\\w+).*)",
  ],
};
