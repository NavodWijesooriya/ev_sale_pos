"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { LoaderCircle } from "lucide-react"
import { toast } from "sonner"
import { saveSaleChargeSettings } from "@/app/actions/sale-charge-settings"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { SaleChargeSettings } from "@/lib/validations/new-sale"

const toNumber = (value: string) => (value.trim() === "" ? Number.NaN : Number(value))

export function SaleChargeSettingsForm({ settings }: { settings: SaleChargeSettings }) {
  const router = useRouter()
  const [rmvFinance, setRmvFinance] = React.useState(String(settings.rmvChargeFinance))
  const [rmvCash, setRmvCash] = React.useState(String(settings.rmvChargeCash))
  const [insurance, setInsurance] = React.useState(String(settings.thirdPartyInsurance))
  const [saving, setSaving] = React.useState(false)

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    try {
      const result = await saveSaleChargeSettings({
        rmvChargeFinance: toNumber(rmvFinance),
        rmvChargeCash: toNumber(rmvCash),
        thirdPartyInsurance: toNumber(insurance),
      })
      if (!result.success) {
        toast.error(result.message)
        return
      }
      toast.success(result.message)
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save sale charges.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={save} className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Sale Charges</h1>
        <p className="text-sm text-muted-foreground">
          These amounts are added to every <strong>new</strong> sale. Sales already made keep the amounts they were
          saved with.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>RMV charge</CardTitle>
          <CardDescription>Added automatically to a sale, depending on its payment type.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="rmv-finance">RMV charge: Finance sales (Rs.)</Label>
            <Input
              id="rmv-finance"
              type="number"
              min="0"
              step="1"
              value={rmvFinance}
              onChange={(e) => setRmvFinance(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="rmv-cash">RMV charge: Cash sales (Rs.)</Label>
            <Input
              id="rmv-cash"
              type="number"
              min="0"
              step="1"
              value={rmvCash}
              onChange={(e) => setRmvCash(e.target.value)}
              required
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Third-party insurance</CardTitle>
          <CardDescription>
            Added to a sale when staff tick the Third-party insurance box on the sale form.
          </CardDescription>
        </CardHeader>
        <CardContent className="max-w-xs space-y-2">
          <Label htmlFor="third-party-insurance">Third-party insurance amount (Rs.)</Label>
          <Input
            id="third-party-insurance"
            type="number"
            min="0"
            step="1"
            value={insurance}
            onChange={(e) => setInsurance(e.target.value)}
            required
          />
        </CardContent>
      </Card>

      <Button type="submit" disabled={saving}>
        {saving && <LoaderCircle className="size-4 animate-spin" />} Save sale charges
      </Button>
    </form>
  )
}
