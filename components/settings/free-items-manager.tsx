"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { LoaderCircle, Pencil, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"
import {
  createFreeItem,
  deleteFreeItem,
  setFreeItemActive,
  updateFreeItem,
  type FreeItemRow,
} from "@/app/actions/free-items"
import { Badge } from "@/components/ui/badge"
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

export function FreeItemsManager({ items }: { items: FreeItemRow[] }) {
  const router = useRouter()
  const [editing, setEditing] = React.useState<FreeItemRow | "new" | null>(null)
  const [name, setName] = React.useState("")
  const [description, setDescription] = React.useState("")
  const [error, setError] = React.useState<string | null>(null)
  const [busy, setBusy] = React.useState(false)

  function openDialog(item: FreeItemRow | "new") {
    setEditing(item)
    setName(item === "new" ? "" : item.name)
    setDescription(item === "new" ? "" : (item.description ?? ""))
    setError(null)
  }

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!editing) return
    setBusy(true)
    setError(null)
    try {
      const input = { name, description }
      const result = editing === "new" ? await createFreeItem(input) : await updateFreeItem(editing.id, input)
      if (!result.success) {
        setError(result.error)
        return
      }
      toast.success(editing === "new" ? "Free item added." : "Free item updated.")
      setEditing(null)
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  async function toggle(item: FreeItemRow) {
    setBusy(true)
    try {
      const result = await setFreeItemActive(item.id, !item.isActive)
      if (!result.success) toast.error(result.error)
      else {
        toast.success(item.isActive ? `${item.name} is now inactive.` : `${item.name} is now active.`)
        router.refresh()
      }
    } finally {
      setBusy(false)
    }
  }

  async function remove(item: FreeItemRow) {
    if (!window.confirm(`Delete "${item.name}"?`)) return
    setBusy(true)
    try {
      const result = await deleteFreeItem(item.id)
      if (!result.success) toast.error(result.error)
      else {
        toast.success("Free item deleted.")
        router.refresh()
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Free Items</h1>
          <p className="text-sm text-muted-foreground">
            The items staff can give a customer free with a sale. Only active items are offered on new sales; sales
            already made keep the item names they were saved with.
          </p>
        </div>
        <Button type="button" className="gap-2" onClick={() => openDialog("new")}>
          <Plus className="size-4" />
          Add Free Item
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Items</CardTitle>
          <CardDescription>
            An item that was used in a sale cannot be deleted: set it Inactive instead.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Used in sales</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                    No free items yet.
                  </TableCell>
                </TableRow>
              )}
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell className="max-w-xs whitespace-normal text-muted-foreground">
                    {item.description || "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={item.isActive ? "default" : "secondary"}>
                      {item.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{item.usedInSales}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1.5">
                      <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => void toggle(item)}>
                        {item.isActive ? "Set inactive" : "Set active"}
                      </Button>
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="ghost"
                        aria-label={`Edit ${item.name}`}
                        onClick={() => openDialog(item)}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="ghost"
                        aria-label={`Delete ${item.name}`}
                        disabled={busy}
                        onClick={() => void remove(item)}
                      >
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={Boolean(editing)} onOpenChange={(open) => !open && !busy && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing === "new" ? "Add Free Item" : "Edit Free Item"}</DialogTitle>
            <DialogDescription>The name must be unique. The description is optional.</DialogDescription>
          </DialogHeader>
          <form onSubmit={save} className="space-y-4">
            {error && (
              <p role="alert" className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </p>
            )}
            <div className="space-y-2">
              <Label htmlFor="free-item-name">Name</Label>
              <Input id="free-item-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="free-item-description">Description (optional)</Label>
              <Input
                id="free-item-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={300}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" disabled={busy} onClick={() => setEditing(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={busy} className="gap-2">
                {busy && <LoaderCircle className="size-4 animate-spin" />}
                {editing === "new" ? "Add item" : "Save changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
