import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import type { OwnershipHistory } from "@/lib/ownership"

const money = (n: number) => `Rs. ${new Intl.NumberFormat("en-LK", { minimumFractionDigits: 2 }).format(n)}`

/** A customer's name, linked to their profile only when the viewer may open customer pages. */
function Person({ id, name, link }: { id: string; name: string; link: boolean }) {
  return link ? (
    <Link href={`/dashboard/customers/${id}`} className="font-medium text-primary hover:underline">
      {name}
    </Link>
  ) : (
    <span className="font-medium">{name}</span>
  )
}

/** Original buyer -> each transfer (date, from, to, staff member), newest owner last. */
export function OwnershipHistoryList({ history, linkCustomers = true }: { history: OwnershipHistory; linkCustomers?: boolean }) {
  return (
    <div className="space-y-3" data-testid="ownership-history">
      {history.currentOwner && (
        <p className="text-sm">
          Current owner: <strong data-testid="current-owner">{history.currentOwner.name}</strong>
          {history.currentOwner.nic ? ` (${history.currentOwner.nic})` : ""} · {history.currentOwner.phone}
        </p>
      )}
      <ol className="space-y-2 text-sm">
        {history.originalBuyer && (
          <li className="rounded-lg border p-3">
            <Badge variant="secondary">Original buyer</Badge>{" "}
            <Person id={history.originalBuyer.id} name={history.originalBuyer.name} link={linkCustomers} />
            <span className="text-muted-foreground">
              {history.originalBuyer.nic ? ` · ${history.originalBuyer.nic}` : ""} · {history.originalBuyer.phone}
            </span>
          </li>
        )}
        {history.transfers.map((transfer) => (
          <li key={transfer.id} className="rounded-lg border p-3" data-testid="ownership-transfer">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <Badge variant="outline">{transfer.transferDate}</Badge>
              <span>
                <Person id={transfer.from.id} name={transfer.from.name} link={linkCustomers} />
                {" → "}
                <Person id={transfer.to.id} name={transfer.to.name} link={linkCustomers} />
              </span>
              <Link href={`/dashboard/bikes/transfers/${transfer.id}/slip`} className="ml-auto text-xs text-primary hover:underline">
                Slip {transfer.slipNumber}
              </Link>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              By {transfer.staffName}
              {transfer.transferFee > 0 ? ` · fee ${money(transfer.transferFee)}` : ""}
              {transfer.dmtOwnerUpdated ? " · registration moved to the new owner" : ""}
              {transfer.reason ? ` · ${transfer.reason}` : ""}
            </p>
          </li>
        ))}
      </ol>
      {history.transfers.length === 0 && <p className="text-xs text-muted-foreground">No ownership transfers yet.</p>}
    </div>
  )
}
