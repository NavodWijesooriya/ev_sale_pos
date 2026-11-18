"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Check, LoaderCircle } from "lucide-react"
import { toast } from "sonner"
import { saveBikeDmtWorkflow, type BikeDetails } from "@/app/actions/bike-details"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { allDocumentsReceived, type PlateStatusKey } from "@/lib/dmt"
import { cn } from "@/lib/utils"

type Dmt = NonNullable<BikeDetails["dmt"]>

const STAGES = ["Documents", "RMV submitted", "Number plate", "Book & completed"] as const

function stageIndex(dmt: Dmt): number {
  if (dmt.status === "Completed") return 4
  if (dmt.numberPlateStatus === "ISSUED") return 3
  if (dmt.rmvSubmitted) return 2
  if (allDocumentsReceived(dmt)) return 1
  return 0
}

function Check4({
  id,
  label,
  checked,
  disabled,
  onChange,
}: {
  id: string
  label: string
  checked: boolean
  disabled: boolean
  onChange: (value: boolean) => void
}) {
  return (
    <label htmlFor={id} className={cn("flex items-center gap-3 rounded-lg border p-3 text-sm", !disabled && "cursor-pointer hover:bg-muted/40")}>
      <input
        id={id}
        type="checkbox"
        className="size-4 accent-[var(--primary)]"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="font-medium">{label}</span>
    </label>
  )
}

/** Per-bike DMT / RMV checklist: documents, RMV submission, number plate and registration book. */
export function BikeDmtWorkflow({ saleId, initial, canEdit }: { saleId: string; initial: Dmt; canEdit: boolean }) {
  const router = useRouter()
  const [dmt, setDmt] = React.useState<Dmt>(initial)
  const [saving, setSaving] = React.useState(false)
  const set = <K extends keyof Dmt>(key: K, value: Dmt[K]) => setDmt((current) => ({ ...current, [key]: value }))
  const disabled = !canEdit || saving
  const stage = stageIndex(dmt)

  async function save() {
    setSaving(true)
    try {
      const result = await saveBikeDmtWorkflow(saleId, {
        hasMTA2: dmt.hasMTA2,
        hasNIC: dmt.hasNIC,
        hasPhotos: dmt.hasPhotos,
        hasTIN: dmt.hasTIN,
        rmvSubmitted: dmt.rmvSubmitted,
        numberPlateStatus: dmt.numberPlateStatus,
        isBookOk: dmt.isBookOk,
        isInsuranceOk: dmt.isInsuranceOk,
        registrationNumber: dmt.registrationNumber ?? "",
      })
      if (!result.success) {
        toast.error(result.message)
        return
      }
      toast.success(result.message)
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle>DMT / RMV registration</CardTitle>
            <CardDescription>
              Tick each step as it happens. The status and the dashboard counts follow automatically.
            </CardDescription>
          </div>
          <Badge variant={initial.status === "Completed" ? "default" : "secondary"}>{initial.status}</Badge>
        </div>
        <ol className="flex flex-wrap gap-2 pt-3 text-xs">
          {STAGES.map((label, index) => (
            <li
              key={label}
              className={cn(
                "flex items-center gap-1.5 rounded-full border px-3 py-1",
                index < stage ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" : "text-muted-foreground",
              )}
            >
              {index < stage && <Check className="size-3" />}
              {label}
            </li>
          ))}
        </ol>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <p className="text-sm font-medium">1. Documents received</p>
          <div className="grid gap-2 sm:grid-cols-2">
            <Check4 id="dmt-mta2" label="MTA2 form" checked={dmt.hasMTA2} disabled={disabled} onChange={(v) => set("hasMTA2", v)} />
            <Check4 id="dmt-nic" label="NIC copy" checked={dmt.hasNIC} disabled={disabled} onChange={(v) => set("hasNIC", v)} />
            <Check4 id="dmt-photos" label="Photos" checked={dmt.hasPhotos} disabled={disabled} onChange={(v) => set("hasPhotos", v)} />
            <Check4 id="dmt-tin" label="TIN" checked={dmt.hasTIN} disabled={disabled} onChange={(v) => set("hasTIN", v)} />
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">2. RMV submission</p>
          <Check4
            id="dmt-rmv"
            label="Documents submitted to RMV"
            checked={dmt.rmvSubmitted}
            disabled={disabled || (!dmt.rmvSubmitted && !allDocumentsReceived(dmt))}
            onChange={(v) => set("rmvSubmitted", v)}
          />
          {!allDocumentsReceived(dmt) && !dmt.rmvSubmitted && (
            <p className="text-xs text-muted-foreground">Available once all four documents are received.</p>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="dmt-plate">3. Number plate</Label>
            <select
              id="dmt-plate"
              className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm disabled:opacity-60"
              value={dmt.numberPlateStatus}
              disabled={disabled || !dmt.rmvSubmitted}
              onChange={(e) => set("numberPlateStatus", e.target.value as PlateStatusKey)}
            >
              <option value="PENDING">Not started</option>
              <option value="PROCESSING">Being made</option>
              <option value="ISSUED">Issued</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="dmt-reg">Registration number</Label>
            <Input
              id="dmt-reg"
              value={dmt.registrationNumber ?? ""}
              disabled={disabled}
              onChange={(e) => set("registrationNumber", e.target.value)}
              placeholder="e.g. WP BHE-1234"
              maxLength={20}
            />
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <Check4
            id="dmt-book"
            label="4. Registration book received"
            checked={dmt.isBookOk}
            disabled={disabled}
            onChange={(v) => set("isBookOk", v)}
          />
          <Check4
            id="dmt-insurance"
            label="Insurance card / policy"
            checked={dmt.isInsuranceOk}
            disabled={disabled}
            onChange={(v) => set("isInsuranceOk", v)}
          />
        </div>

        {canEdit ? (
          <Button onClick={save} disabled={saving}>
            {saving && <LoaderCircle className="size-4 animate-spin" />} Save progress
          </Button>
        ) : (
          <p className="text-sm text-muted-foreground">You can view this record but not change it.</p>
        )}
      </CardContent>
    </Card>
  )
}
