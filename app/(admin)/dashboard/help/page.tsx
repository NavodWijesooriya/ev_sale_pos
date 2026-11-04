import { getAuthSession } from "@/lib/auth"
import { redirect } from "next/navigation"
import { HelpCenterView } from "@/components/help/help-center-view"

export const instant = false

export const metadata = {
  title: "Help Center & Documentation | Ev Sale Pos",
  description: "Interactive user guide, onboarding walkthroughs, and operational documentation for Dealership Staff and Owners",
}

export default async function HelpCenterPage() {
  const session = await getAuthSession()

  if (!session?.user) {
    redirect("/login?callbackUrl=/dashboard/help")
  }

  return (
    <HelpCenterView
      organizationName={session.user.organizationName || "Ev Sale Pos Dealership"}
      userRole={session.user.role}
    />
  )
}
