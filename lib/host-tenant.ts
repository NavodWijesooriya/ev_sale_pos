import { headers } from "next/headers"
import { cache } from "react"
import { classifyHost, normalizeHost, type HostInfo } from "@/lib/hosts"
import { prisma } from "@/lib/prisma"

/** The host the browser used (behind Vercel it arrives in x-forwarded-host). */
export async function getRequestHost(): Promise<string> {
  const h = await headers()
  return normalizeHost(h.get("x-forwarded-host") || h.get("host") || "")
}

export interface HostContext {
  host: string
  info: HostInfo
  /** For a custom domain: the dealership that owns it, or null when the domain is not configured (or suspended). */
  organizationId: string | null
  /** The owning dealership's public showroom slug (custom domains only). */
  subdomain: string | null
}

/** Who owns the domain this request came in on. Only custom domains are bound to one dealership. */
export const getHostContext = cache(async (): Promise<HostContext> => {
  const host = await getRequestHost()
  const info = classifyHost(host)
  if (info.kind !== "custom" || info.role === "admin") return { host, info, organizationId: null, subdomain: null }
  const org = await prisma.organization.findUnique({
    where: { customDomain: info.base },
    select: { id: true, subdomain: true, subscriptionStatus: true },
  })
  const active = org && org.subscriptionStatus === "Active" ? org : null
  return { host, info, organizationId: active?.id ?? null, subdomain: active?.subdomain ?? null }
})
