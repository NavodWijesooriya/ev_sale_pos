"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { LoaderCircle } from "lucide-react"
import { toast } from "sonner"
import { saveCommissionSettings, type CommissionSettingsData } from "@/app/actions/commission-settings"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export function CommissionSettingsForm({ settings }: { settings: CommissionSettingsData }) {
  const router = useRouter()
  const [insurance, setInsurance] = React.useState(String(settings.fullInsuranceCommission))
  const [rates, setRates] = React.useState<Record<string, string>>(
    Object.fromEntries(settings.financeCompanies.map((c) => [c.id, c.defaultCommissionRate?.toString() ?? ""])),
  )
  const [saving, setSaving] = React.useState(false)

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    try {
      const result = await saveCommissionSettings({
        fullInsuranceCommission: Number(insurance),
        financeRates: settings.financeCompanies.map((c) => ({
          id: c.id,
          rate: rates[c.id]?.trim() ? Number(rates[c.id]) : null,
        })),
      })
      if (!result.success) {
        toast.error(result.message)
        return
      }
      toast.success(result.message)
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save settings.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={save} className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Commission Settings</h1>
        <p className="text-sm text-muted-foreground">
          Commissions are calculated automatically from these rules when a sale is made. Staff never see rates,
          amounts or recipients, and sales entered by staff record no commission.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Finance commission</CardTitle>
          <CardDescription>
            Percentage of the finance (loan) amount paid to the dealership by each finance company. Leave blank for none.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Finance company</TableHead>
                <TableHead className="w-48">Commission rate (%)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {settings.financeCompanies.length === 0 && (
                <TableRow>
                  <TableCell colSpan={2} className="py-6 text-center text-muted-foreground">
                    No finance companies yet. Add them under Finance Management.
                  </TableCell>
                </TableRow>
              )}
              {settings.financeCompanies.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      aria-label={`Commission rate for ${c.name}`}
                      value={rates[c.id] ?? ""}
                      onChange={(e) => setRates((current) => ({ ...current, [c.id]: e.target.value }))}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Insurance commission</CardTitle>
          <CardDescription>
            A fixed amount for Full Insurance issued through the dealership on a cash sale. Finance sales, the
            customer&apos;s own insurance, and no insurance always earn Rs. 0.
          </CardDescription>
        </CardHeader>
        <CardContent className="max-w-xs space-y-2">
          <Label htmlFor="full-insurance">Full insurance commission (Rs.)</Label>
          <Input
            id="full-insurance"
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
        {saving && <LoaderCircle className="size-4 animate-spin" />} Save settings
      </Button>
    </form>
  )
}
