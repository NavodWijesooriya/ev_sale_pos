import { redirect } from "next/navigation"
import { getFreeItems } from "@/app/actions/free-items"
import { FreeItemsManager } from "@/components/settings/free-items-manager"
import { getAuthSession } from "@/lib/auth"
import { isOwner } from "@/lib/permissions"

export const instant = false

export const metadata = {
  title: "Free Items | Ev Sale Pos",
  description: "Manage the free items offered with a sale",
}

export default async function FreeItemsPage() {
  const session = await getAuthSession()
  if (!session?.user?.organizationId) redirect("/login?callbackUrl=/dashboard/settings/free-items")
  // Owner / admin only
  if (!isOwner(session.user)) redirect("/dashboard")

  const items = await getFreeItems()
  return (
    <div className="w-full">
      <FreeItemsManager items={items} />
    </div>
  )
}
