"use client"

import * as React from "react"
import { LoaderCircle, ShieldAlert } from "lucide-react"
import { toast } from "sonner"
import {
  deleteOwner,
  getDealershipOwners,
  setOwnerActive,
  type DealershipOwner,
} from "@/app/actions/platform-owners"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })

/** The owners of one dealership, with disable / enable / delete (platform administrators only). */
export function DealershipOwners({ organizationId, businessName }: { organizationId: string; businessName: string }) {
  const [owners, setOwners] = React.useState<DealershipOwner[] | null>(null)
  const [busy, setBusy] = React.useState(false)
  const [disabling, setDisabling] = React.useState<DealershipOwner | null>(null)
  const [deleting, setDeleting] = React.useState<DealershipOwner | null>(null)
  const [confirmEmail, setConfirmEmail] = React.useState("")

  const [reloadKey, setReloadKey] = React.useState(0)
  const reload = () => setReloadKey((key) => key + 1)

  React.useEffect(() => {
    let cancelled = false
    getDealershipOwners(organizationId)
      .then((list) => {
        if (!cancelled) setOwners(list)
      })
      .catch(() => {
        if (cancelled) return
        toast.error("Could not load the owners.")
        setOwners([])
      })
    return () => {
      cancelled = true
    }
  }, [organizationId, reloadKey])

  async function run(action: () => Promise<{ success: boolean; message: string; requiresConfirmation?: boolean }>, done: () => void) {
    setBusy(true)
    try {
      const result = await action()
      if (!result.success) {
        toast.error(result.message)
        return
      }
      toast.success(result.message)
      done()
      reload()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Action failed.")
    } finally {
      setBusy(false)
    }
  }

  async function enable(owner: DealershipOwner) {
    await run(() => setOwnerActive({ userId: owner.id, active: true }), () => undefined)
  }

  return (
    <div className="space-y-3 px-4 py-3" aria-label={`Owners of ${businessName}`}>
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Dealership owners</h3>
      {owners === null ? (
        <p className="text-xs text-muted-foreground">Loading owners...</p>
      ) : owners.length === 0 ? (
        <p className="text-xs text-muted-foreground">This dealership has no owner account.</p>
      ) : (
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-muted-foreground">
              <th className="py-1 pr-4 font-medium">Name</th>
              <th className="py-1 pr-4 font-medium">Email</th>
              <th className="py-1 pr-4 font-medium">Status</th>
              <th className="py-1 pr-4 font-medium">Created</th>
              <th className="py-1 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {owners.map((owner) => (
              <tr key={owner.id} className="border-t">
                <td className="py-2 pr-4 font-medium">{owner.name}</td>
                <td className="py-2 pr-4 font-mono">{owner.email}</td>
                <td className="py-2 pr-4">
                  <Badge variant={owner.isActive ? "default" : "destructive"}>{owner.isActive ? "Active" : "Disabled"}</Badge>
                </td>
                <td className="py-2 pr-4 font-mono text-muted-foreground">{formatDate(owner.createdAt)}</td>
                <td className="space-x-2 py-2 text-right">
                  {owner.isActive ? (
                    <Button size="sm" variant="outline" disabled={busy} onClick={() => setDisabling(owner)}>
                      Disable
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" disabled={busy} onClick={() => enable(owner)}>
                      Enable
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={busy}
                    onClick={() => {
                      setConfirmEmail("")
                      setDeleting(owner)
                    }}
                  >
                    Delete
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <Dialog open={!!disabling} onOpenChange={(open) => !open && setDisabling(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Disable {disabling?.email}?</DialogTitle>
            <DialogDescription>
              They will be signed out of any open session and cannot sign in until you enable the account again. Their records are kept.
            </DialogDescription>
          </DialogHeader>
          {disabling?.isLastActiveOwner && <LastOwnerWarning />}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDisabling(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={busy}
              onClick={() =>
                disabling &&
                run(
                  () => setOwnerActive({ userId: disabling.id, active: false, acknowledgeLastOwner: disabling.isLastActiveOwner }),
                  () => setDisabling(null),
                )
              }
            >
              {busy && <LoaderCircle className="size-4 animate-spin" />}
              {disabling?.isLastActiveOwner ? "Disable anyway" : "Disable owner"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete {deleting?.email}?</DialogTitle>
            <DialogDescription>
              An owner with no history is removed completely, including the sign-in account. An owner who has made sales,
              payments or other records is disabled instead, so those records stay.
            </DialogDescription>
          </DialogHeader>
          {deleting?.isLastActiveOwner && <LastOwnerWarning />}
          <div className="space-y-2">
            <Label htmlFor="confirm-owner-email">Type the owner&apos;s email to confirm</Label>
            <Input
              id="confirm-owner-email"
              autoComplete="off"
              value={confirmEmail}
              onChange={(e) => setConfirmEmail(e.target.value)}
              placeholder={deleting?.email}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={busy || confirmEmail.trim().toLowerCase() !== deleting?.email.toLowerCase()}
              onClick={() =>
                deleting &&
                run(
                  () => deleteOwner({ userId: deleting.id, confirmEmail, acknowledgeLastOwner: deleting.isLastActiveOwner }),
                  () => setDeleting(null),
                )
              }
            >
              {busy && <LoaderCircle className="size-4 animate-spin" />} Delete owner
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function LastOwnerWarning() {
  return (
    <div role="alert" className="flex gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-xs">
      <ShieldAlert className="mt-0.5 size-4 shrink-0 text-amber-600" />
      <p>
        This is the <strong>last active owner</strong> of an active dealership. After this, nobody at the dealership can sign
        in. You can still continue.
      </p>
    </div>
  )
}
