"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { LoaderCircle, Pencil, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { createSupplier, deleteSupplier, updateSupplier } from "@/app/actions/inventory"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export interface SupplierListItem {
  id: string
  name: string
  contactPerson: string | null
  phone: string | null
  email: string | null
  grnCount: number
}

interface SupplierListProps {
  suppliers: SupplierListItem[]
  canManage: boolean
}

const emptyForm = { name: "", contactPerson: "", phone: "", email: "" }

export function SupplierList({ suppliers, canManage }: SupplierListProps) {
  const router = useRouter()
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<SupplierListItem | null>(null)
  const [form, setForm] = React.useState(emptyForm)
  const [deleting, setDeleting] = React.useState<SupplierListItem | null>(null)
  const [busy, setBusy] = React.useState(false)

  function openCreate() {
    setEditing(null)
    setForm(emptyForm)
    setDialogOpen(true)
  }

  function openEdit(supplier: SupplierListItem) {
    setEditing(supplier)
    setForm({
      name: supplier.name,
      contactPerson: supplier.contactPerson ?? "",
      phone: supplier.phone ?? "",
      email: supplier.email ?? "",
    })
    setDialogOpen(true)
  }

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    try {
      const result = editing ? await updateSupplier({ id: editing.id, ...form }) : await createSupplier(form)
      if (!result.success) {
        toast.error(result.message)
        return
      }
      toast.success(result.message)
      setDialogOpen(false)
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save supplier.")
    } finally {
      setBusy(false)
    }
  }

  async function confirmDelete() {
    if (!deleting) return
    setBusy(true)
    try {
      const result = await deleteSupplier(deleting.id)
      if (!result.success) {
        toast.error(result.message)
        return
      }
      toast.success(result.message)
      setDeleting(null)
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete supplier.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Suppliers</h1>
          <p className="text-sm text-muted-foreground">The companies you buy bikes from.</p>
        </div>
        {canManage && (
          <Button onClick={openCreate}>
            <Plus className="size-4" /> Add supplier
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All suppliers</CardTitle>
          <CardDescription>
            {canManage
              ? "Suppliers with GRNs or payment records can't be deleted."
              : "Only the dealership owner (or permitted staff) can add or edit suppliers."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Contact person</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="text-right">GRNs</TableHead>
                {canManage && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {suppliers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={canManage ? 6 : 5} className="py-8 text-center text-muted-foreground">
                    No suppliers yet.{canManage ? " Use “Add supplier” to create the first one." : ""}
                  </TableCell>
                </TableRow>
              )}
              {suppliers.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.name}</TableCell>
                  <TableCell>{s.contactPerson ?? "-"}</TableCell>
                  <TableCell>{s.phone ?? "-"}</TableCell>
                  <TableCell>{s.email ?? "-"}</TableCell>
                  <TableCell className="text-right">{s.grnCount}</TableCell>
                  {canManage && (
                    <TableCell className="space-x-2 text-right">
                      <Button size="sm" variant="outline" onClick={() => openEdit(s)}>
                        <Pencil className="size-3.5" /> Edit
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setDeleting(s)} aria-label={`Delete ${s.name}`}>
                        <Trash2 className="size-3.5" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit supplier" : "Add supplier"}</DialogTitle>
            <DialogDescription>Only the company name is required.</DialogDescription>
          </DialogHeader>
          <form onSubmit={save} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="sup-name">Company name</Label>
              <Input
                id="sup-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                maxLength={120}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sup-contact">Contact person</Label>
              <Input
                id="sup-contact"
                value={form.contactPerson}
                onChange={(e) => setForm({ ...form, contactPerson: e.target.value })}
                maxLength={120}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="sup-phone">Phone</Label>
                <Input
                  id="sup-phone"
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  maxLength={40}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sup-email">Email</Label>
                <Input
                  id="sup-email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  maxLength={120}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={busy}>
                {busy && <LoaderCircle className="size-4 animate-spin" />} {editing ? "Save changes" : "Add supplier"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete {deleting?.name}?</DialogTitle>
            <DialogDescription>This permanently removes the supplier and cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(null)}>
              Keep supplier
            </Button>
            <Button variant="destructive" disabled={busy} onClick={confirmDelete}>
              {busy && <LoaderCircle className="size-4 animate-spin" />} Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
