"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { LoaderCircle } from "lucide-react"
import { toast } from "sonner"
import { updateStaffPermissions, type StaffUserItem } from "@/app/actions/staff"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { SettingsPageHeader } from "@/components/settings/settings-page-header"
import {
  ALL_PERMISSIONS,
  PERMISSION_DEFINITIONS,
  PERMISSION_GROUPS,
  sanitizePermissions,
} from "@/lib/permissions"

const groupedColumns = PERMISSION_GROUPS.map((group) => ({
  group,
  keys: ALL_PERMISSIONS.filter((key) => PERMISSION_DEFINITIONS[key].group === group),
}))

const sameSet = (a: string[], b: string[]) => a.length === b.length && a.every((x) => b.includes(x))

/** Staff x permission checkbox grid. Owners are not listed: they always have every permission. */
export function PermissionsMatrix({ staff }: { staff: StaffUserItem[] }) {
  const router = useRouter()
  const [grants, setGrants] = React.useState<Record<string, string[]>>(() =>
    Object.fromEntries(staff.map((u) => [u.id, sanitizePermissions(u.permissions)])),
  )
  const [saving, setSaving] = React.useState(false)

  const dirtyUsers = staff.filter((u) => !sameSet(grants[u.id] ?? [], sanitizePermissions(u.permissions)))

  function toggle(userId: string, key: string, checked: boolean) {
    setGrants((current) => {
      const existing = current[userId] ?? []
      return { ...current, [userId]: checked ? [...existing, key] : existing.filter((k) => k !== key) }
    })
  }

  async function save() {
    setSaving(true)
    try {
      let failed = 0
      for (const user of dirtyUsers) {
        // Branch is left exactly as it is; this screen only edits permissions.
        const result = await updateStaffPermissions({
          userId: user.id,
          permissions: grants[user.id] ?? [],
          branchId: user.branchId ?? null,
        })
        if (!result.success) {
          failed += 1
          toast.error(`${user.name}: ${result.error}`)
        }
      }
      if (failed === 0) toast.success(`Permissions updated for ${dirtyUsers.length} staff member(s).`)
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save permissions.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <SettingsPageHeader
        page="permissions"
        description="Tick what each staff member may do. Enforced on the server; the owner always has every permission."
      />

      <Card>
        <CardHeader>
          <CardTitle>Access matrix</CardTitle>
          <CardDescription>
            To assign a branch, use <span className="font-medium">Users</span>.
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto px-3">
          {/* Compact on purpose: rotated column labels and narrow cells so every column fits a laptop screen. If a
              very small screen still needs to scroll, the staff column stays in place. */}
          <Table className="w-full table-fixed" data-testid="permissions-matrix">
            <TableHeader>
              <TableRow>
                <TableHead rowSpan={2} className="sticky left-0 z-10 w-44 min-w-44 bg-card align-bottom">
                  Staff member
                </TableHead>
                {groupedColumns.map(({ group, keys }) => (
                  <TableHead
                    key={group}
                    colSpan={keys.length}
                    className="h-auto whitespace-normal border-l bg-muted/40 px-1 py-1.5 text-center text-[10px] font-semibold uppercase leading-tight tracking-wide"
                  >
                    {group}
                  </TableHead>
                ))}
              </TableRow>
              <TableRow>
                {ALL_PERMISSIONS.map((key) => (
                  <TableHead
                    key={key}
                    title={PERMISSION_DEFINITIONS[key].description}
                    className="h-36 w-10 min-w-10 border-l px-0 text-center align-bottom"
                  >
                    <span className="mx-auto block whitespace-nowrap text-xs font-medium [text-orientation:mixed] [writing-mode:vertical-rl] rotate-180">
                      {PERMISSION_DEFINITIONS[key].label}
                    </span>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {staff.length === 0 && (
                <TableRow>
                  <TableCell colSpan={ALL_PERMISSIONS.length + 1} className="py-8 text-center text-muted-foreground">
                    No staff accounts besides the owner yet.
                  </TableCell>
                </TableRow>
              )}
              {staff.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="sticky left-0 z-10 bg-card">
                    <p className="truncate font-medium">{user.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {user.role} · {user.branchName ?? "All branches"}
                    </p>
                  </TableCell>
                  {ALL_PERMISSIONS.map((key) => (
                    <TableCell key={key} className="border-l px-0 text-center">
                      <input
                        type="checkbox"
                        className="size-4 accent-[var(--primary)]"
                        aria-label={`${PERMISSION_DEFINITIONS[key].label} for ${user.name}`}
                        checked={(grants[user.id] ?? []).includes(key)}
                        onChange={(e) => toggle(user.id, key, e.target.checked)}
                      />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="flex items-center gap-3">
        <Button onClick={save} disabled={saving || dirtyUsers.length === 0}>
          {saving && <LoaderCircle className="size-4 animate-spin" />} Save changes
        </Button>
        <span className="text-sm text-muted-foreground">
          {dirtyUsers.length === 0 ? "No unsaved changes" : `${dirtyUsers.length} staff member(s) changed`}
        </span>
      </div>
    </div>
  )
}
