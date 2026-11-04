import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  const url = req.nextUrl.clone();
  const pathname = url.pathname;
  const rawHost = req.headers.get('x-forwarded-host') || req.headers.get('host') || '';
  const host = rawHost.split(':')[0].toLowerCase();

  // 1. Bypass all Next.js internals, API routes, and static assets
  if (
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/_static') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // 2. Extract subdomain from host
  // Examples:
  // - "admin.localhost" or "admin.lvh.me" -> "admin"
  // - "apex.localhost" or "apex.lvh.me" -> "apex"
  // - "localhost", "lvh.me", "127.0.0.1" -> null
  let subdomain: string | null = null;
  const isIpAddress = /^(\d{1,3}\.){3}\d{1,3}$/.test(host);

  if (!isIpAddress) {
    const parts = host.split('.');

    if (host.endsWith('.localhost') && parts.length > 1) {
      subdomain = parts[0];
    } else if (host.endsWith('.lvh.me') && parts.length > 2) {
      subdomain = parts[0];
    } else if (parts.length > 2 && parts[0] !== 'www') {
      subdomain = parts[0];
    }
  }

  // 3. Super Admin Subdomain (e.g. "admin.localhost", "admin.lvh.me", "admin.evsalepos.com")
  if (subdomain === 'admin') {
    // If accessing "/login", rewrite to dedicated Super Admin login page
    if (pathname === '/login') {
      url.pathname = '/admin-portal/login';
      return NextResponse.rewrite(url);
    }
    // If accessing root "/", rewrite to the Super Admin Portal
    if (pathname === '/') {
      url.pathname = '/admin-portal';
      return NextResponse.rewrite(url);
    }
    // If accessing "/help", rewrite to Super Admin documentation
    if (pathname === '/help') {
      url.pathname = '/admin-portal/help';
      return NextResponse.rewrite(url);
    }
    // Allow any other route through (e.g. /admin-portal/..., etc.)
    return NextResponse.next();
  }

  // 4. Bypass shared tenant authentication routes for non-admin hosts
  if (pathname.startsWith('/login')) {
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
