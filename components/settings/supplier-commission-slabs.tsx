"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { LoaderCircle, Plus, Trash2 } from "lucide-react"
import { saveSupplierSlabs, type SlabRow } from "@/app/actions/supplier-commission"
import { SettingsPageHeader } from "@/components/settings/settings-page-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { validateSlabs } from "@/lib/supplier-commission"

interface DraftSlab {
  key: number
  fromPercent: string
  amountPerUnit: string
}

/** Owner-only editor for the supplier commission ladder. Saving replaces the whole ladder in one step. */
export function SupplierCommissionSlabs({ slabs }: { slabs: SlabRow[] }) {
  const router = useRouter()
  const nextKey = React.useRef(slabs.length)
  const [rows, setRows] = React.useState<DraftSlab[]>(() =>
    slabs.map((slab, index) => ({ key: index, fromPercent: String(slab.fromPercent), amountPerUnit: String(slab.amountPerUnit) })),
  )
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const parsed = rows.map((row) => ({ fromPercent: Number(row.fromPercent), amountPerUnit: Number(row.amountPerUnit) }))
  const blank = rows.some((row) => row.fromPercent.trim() === "" || row.amountPerUnit.trim() === "")

  function update(key: number, field: "fromPercent" | "amountPerUnit", value: string) {
    setRows((current) => current.map((row) => (row.key === key ? { ...row, [field]: value } : row)))
  }

  function addRow() {
    setRows((current) => [...current, { key: nextKey.current++, fromPercent: "", amountPerUnit: "" }])
  }

  async function save() {
    setError(null)
    if (blank) return setError("Fill in every slab, or remove the empty row.")
    const problem = validateSlabs(parsed)
    if (problem) return setError(problem)
    setSaving(true)
    const result = await saveSupplierSlabs(parsed)
    setSaving(false)
    if (result.success) {
      toast.success(result.message)
      router.refresh()
    } else {
      setError(result.error)
    }
  }

  const sorted = [...parsed].filter((s) => Number.isFinite(s.fromPercent) && s.fromPercent > 0).sort((a, b) => a.fromPercent - b.fromPercent)

  return (
    <div className="space-y-6">
      <SettingsPageHeader page="supplier-commission" />

      <Card>
        <CardHeader>
          <CardTitle>Commission slabs</CardTitle>
          <CardDescription>
            When a supplier&apos;s monthly achievement is at least the &quot;from %&quot;, the supplier pays that amount for every unit sold
            that month. The slab with the highest &quot;from %&quot; that the achievement reaches applies. 0% achievement, or no target, earns
            nothing. Months you have already closed keep the slabs they were closed with.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="max-w-xl space-y-2">
            <div className="grid grid-cols-[1fr_1fr_2.5rem] gap-3 text-xs font-medium text-muted-foreground">
              <span>From achievement %</span>
              <span>Commission per unit (Rs.)</span>
              <span />
            </div>
            {rows.map((row) => (
              <div key={row.key} className="grid grid-cols-[1fr_1fr_2.5rem] items-center gap-3" data-testid="slab-row">
                <Input
                  type="number"
                  min={0}
                  step="any"
                  inputMode="decimal"
                  aria-label="From achievement percent"
                  value={row.fromPercent}
                  onChange={(event) => update(row.key, "fromPercent", event.target.value)}
                />
                <Input
                  type="number"
                  min={0}
                  step="any"
                  inputMode="decimal"
                  aria-label="Commission per unit"
                  value={row.amountPerUnit}
                  onChange={(event) => update(row.key, "amountPerUnit", event.target.value)}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Remove slab"
                  disabled={rows.length <= 1}
                  onClick={() => setRows((current) => current.filter((r) => r.key !== row.key))}
                >
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={addRow}>
              <Plus className="size-4" /> Add slab
            </Button>
          </div>

          {sorted.length > 0 && (
            <div className="rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
              <p className="mb-1 font-medium text-foreground">How it reads</p>
              <ul className="list-disc space-y-0.5 pl-5">
                {sorted.map((slab, index) => {
                  const next = sorted[index + 1]
                  return (
                    <li key={slab.fromPercent}>
                      {next ? `${slab.fromPercent}% up to just under ${next.fromPercent}%` : `${slab.fromPercent}% and above`}: Rs.{" "}
                      {Number.isFinite(slab.amountPerUnit) ? slab.amountPerUnit.toLocaleString("en-LK") : "?"} per unit
                    </li>
                  )
                })}
              </ul>
            </div>
          )}

          {error && (
            <p role="alert" data-testid="slab-error" className="rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-600">
              {error}
            </p>
          )}

          <Button type="button" onClick={save} disabled={saving} data-testid="save-slabs">
            {saving && <LoaderCircle className="size-4 animate-spin" />} Save slabs
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
