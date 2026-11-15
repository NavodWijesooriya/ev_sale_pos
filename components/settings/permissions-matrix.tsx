"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { LoaderCircle } from "lucide-react"
import { toast } from "sonner"
import { updateStaffPermissions, type StaffUserItem } from "@/app/actions/staff"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ALL_PERMISSIONS, PERMISSION_DEFINITIONS, sanitizePermissions } from "@/lib/permissions"

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
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Permissions</h1>
        <p className="text-sm text-muted-foreground">
          Tick what each staff member may do. Changes are enforced on the server and take effect on their next page load.
          The owner always has every permission.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Access matrix</CardTitle>
          <CardDescription>
            To assign a branch, use <span className="font-medium">Users</span>.
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-48">Staff member</TableHead>
                {ALL_PERMISSIONS.map((key) => (
                  <TableHead key={key} className="min-w-28 text-center align-bottom">
                    <span className="block text-xs leading-tight">{PERMISSION_DEFINITIONS[key].label}</span>
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
                  <TableCell>
                    <p className="font-medium">{user.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {user.role} · {user.branchName ?? "All branches"}
                    </p>
                  </TableCell>
                  {ALL_PERMISSIONS.map((key) => (
                    <TableCell key={key} className="text-center">
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
