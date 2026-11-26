import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { classifyHost } from '@/lib/hosts';
import { getSupabaseUser } from '@/lib/supabase/middleware';

/**
 * Host routing.
 *
 *  - Platform / development hosts (localhost, lvh.me, *.vercel.app, <tenant>.localhost ...): unchanged tenant flow.
 *  - Custom domains (Organization.customDomain), e.g. jayakodigroup.lk:
 *      jayakodigroup.lk, www.jayakodigroup.lk  -> that dealership's public showroom only
 *      pos.jayakodigroup.lk                    -> the dealership app (/login, /dashboard ...)
 *      admin.jayakodigroup.lk, /admin-portal   -> 404 (the platform admin must never be reachable on a customer domain)
 *      unknown / suspended domain              -> "Domain not configured", never another tenant's data
 *
 * Middleware cannot run Prisma, so a custom domain is resolved through /api/internal/host-lookup (public showroom slug
 * only) and cached in memory for a short time.
 */

interface DomainLookup {
  found: boolean;
  subdomain: string | null;
}

const LOOKUP_TTL_FOUND_MS = 60_000;
const LOOKUP_TTL_MISSING_MS = 30_000;
const LOOKUP_CACHE_MAX = 500;
const lookupCache = new Map<string, { value: DomainLookup; expires: number }>();

/** Resolves a custom domain. Returns null when the lookup itself failed (never cached, never treated as "not found"). */
async function lookupCustomDomain(origin: string, domain: string): Promise<DomainLookup | null> {
  const cached = lookupCache.get(domain);
  if (cached && cached.expires > Date.now()) return cached.value;

  try {
    const response = await fetch(`${origin}/api/internal/host-lookup?domain=${encodeURIComponent(domain)}`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(3000),
    });
    if (!response.ok && response.status !== 400) return null;
    const data = (await response.json()) as { found?: boolean; subdomain?: string | null };
    const value: DomainLookup = { found: Boolean(data.found), subdomain: data.subdomain ?? null };
    if (lookupCache.size >= LOOKUP_CACHE_MAX) lookupCache.clear();
    lookupCache.set(domain, { value, expires: Date.now() + (value.found ? LOOKUP_TTL_FOUND_MS : LOOKUP_TTL_MISSING_MS) });
    return value;
  } catch {
    return null;
  }
}

export async function middleware(req: NextRequest) {
  const url = req.nextUrl.clone();
  const pathname = url.pathname;
  const rawHost = req.headers.get('x-forwarded-host') || req.headers.get('host') || '';
  const hostInfo = classifyHost(rawHost);

  // 1. Bypass all Next.js internals, API routes, and static assets
  if (
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/_static') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // 1b. Never keep credentials in a URL. If a login form was ever submitted
  // natively (GET), strip them and redirect to the clean URL.
  if (url.searchParams.has('password')) {
    url.searchParams.delete('password');
    url.searchParams.delete('email');
    return NextResponse.redirect(url);
  }

  const notFound = () => NextResponse.rewrite(new URL('/__not-found__', req.url), { status: 404 });
  const notConfigured = () => NextResponse.rewrite(new URL('/domain-not-configured', req.url), { status: 404 });
  const isAdminPath = pathname === '/admin-portal' || pathname.startsWith('/admin-portal/');

  // 2. Custom domains: one dealership per domain.
  if (hostInfo.kind === 'custom') {
    // The platform admin portal must not exist on any customer domain, configured or not.
    if (hostInfo.role === 'admin' || isAdminPath) return notFound();

    // HOST_LOOKUP_ORIGIN is only for local testing, where a custom domain does not resolve to this machine.
    const lookup = await lookupCustomDomain(process.env.HOST_LOOKUP_ORIGIN || req.nextUrl.origin, hostInfo.base);
    if (!lookup) {
      return new NextResponse('This site is temporarily unavailable. Please try again in a moment.', {
        status: 503,
        headers: { 'content-type': 'text/plain; charset=utf-8', 'retry-after': '10' },
      });
    }
    if (!lookup.found) return notConfigured();
    if (pathname === '/domain-not-configured') return NextResponse.next();

    // Only this dealership's own showroom may be shown on its domain.
    const ownSlugs = [lookup.subdomain, hostInfo.base].filter((slug): slug is string => Boolean(slug));
    const siteMatch = /^\/site\/([^/]+)\/?$/.exec(pathname);
    if (pathname.startsWith('/site/') || pathname === '/site') {
      const slug = siteMatch ? decodeURIComponent(siteMatch[1]).toLowerCase() : '';
      return ownSlugs.includes(slug) ? NextResponse.next() : notFound();
    }

    if (hostInfo.role === 'showroom') {
      if (pathname === '/') {
        url.pathname = `/site/${encodeURIComponent(lookup.subdomain ?? hostInfo.base)}`;
        return NextResponse.rewrite(url);
      }
      // The dealership app lives on pos.<domain>.
      if (pathname === '/login' || pathname.startsWith('/login/') || pathname === '/dashboard' || pathname.startsWith('/dashboard/')) {
        return NextResponse.redirect(new URL(`${req.nextUrl.protocol}//pos.${hostInfo.base}${pathname}${url.search}`));
      }
      return notFound();
    }

    // role === 'app' (pos.<domain>): the dealership app, same flow as a tenant subdomain.
    const { user: posUser, response: posResponse } = await getSupabaseUser(req);
    const withPosCookies = (response: NextResponse) => {
      posResponse.cookies.getAll().forEach((cookie) => {
        response.cookies.set(cookie.name, cookie.value, cookie);
      });
      return response;
    };
    if (pathname.startsWith('/login')) return withPosCookies(NextResponse.next());
    if (!posUser) {
      url.pathname = '/login';
      return withPosCookies(NextResponse.rewrite(url));
    }
    if (pathname === '/') {
      url.pathname = '/dashboard';
      return withPosCookies(NextResponse.redirect(url));
    }
    return withPosCookies(NextResponse.next());
  }

  // 3. Platform and development hosts. Only <name>.localhost, <name>.lvh.me (and <name>.PLATFORM_ROOT_DOMAIN)
  // are tenant subdomains; *.vercel.app and country domains such as x.com.lk never are.
  const subdomain = hostInfo.kind === 'tenant-subdomain' ? hostInfo.subdomain : null;

  // 4. Fetch Supabase user (if any)
  const { user: supabaseUser, response: supabaseResponse } = await getSupabaseUser(req);
  const withSupabaseCookies = (response: NextResponse) => {
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      response.cookies.set(cookie.name, cookie.value, cookie);
    });
    return response;
  };

  // 5. Super Admin hosts
  if (hostInfo.admin) {
    if (isAdminPath) {
      return withSupabaseCookies(NextResponse.next());
    }

    url.pathname =
      pathname === '/'
        ? '/admin-portal'
        : pathname === '/login' || pathname.startsWith('/login/')
          ? `/admin-portal${pathname}`
          : pathname === '/help'
            ? '/admin-portal/help'
            : `/admin-portal${pathname}`;
    return withSupabaseCookies(NextResponse.rewrite(url));
  }

  // 6. Bypass tenant login routes
  if (pathname.startsWith('/login')) {
    return withSupabaseCookies(NextResponse.next());
  }

  // 7. Tenant subdomains
  if (subdomain && subdomain !== 'www') {
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
