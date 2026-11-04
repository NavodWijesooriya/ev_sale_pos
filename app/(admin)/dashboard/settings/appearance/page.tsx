import { getAuthSession } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { AppearanceSettings } from "@/components/settings/appearance-settings"

export const instant = false

export const metadata = {
  title: "Storefront Appearance & Branding | Ev Sale Pos",
  description: "Customize storefront logo, hero banner, theme colors, and public showroom branding",
}

export default async function AppearancePage() {
  const session = await getAuthSession()

  if (!session?.user) {
    redirect("/login?callbackUrl=/dashboard/settings/appearance")
  }

  // Security: only OrgAdmin can configure dealership branding
  if (session.user.role !== "OrgAdmin" && session.user.role !== "SuperAdmin") {
    redirect("/dashboard")
  }

  const organization = await prisma.organization.findUnique({
    where: { id: session.user.organizationId },
    select: {
      businessName: true,
      subdomain: true,
      domain: true,
      phone: true,
      logoUrl: true,
    },
  })

  if (!organization) {
    redirect("/dashboard")
  }

  return <AppearanceSettings initialData={organization} />
}

