import { Badge } from "@/components/ui/badge"
import { formatLKR } from "@/lib/currency"

export interface FinanceReceivableDetail {
  financeCompany: string
  totalFinanceAmount: number
  status: string
  receivedAmount?: number | null
  balanceAmount?: number | null
}

function statusBadge(status: string) {
  if (status === "Received") {
    return <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">Received</Badge>
  }
  if (status === "Partial") {
    return <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400">Partial</Badge>
  }
  return <Badge variant="secondary">Pending</Badge>
}

/**
 * What the finance company still owes the dealership for one sale (commission is NOT included).
 * `compact` is a two-line version for table cells; the default is a small labelled block.
 */
export function FinanceReceivableSummary({
  detail,
  compact = false,
}: {
  detail: FinanceReceivableDetail
  compact?: boolean
}) {
  const received = detail.receivedAmount ?? 0
  const balance = detail.balanceAmount ?? Math.max(0, detail.totalFinanceAmount - received)

  if (compact) {
    return (
      <div className="mt-1 space-y-0.5 text-[11px] text-muted-foreground">
        <div className="flex items-center gap-1.5">
          {statusBadge(detail.status)}
          <span>{detail.financeCompany}</span>
        </div>
        <p>
          Owed by finance: <span className="font-semibold text-foreground">{formatLKR(balance)}</span>
        </p>
      </div>
    )
  }

  return (
    <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-4">
      <div>
        <dt className="text-xs uppercase tracking-wide text-muted-foreground">Finance company</dt>
        <dd className="font-medium">{detail.financeCompany}</dd>
      </div>
      <div>
        <dt className="text-xs uppercase tracking-wide text-muted-foreground">Finance amount</dt>
        <dd className="font-medium">{formatLKR(detail.totalFinanceAmount)}</dd>
      </div>
      <div>
        <dt className="text-xs uppercase tracking-wide text-muted-foreground">Received so far</dt>
        <dd className="font-medium text-emerald-700 dark:text-emerald-400">{formatLKR(received)}</dd>
      </div>
      <div>
        <dt className="text-xs uppercase tracking-wide text-muted-foreground">Balance owed</dt>
        <dd className="flex items-center gap-2 font-semibold">
          {formatLKR(balance)} {statusBadge(detail.status)}
        </dd>
      </div>
    </dl>
  )
}
