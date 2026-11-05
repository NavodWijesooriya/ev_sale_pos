import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getSupabaseUser } from '@/lib/supabase/middleware';

export async function middleware(req: NextRequest) {
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

  // 3. Fetch Supabase user (if any)
  const { user: supabaseUser, response: supabaseResponse } = await getSupabaseUser(req);
  const withSupabaseCookies = (response: NextResponse) => {
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      response.cookies.set(cookie.name, cookie.value, cookie);
    });
    return response;
  };

  // 4. Super Admin Subdomain
  if (subdomain === 'admin') {
    if (pathname === '/login') {
      url.pathname = '/admin-portal/login';
      return withSupabaseCookies(NextResponse.rewrite(url));
    }
    if (pathname === '/') {
      url.pathname = '/admin-portal';
      return withSupabaseCookies(NextResponse.rewrite(url));
    }
    if (pathname === '/help') {
      url.pathname = '/admin-portal/help';
      return withSupabaseCookies(NextResponse.rewrite(url));
    }
    // Admin routes are allowed; additional role checks can be added downstream
    return withSupabaseCookies(NextResponse.next());
  }

  // 5. Bypass tenant login routes
  if (pathname.startsWith('/login')) {
    return withSupabaseCookies(NextResponse.next());
  }

  // 6. Tenant subdomains
  if (subdomain && subdomain !== 'localhost' && subdomain !== 'lvh' && subdomain !== 'www') {
    if (!supabaseUser && !pathname.startsWith('/login')) {
      // No session -> redirect to login
      url.pathname = '/login';
      return withSupabaseCookies(NextResponse.rewrite(url));
    }
    if (pathname === '/') {
      url.pathname = `/site/${encodeURIComponent(subdomain)}`;
      return withSupabaseCookies(NextResponse.rewrite(url));
    }
    return withSupabaseCookies(NextResponse.next());
  }

  return withSupabaseCookies(NextResponse.next());
}

export const config = {
  matcher: [
    "/((?!api/|_next/|_static/|_vercel|[\\\\w-]+\\\\.\\\\w+).*)",
  ],
};
