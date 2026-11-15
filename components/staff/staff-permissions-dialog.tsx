"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { LoaderCircle } from "lucide-react"
import { toast } from "sonner"
import { updateStaffPermissions, type BranchOption, type StaffUserItem } from "@/app/actions/staff"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { ALL_PERMISSIONS, PERMISSION_DEFINITIONS, sanitizePermissions } from "@/lib/permissions"

const selectClass =
  "h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/20 dark:bg-input/30"

interface StaffPermissionsDialogProps {
  user: StaffUserItem | null
  branches: BranchOption[]
  onClose: () => void
}

export function StaffPermissionsDialog({ user, branches, onClose }: StaffPermissionsDialogProps) {
  // Mount the form fresh for each staff member so its state starts from their saved values.
  if (!user) return null
  return <PermissionsForm key={user.id} user={user} branches={branches} onClose={onClose} />
}

function PermissionsForm({
  user,
  branches,
  onClose,
}: {
  user: StaffUserItem
  branches: BranchOption[]
  onClose: () => void
}) {
  const router = useRouter()
  const [selected, setSelected] = React.useState<string[]>(sanitizePermissions(user.permissions))
  const [branchId, setBranchId] = React.useState(user.branchId ?? "")
  const [saving, setSaving] = React.useState(false)

  function toggle(key: string, checked: boolean) {
    setSelected((current) => (checked ? [...current, key] : current.filter((k) => k !== key)))
  }

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    try {
      const result = await updateStaffPermissions({
        userId: user.id,
        permissions: selected,
        branchId: branchId || null,
      })
      if (!result.success) {
        toast.error(result.error)
        return
      }
      toast.success(`Access updated for ${user.name}.`)
      onClose()
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update access.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Access for {user.name}</DialogTitle>
          <DialogDescription>
            Choose what this person may do and which branch they work in. Changes apply on their next page load.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={save} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="perm-branch">Assigned branch</Label>
            <select
              id="perm-branch"
              className={selectClass}
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
            >
              <option value="">All branches (HQ) — no restriction</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">
              With a branch assigned, this person only sees and manages that branch&apos;s stock, sales and GRNs.
            </p>
          </div>

          <fieldset className="space-y-3">
            <legend className="text-sm font-medium">Permissions</legend>
            {ALL_PERMISSIONS.map((key) => {
              const def = PERMISSION_DEFINITIONS[key]
              return (
                <label key={key} className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 hover:bg-muted/40">
                  <input
                    type="checkbox"
                    className="mt-0.5 size-4 accent-[var(--primary)]"
                    checked={selected.includes(key)}
                    onChange={(e) => toggle(key, e.target.checked)}
                  />
                  <span className="space-y-0.5">
                    <span className="block text-sm font-medium">{def.label}</span>
                    <span className="block text-xs text-muted-foreground">{def.description}</span>
                  </span>
                </label>
              )
            })}
          </fieldset>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <LoaderCircle className="size-4 animate-spin" />} Save access
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
