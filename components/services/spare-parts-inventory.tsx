"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { PackagePlus, Pencil, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { formatLKR } from "@/lib/currency"
import {
  createSparePart,
  deleteSparePart,
  restockSparePart,
  updateSparePart,
} from "@/app/actions/spare-parts"

export interface SparePartInventoryItem {
  id: string
  name: string
  sku: string
  price: number
  stockQuantity: number
}

interface SparePartsInventoryProps {
  initialParts: SparePartInventoryItem[]
}

export function SparePartsInventory({ initialParts }: SparePartsInventoryProps) {
  const router = useRouter()
  const [parts, setParts] = React.useState(initialParts)
  const [name, setName] = React.useState("")
  const [sku, setSku] = React.useState("")
  const [partNumber, setPartNumber] = React.useState("")
  const [searchSku, setSearchSku] = React.useState("")
  const [price, setPrice] = React.useState("")
  const [stockQuantity, setStockQuantity] = React.useState("")
  const [isPending, startTransition] = React.useTransition()

  const refresh = () => {
    router.refresh()
  }

  const handleCreate = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    startTransition(async () => {
      const result = await createSparePart({
        name,
        sku,
        price: Number(price),
        stockQuantity: Number(stockQuantity),
      })
      if (!result.success) {
        toast.error(result.error)
        return
      }
      toast.success("Spare part added to inventory.")
      setParts((current) => [...current, result.data].sort((a, b) => a.name.localeCompare(b.name)))
      setName("")
      setSku("")
      setPrice("")
      setStockQuantity("")
      refresh()
    })
  }

  const handleSave = (part: SparePartInventoryItem) => {
    startTransition(async () => {
      const result = await updateSparePart(part)
      if (!result.success) {
        toast.error(result.error)
        return
      }
      toast.success("Spare part updated.")
      refresh()
    })
  }

  const handleRestock = (id: string, quantity: number) => {
    startTransition(async () => {
      const result = await restockSparePart(id, quantity)
      if (!result.success) {
        toast.error(result.error)
        return
      }
      toast.success("Spare-part stock restocked.")
      setParts((current) =>
        current.map((part) =>
          part.id === id ? { ...part, stockQuantity: part.stockQuantity + quantity } : part,
        ),
      )
      refresh()
    })
  }

  const handleDelete = (id: string) => {
    if (!window.confirm("Delete this spare part? Parts already used on a service job cannot be deleted.")) {
      return
    }
    startTransition(async () => {
      const result = await deleteSparePart(id)
      if (!result.success) {
        toast.error(result.error)
        return
      }
      toast.success("Spare part deleted.")
      setParts((current) => current.filter((part) => part.id !== id))
      refresh()
    })
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Spare Parts Inventory</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Maintain the master parts catalog and stock available to service staff.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <PackagePlus className="size-5 text-primary" />
            Add spare part
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <div className="space-y-1.5">
              <Label htmlFor="part-name">Part name</Label>
              <Input id="part-name" value={name} onChange={(event) => setName(event.target.value)} required maxLength={120} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="part-sku">SKU</Label>
              <Input id="part-sku" value={sku} onChange={(event) => setSku(event.target.value)} required maxLength={64} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="part-price">Unit price (LKR)</Label>
              <Input id="part-price" type="number" min="0" step="0.01" value={price} onChange={(event) => setPrice(event.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="part-stock">Opening stock</Label>
              <Input id="part-stock" type="number" min="0" step="1" value={stockQuantity} onChange={(event) => setStockQuantity(event.target.value)} required />
            </div>
            <div className="flex items-end">
              <Button type="submit" disabled={isPending} className="w-full gap-2">
                <Plus className="size-4" />
                Add Part
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Parts catalog ({parts.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {parts.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No spare parts yet. Add one above to make it available on job cards.
            </p>
          ) : (
            parts.map((part) => (
              <div key={part.id} className="grid gap-3 rounded-xl border p-3 sm:grid-cols-12 sm:items-end">
                <div className="space-y-1 sm:col-span-3">
                  <Label htmlFor={`name-${part.id}`}>Name</Label>
                  <Input
                    id={`name-${part.id}`}
                    value={part.name}
                    onChange={(event) => setParts((current) => current.map((item) => item.id === part.id ? { ...item, name: event.target.value } : item))}
                  />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <Label htmlFor={`sku-${part.id}`}>SKU</Label>
                  <Input
                    id={`sku-${part.id}`}
                    value={part.sku}
                    onChange={(event) => setParts((current) => current.map((item) => item.id === part.id ? { ...item, sku: event.target.value } : item))}
                  />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <Label htmlFor={`price-${part.id}`}>Unit price (LKR)</Label>
                  <Input
                    id={`price-${part.id}`}
                    type="number"
                    min="0"
                    step="0.01"
                    value={part.price}
                    onChange={(event) => setParts((current) => current.map((item) => item.id === part.id ? { ...item, price: Number(event.target.value) } : item))}
                  />
                </div>
                <div className="sm:col-span-1">
                  <span className="text-xs text-muted-foreground">Stock</span>
                  <p className="py-2 font-semibold">{part.stockQuantity}</p>
                </div>
                <div className="flex gap-2 sm:col-span-4">
                  <Button type="button" variant="outline" size="icon" title="Save changes" disabled={isPending} onClick={() => handleSave(part)}>
                    <Pencil className="size-4" />
                  </Button>
                  <form
                    className="flex min-w-0 flex-1 gap-2"
                    onSubmit={(event) => {
                      event.preventDefault()
                      const quantity = Number(new FormData(event.currentTarget).get("quantity"))
                      handleRestock(part.id, quantity)
                      event.currentTarget.reset()
                    }}
                  >
                    <Input name="quantity" type="number" min="1" step="1" placeholder="Qty" aria-label={`Restock quantity for ${part.name}`} required />
                    <Button type="submit" variant="secondary" disabled={isPending}>Restock</Button>
                  </form>
                  <Button type="button" variant="destructive" size="icon" title="Delete part" disabled={isPending} onClick={() => handleDelete(part.id)}>
                    <Trash2 className="size-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground sm:col-span-12">
                  Current value: {formatLKR(part.price)}
                </p>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}
