/**
 * Host classification shared by middleware.ts (edge runtime) and server code. Pure: no imports, no I/O.
 *
 * A request host is one of:
 *  - "local"             localhost, 127.0.0.1, lvh.me (development)
 *  - "tenant-subdomain"  <name>.localhost, <name>.lvh.me, or <name>.<PLATFORM_ROOT_DOMAIN> (a dealership subdomain)
 *  - "platform"          *.vercel.app (the platform's own deployment hosts)
 *  - "custom"            anything else: a dealership's own domain, looked up in Organization.customDomain
 *
 * Only "tenant-subdomain" ever yields a tenant name. A *.vercel.app host, or a country domain such as x.com.lk,
 * is never mistaken for a tenant subdomain.
 *
 * For a custom domain "example.lk" the three hosts mean:
 *  - example.lk, www.example.lk   -> the public showroom ("showroom")
 *  - pos.example.lk               -> the dealership app: login and dashboard ("app")
 *  - admin.example.lk             -> never served (the platform admin portal must not exist on a customer domain)
 */

/** "Example.LK:443" and "www.example.lk" both become "example.lk". */
export function normalizeHost(raw: string | null | undefined): string {
  let host = (raw ?? "").split(",")[0].trim().toLowerCase()
  host = host.replace(/:\d+$/, "").replace(/\.$/, "")
  if (host.startsWith("www.")) host = host.slice(4)
  return host
}

export type CustomHostRole = "showroom" | "app" | "admin"

export type HostInfo =
  | { kind: "local"; admin: boolean }
  | { kind: "tenant-subdomain"; subdomain: string; admin: boolean }
  | { kind: "platform"; admin: boolean }
  | { kind: "custom"; base: string; role: CustomHostRole }

const IPV4 = /^(\d{1,3}\.){3}\d{1,3}$/

function platformRootDomains(): string[] {
  const raw = typeof process !== "undefined" ? process.env?.PLATFORM_ROOT_DOMAIN : undefined
  return (raw ?? "")
    .split(",")
    .map((value) => normalizeHost(value))
    .filter(Boolean)
}

/** admin.<host>, or a platform host whose first label starts with "admin-" (existing deployments rely on this). */
function looksLikeAdminHost(host: string): boolean {
  return host.startsWith("admin.") || host.split(".")[0].startsWith("admin-")
}

export function classifyHost(rawHost: string | null | undefined): HostInfo {
  const host = normalizeHost(rawHost)

  if (!host || IPV4.test(host) || host === "localhost" || host === "lvh.me") return { kind: "local", admin: false }

  for (const suffix of [".localhost", ".lvh.me"]) {
    if (host.endsWith(suffix)) {
      const subdomain = host.slice(0, -suffix.length).split(".")[0]
      return { kind: "tenant-subdomain", subdomain, admin: subdomain === "admin" }
    }
  }

  if (host === "vercel.app" || host.endsWith(".vercel.app")) return { kind: "platform", admin: looksLikeAdminHost(host) }

  for (const root of platformRootDomains()) {
    if (host === root) return { kind: "platform", admin: false }
    if (host.endsWith(`.${root}`)) {
      const subdomain = host.slice(0, -(root.length + 1)).split(".")[0]
      return { kind: "tenant-subdomain", subdomain, admin: subdomain === "admin" }
    }
  }

  if (host.startsWith("admin.")) return { kind: "custom", base: host.slice("admin.".length), role: "admin" }
  if (host.startsWith("pos.")) return { kind: "custom", base: host.slice("pos.".length), role: "app" }
  return { kind: "custom", base: host, role: "showroom" }
}

/** Validates and normalises a domain typed by a person ("WWW.Example.lk" -> "example.lk"). Returns null when invalid. */
export function parseCustomDomain(input: string): string | null {
  const value = input.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "")
  const host = normalizeHost(value)
  if (host.length > 253) return null
  if (!/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,24}$/.test(host)) return null
  return host
}

/** Domains a customer must never be given: the platform's own hosts. */
export function isReservedDomain(domain: string): boolean {
  if (domain === "localhost" || domain.endsWith(".localhost") || domain === "lvh.me" || domain.endsWith(".lvh.me")) return true
  if (domain === "vercel.app" || domain.endsWith(".vercel.app")) return true
  if (domain.startsWith("pos.") || domain.startsWith("admin.")) return true // enter the bare domain: pos./admin. are derived
  return platformRootDomains().some((root) => domain === root || domain.endsWith(`.${root}`))
}
