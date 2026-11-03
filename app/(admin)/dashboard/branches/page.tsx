import { redirect } from "next/navigation"

export default function BranchesRedirectPage() {
  redirect("/dashboard/settings/branches")
}
