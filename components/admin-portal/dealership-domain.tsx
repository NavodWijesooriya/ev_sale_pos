"use client"

import * as React from "react"
import { Globe, LoaderCircle } from "lucide-react"
import { toast } from "sonner"
import { setDealershipCustomDomain } from "@/app/actions/platform-domains"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

/** Set or clear one dealership's own domain (platform administrators only). */
export function DealershipDomain({ organizationId, customDomain }: { organizationId: string; customDomain: string | null }) {
  const [saved, setSaved] = React.useState(customDomain)
  const [value, setValue] = React.useState(customDomain ?? "")
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  async function save(domain: string | null) {
    setBusy(true)
    setError(null)
    const result = await setDealershipCustomDomain({ organizationId, domain })
    setBusy(false)
    if (result.success) {
      setSaved(result.domain)
      setValue(result.domain ?? "")
      toast.success(result.message)
    } else {
      setError(result.message)
    }
  }

  return (
    <div className="space-y-2 border-b px-4 py-3" data-testid="dealership-domain">
      <Label htmlFor={`domain-${organizationId}`} className="flex items-center gap-1.5 text-xs font-semibold">
        <Globe className="size-3.5" /> Custom domain
      </Label>
      <div className="flex flex-wrap items-center gap-2">
        <Input
          id={`domain-${organizationId}`}
          className="h-8 w-72"
          placeholder="e.g. jayakodigroup.lk"
          value={value}
          onChange={(event) => setValue(event.target.value)}
        />
        <Button type="button" size="sm" disabled={busy || value.trim() === (saved ?? "")} onClick={() => save(value)}>
          {busy && <LoaderCircle className="size-3.5 animate-spin" />} Save
        </Button>
        {saved && (
          <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => save(null)}>
            Clear
          </Button>
        )}
      </div>
      {error && <p role="alert" className="text-xs text-red-600">{error}</p>}
      <p className="text-xs text-muted-foreground">
        {saved
          ? `Showroom: ${saved} and www.${saved} · Dealership app: pos.${saved}`
          : "No custom domain. Enter the bare domain; pos.<domain> for the app is derived automatically."}
      </p>
    </div>
  )
}
