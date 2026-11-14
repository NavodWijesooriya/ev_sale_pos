import { Badge } from "@/components/ui/badge"

export const nativeSelectClass =
  "h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/20 dark:bg-input/30"

export function formatMoney(amount: number | null | undefined) {
  const value = Number.isFinite(amount ?? NaN) ? (amount as number) : 0
  return `Rs. ${new Intl.NumberFormat("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)}`
}

export function formatDate(value: string | null | undefined) {
  if (!value) return "-"
  return new Date(value).toLocaleDateString("en-GB", { timeZone: "UTC" })
}

export function todayISO() {
  const now = new Date()
  const offset = now.getTimezoneOffset() * 60_000
  return new Date(now.getTime() - offset).toISOString().slice(0, 10)
}

export function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "PAID":
    case "CLEARED":
    case "COMPLETED":
      return <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">{status}</Badge>
    case "PARTIAL":
    case "PENDING":
      return <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400">{status}</Badge>
    case "BOUNCED":
    case "REVERSED":
      return <Badge variant="destructive">{status}</Badge>
    default:
      return <Badge variant="secondary">{status}</Badge>
  }
}
