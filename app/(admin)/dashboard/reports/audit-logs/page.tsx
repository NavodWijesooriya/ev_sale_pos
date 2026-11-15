import Link from "next/link"
import { redirect } from "next/navigation"
import { getAuditLogs } from "@/app/actions/audit-logs"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { getAuthSession } from "@/lib/auth"
import { AUDIT_ACTION_LABELS } from "@/lib/audit"
import { isOwner } from "@/lib/permissions"

export const instant = false

export const metadata = {
  title: "Audit Logs | Ev Sale Pos",
  description: "Record of critical staff actions",
}

const selectClass =
  "h-10 rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/20 dark:bg-input/30"

type SearchParams = { page?: string; user?: string; action?: string; from?: string; to?: string }

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString("en-GB", {
    timeZone: "Asia/Colombo",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export default async function AuditLogsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const session = await getAuthSession()
  if (!session?.user?.organizationId) redirect("/login?callbackUrl=/dashboard/reports/audit-logs")
  // Owner only
  if (!isOwner(session.user)) redirect("/dashboard")

  const sp = await searchParams
  const result = await getAuditLogs({
    page: Number(sp.page) || 1,
    userId: sp.user,
    action: sp.action,
    from: sp.from,
    to: sp.to,
  })

  const pageHref = (page: number) => {
    const qs = new URLSearchParams()
    if (sp.user) qs.set("user", sp.user)
    if (sp.action) qs.set("action", sp.action)
    if (sp.from) qs.set("from", sp.from)
    if (sp.to) qs.set("to", sp.to)
    qs.set("page", String(page))
    return `/dashboard/reports/audit-logs?${qs.toString()}`
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Audit Logs</h1>
        <p className="text-sm text-muted-foreground">
          Who did what and when. Only the dealership owner can see this page.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Activity</CardTitle>
          <CardDescription>
            {result.total} {result.total === 1 ? "entry" : "entries"} · times shown in Sri Lanka time
          </CardDescription>
          <form method="get" className="flex flex-wrap items-end gap-3 pt-2">
            <label className="space-y-1 text-xs font-medium">
              User
              <select name="user" defaultValue={sp.user ?? ""} className={`${selectClass} block w-44`}>
                <option value="">All users</option>
                {result.users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-xs font-medium">
              Action
              <select name="action" defaultValue={sp.action ?? ""} className={`${selectClass} block w-56`}>
                <option value="">All actions</option>
                {Object.entries(AUDIT_ACTION_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-xs font-medium">
              From
              <Input type="date" name="from" defaultValue={sp.from ?? ""} className="w-40" />
            </label>
            <label className="space-y-1 text-xs font-medium">
              To
              <Input type="date" name="to" defaultValue={sp.to ?? ""} className="w-40" />
            </label>
            <Button type="submit">Filter</Button>
            <Link
              href="/dashboard/reports/audit-logs"
              className="inline-flex h-10 items-center rounded-xl border px-3 text-sm font-medium hover:bg-muted"
            >
              Reset
            </Link>
          </form>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Branch</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                    No activity recorded for these filters.
                  </TableCell>
                </TableRow>
              )}
              {result.rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="whitespace-nowrap text-xs">{formatWhen(row.createdAt)}</TableCell>
                  <TableCell className="font-medium">{row.userName}</TableCell>
                  <TableCell>{row.branchName ?? "-"}</TableCell>
                  <TableCell className="whitespace-nowrap">{row.actionLabel}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{row.description}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="flex items-center justify-between pt-4 text-sm">
            <span className="text-muted-foreground">
              Page {result.page} of {result.pageCount}
            </span>
            <div className="space-x-3">
              {result.page > 1 && (
                <Link href={pageHref(result.page - 1)} className="font-medium text-primary hover:underline">
                  Previous
                </Link>
              )}
              {result.page < result.pageCount && (
                <Link href={pageHref(result.page + 1)} className="font-medium text-primary hover:underline">
                  Next
                </Link>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
