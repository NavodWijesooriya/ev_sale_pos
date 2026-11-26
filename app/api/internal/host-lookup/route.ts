import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

/**
 * Used by middleware.ts (which cannot run Prisma) to learn which dealership owns a custom domain.
 * Returns only the public showroom slug of an ACTIVE dealership; nothing else about the tenant.
 * ?domain=jayakodigroup.lk  ->  { found: true, subdomain: "jayakodi", domain: "jayakodigroup.lk" }
 */
export async function GET(request: Request) {
  const raw = new URL(request.url).searchParams.get("domain") ?? ""
  const domain = raw.trim().toLowerCase()
  if (!/^(?:[a-z0-9-]{1,63}\.)+[a-z]{2,24}$/.test(domain)) {
    return NextResponse.json({ found: false }, { status: 400, headers: { "Cache-Control": "no-store" } })
  }

  const org = await prisma.organization.findUnique({
    where: { customDomain: domain },
    select: { subdomain: true, customDomain: true, subscriptionStatus: true },
  })

  const found = Boolean(org && org.subscriptionStatus === "Active")
  return NextResponse.json(
    found ? { found: true, subdomain: org!.subdomain, domain: org!.customDomain } : { found: false },
    { headers: { "Cache-Control": "no-store" } },
  )
}
