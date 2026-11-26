"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { LoaderCircle, Pencil, Plus, Trash2, X } from "lucide-react"
import { toast } from "sonner"
import {
  addCompanyOffice,
  deleteCompanyOffice,
  updateCompanyOffice,
  type OfficeKind,
} from "@/app/actions/company-offices"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { OfficeInput } from "@/lib/company-offices"

export interface CompanyOfficeItem {
  id: string
  name: string
  address: string | null
  phone: string | null
  isActive: boolean
}

export const emptyOfficeRow = (): OfficeInput => ({ name: "", address: "", phone: "" })

/** Repeatable office rows for the Add Company form: add a row, remove a row. */
export function OfficeRowsEditor({
  rows,
  onChange,
  idPrefix,
}: {
  rows: OfficeInput[]
  onChange: (rows: OfficeInput[]) => void
  idPrefix: string
}) {
  const update = (index: number, patch: Partial<OfficeInput>) =>
    onChange(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)))
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label>Offices (optional)</Label>
        <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => onChange([...rows, emptyOfficeRow()])}>
          <Plus className="size-3.5" />
          Add office
        </Button>
      </div>
      {rows.length === 0 && (
        <p className="text-xs text-muted-foreground">
          No offices yet. You can add them now or later from the company&apos;s Manage Offices action.
        </p>
      )}
      {rows.map((row, index) => (
        <div key={index} className="grid gap-2 rounded-lg border p-3 sm:grid-cols-[1fr_1fr_9rem_auto]">
          <Input
            aria-label={`Office ${index + 1} name`}
            id={`${idPrefix}-office-name-${index}`}
            placeholder="Office name"
            value={row.name}
            maxLength={120}
            onChange={(event) => update(index, { name: event.target.value })}
          />
          <Input
            aria-label={`Office ${index + 1} address`}
            placeholder="Address"
            value={row.address ?? ""}
            maxLength={300}
            onChange={(event) => update(index, { address: event.target.value })}
          />
          <Input
            aria-label={`Office ${index + 1} phone`}
            placeholder="Phone"
            value={row.phone ?? ""}
            maxLength={40}
            onChange={(event) => update(index, { phone: event.target.value })}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={`Remove office ${index + 1}`}
            onClick={() => onChange(rows.filter((_, i) => i !== index))}
          >
            <X className="size-4" />
          </Button>
        </div>
      ))}
    </div>
  )
}

/** Add, edit, deactivate and delete the offices of one saved company. */
export function CompanyOfficesDialog({
  kind,
  company,
  onClose,
}: {
  kind: OfficeKind
  company: { id: string; name: string; offices: CompanyOfficeItem[] } | null
  onClose: () => void
}) {
  const router = useRouter()
  const [editingId, setEditingId] = React.useState<string | "new" | null>(null)
  const [draft, setDraft] = React.useState<OfficeInput>(emptyOfficeRow())
  const [error, setError] = React.useState<string | null>(null)
  const [busy, setBusy] = React.useState(false)

  function startEdit(office: CompanyOfficeItem | "new") {
    setError(null)
    if (office === "new") {
      setEditingId("new")
      setDraft(emptyOfficeRow())
    } else {
      setEditingId(office.id)
      setDraft({ name: office.name, address: office.address ?? "", phone: office.phone ?? "" })
    }
  }

  async function run(action: () => Promise<{ success: true } | { success: false; error: string }>, done: string) {
    setBusy(true)
    setError(null)
    try {
      const result = await action()
      if (!result.success) {
        setError(result.error)
        return false
      }
      toast.success(done)
      router.refresh()
      return true
    } finally {
      setBusy(false)
    }
  }

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!company || !editingId) return
    const ok =
      editingId === "new"
        ? await run(() => addCompanyOffice(kind, company.id, draft), "Office added.")
        : await run(() => updateCompanyOffice(editingId, draft), "Office updated.")
    if (ok) setEditingId(null)
  }

  return (
    <Dialog open={Boolean(company)} onOpenChange={(open) => !open && !busy && (setEditingId(null), onClose())}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Manage Offices</DialogTitle>
          <DialogDescription>{company?.name}</DialogDescription>
        </DialogHeader>

        {error && (
          <p role="alert" className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </p>
        )}

        <div className="max-h-72 space-y-2 overflow-y-auto">
          {company?.offices.map((office) => (
            <div key={office.id} className="flex items-center gap-3 rounded-lg border p-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {office.name}{" "}
                  {!office.isActive && <Badge variant="secondary">Inactive</Badge>}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {[office.address, office.phone].filter(Boolean).join(" · ") || "No address or phone"}
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={() =>
                  void run(
                    () => updateCompanyOffice(office.id, { name: office.name, address: office.address, phone: office.phone, isActive: !office.isActive }),
                    office.isActive ? "Office set inactive." : "Office set active.",
                  )
                }
              >
                {office.isActive ? "Set inactive" : "Set active"}
              </Button>
              <Button type="button" size="icon-sm" variant="ghost" aria-label={`Edit ${office.name}`} onClick={() => startEdit(office)}>
                <Pencil className="size-4" />
              </Button>
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                aria-label={`Delete ${office.name}`}
                disabled={busy}
                onClick={() => {
                  if (window.confirm(`Delete the office "${office.name}"?`)) void run(() => deleteCompanyOffice(office.id), "Office deleted.")
                }}
              >
                <Trash2 className="size-4 text-destructive" />
              </Button>
            </div>
          ))}
          {company?.offices.length === 0 && (
            <p className="rounded-lg border border-dashed p-5 text-center text-sm text-muted-foreground">No offices added yet.</p>
          )}
        </div>

        {editingId ? (
          <form onSubmit={save} className="space-y-3 border-t pt-4">
            <h3 className="text-sm font-medium">{editingId === "new" ? "Add office" : "Edit office"}</h3>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="office-name">Office name</Label>
                <Input id="office-name" value={draft.name} maxLength={120} required onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="office-address">Address</Label>
                <Input id="office-address" value={draft.address ?? ""} maxLength={300} onChange={(e) => setDraft({ ...draft, address: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="office-phone">Phone</Label>
                <Input id="office-phone" value={draft.phone ?? ""} maxLength={40} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" disabled={busy} onClick={() => setEditingId(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={busy} className="gap-2">
                {busy && <LoaderCircle className="size-4 animate-spin" />}
                {editingId === "new" ? "Add office" : "Save office"}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <DialogFooter>
            <Button type="button" className="gap-2" onClick={() => startEdit("new")}>
              <Plus className="size-4" />
              Add office
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}
