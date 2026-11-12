"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { PackagePlus, Pencil, Plus, Search, Trash2 } from "lucide-react"
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
  partNumber?: string | null
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
  const [searchQuery, setSearchQuery] = React.useState("")
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
        partNumber: partNumber.trim() || null,
        price: Number(price),
        stockQuantity: Number(stockQuantity),
      })
      if (!result.success) {
        toast.error(result.error)
        return
      }
      toast.success("Spare part added to inventory.")
      setParts((current) => [...current, result.data as SparePartInventoryItem].sort((a, b) => a.name.localeCompare(b.name)))
      setName("")
      setSku("")
      setPartNumber("")
      setPrice("")
      setStockQuantity("")
      refresh()
    })
  }

  const handleSave = (part: SparePartInventoryItem) => {
    startTransition(async () => {
      const result = await updateSparePart({
        id: part.id,
        name: part.name,
        sku: part.sku,
        partNumber: part.partNumber || null,
        price: part.price,
      })
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

  const filteredParts = React.useMemo(() => {
    if (!searchQuery.trim()) return parts
    const q = searchQuery.toLowerCase().trim()
    return parts.filter(
      (part) =>
        part.name.toLowerCase().includes(q) ||
        part.sku.toLowerCase().includes(q) ||
        (part.partNumber && part.partNumber.toLowerCase().includes(q)),
    )
  }, [parts, searchQuery])

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Spare Parts Inventory</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Maintain the master parts catalog, part numbers, and stock available to workshop staff.
        </p>
      </header>

      {/* Add New Part Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <PackagePlus className="size-5 text-primary" />
            Add spare part
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="part-name">Part name</Label>
              <Input id="part-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Brake Pads Set" required maxLength={120} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="part-sku">SKU</Label>
              <Input id="part-sku" value={sku} onChange={(event) => setSku(event.target.value)} placeholder="e.g. BRK-001" required maxLength={64} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="part-number">Part Number</Label>
              <Input id="part-number" value={partNumber} onChange={(event) => setPartNumber(event.target.value)} placeholder="e.g. PN-4029" maxLength={64} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="part-price">Unit price (LKR)</Label>
              <Input id="part-price" type="number" min="0" step="0.01" value={price} onChange={(event) => setPrice(event.target.value)} placeholder="0.00" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="part-stock">Opening stock</Label>
              <Input id="part-stock" type="number" min="0" step="1" value={stockQuantity} onChange={(event) => setStockQuantity(event.target.value)} placeholder="10" required />
            </div>
            <div className="flex items-end sm:col-span-2 lg:col-span-6">
              <Button type="submit" disabled={isPending} className="gap-2">
                <Plus className="size-4" />
                Add Part to Catalog
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Catalog Card */}
      <Card>
        <CardHeader className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <CardTitle className="text-base">
              Parts catalog ({filteredParts.length} of {parts.length})
            </CardTitle>
          </div>

          {/* Search Filter by Name, SKU, or Part Number */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search spare parts by Part Number, SKU, or Part Name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-10 text-xs bg-background"
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {filteredParts.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {searchQuery
                ? `No spare parts matching "${searchQuery}".`
                : "No spare parts yet. Add one above to make it available on job cards."}
            </p>
          ) : (
            filteredParts.map((part) => (
              <div key={part.id} className="grid gap-3 rounded-xl border p-3.5 sm:grid-cols-12 sm:items-end hover:bg-muted/30 transition-colors">
                <div className="space-y-1 sm:col-span-3">
                  <Label htmlFor={`name-${part.id}`} className="text-xs">Name</Label>
                  <Input
                    id={`name-${part.id}`}
                    value={part.name}
                    className="h-9 text-xs"
                    onChange={(event) => setParts((current) => current.map((item) => item.id === part.id ? { ...item, name: event.target.value } : item))}
                  />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <Label htmlFor={`sku-${part.id}`} className="text-xs">SKU</Label>
                  <Input
                    id={`sku-${part.id}`}
                    value={part.sku}
                    className="h-9 text-xs font-mono"
                    onChange={(event) => setParts((current) => current.map((item) => item.id === part.id ? { ...item, sku: event.target.value } : item))}
                  />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <Label htmlFor={`partNumber-${part.id}`} className="text-xs">Part Number</Label>
                  <Input
                    id={`partNumber-${part.id}`}
                    value={part.partNumber || ""}
                    placeholder="PN-XXXX"
                    className="h-9 text-xs font-mono"
                    onChange={(event) => setParts((current) => current.map((item) => item.id === part.id ? { ...item, partNumber: event.target.value } : item))}
                  />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <Label htmlFor={`price-${part.id}`} className="text-xs">Unit price (LKR)</Label>
                  <Input
                    id={`price-${part.id}`}
                    type="number"
                    min="0"
                    step="0.01"
                    value={part.price}
                    className="h-9 text-xs font-mono"
                    onChange={(event) => setParts((current) => current.map((item) => item.id === part.id ? { ...item, price: Number(event.target.value) } : item))}
                  />
                </div>
                <div className="sm:col-span-1">
                  <span className="text-[11px] text-muted-foreground">In Stock</span>
                  <p className="py-1 font-bold text-sm">{part.stockQuantity}</p>
                </div>
                <div className="flex gap-2 sm:col-span-2">
                  <Button type="button" variant="outline" size="icon" className="h-9 w-9 shrink-0" title="Save changes" disabled={isPending} onClick={() => handleSave(part)}>
                    <Pencil className="size-4" />
                  </Button>
                  <form
                    className="flex min-w-0 flex-1 gap-1.5"
                    onSubmit={(event) => {
                      event.preventDefault()
                      const formEl = event.currentTarget
                      const quantity = Number(new FormData(formEl).get("quantity"))
                      handleRestock(part.id, quantity)
                      formEl.reset()
                    }}
                  >
                    <Input name="quantity" type="number" min="1" step="1" placeholder="Qty" className="h-9 text-xs px-2" aria-label={`Restock quantity for ${part.name}`} required />
                    <Button type="submit" variant="secondary" className="h-9 px-2 text-xs" disabled={isPending}>+Qty</Button>
                  </form>
                  <Button type="button" variant="destructive" size="icon" className="h-9 w-9 shrink-0" title="Delete part" disabled={isPending} onClick={() => handleDelete(part.id)}>
                    <Trash2 className="size-4" />
                  </Button>
                </div>
                <p className="text-[11px] text-muted-foreground sm:col-span-12 font-mono">
                  Valuation: {formatLKR(part.price * part.stockQuantity)} ({formatLKR(part.price)} each)
                </p>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}
