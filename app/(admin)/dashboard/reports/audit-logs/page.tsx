import { redirect } from "next/navigation"

// The audit log moved under Settings.
export default function LegacyAuditLogsPage() {
  redirect("/dashboard/settings/audit-logs")
}
