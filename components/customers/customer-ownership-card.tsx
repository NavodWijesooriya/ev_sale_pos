import Link from "next/link"
import type { getCustomerOwnership } from "@/app/actions/ownership-transfer"
import { TransferOwnershipDialog } from "@/components/bikes/transfer-ownership-dialog"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

type Ownership = Awaited<ReturnType<typeof getCustomerOwnership>>

/** Bike ownership transfers this customer is part of, and the Transfer ownership action for the bikes they own. */
export function CustomerOwnershipCard({ ownership }: { ownership: Ownership }) {
  if (ownership.transfers.length === 0 && !(ownership.canTransfer && ownership.owned.length > 0)) return null
  return (
    <Card data-testid="customer-ownership-card">
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
        <div>
          <CardTitle>Bike ownership transfers</CardTitle>
          <CardDescription>Bikes this customer handed over or received. The original sales are not changed.</CardDescription>
        </div>
        {ownership.canTransfer && ownership.owned.length > 0 && <TransferOwnershipDialog vehicles={ownership.owned} />}
      </CardHeader>
      <CardContent>
        {ownership.transfers.length === 0 ? (
          <p className="text-sm text-muted-foreground">No ownership transfers yet.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {ownership.transfers.map((transfer) => (
              <li key={transfer.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border p-3" data-testid="customer-transfer">
                <Badge variant="outline">{transfer.transferDate}</Badge>
                <Badge variant={transfer.direction === "out" ? "secondary" : "default"}>
                  {transfer.direction === "out" ? "Handed over" : "Received"}
                </Badge>
                <Link href={`/dashboard/bikes/${transfer.vehicleId}`} className="font-medium text-primary hover:underline">
                  {transfer.vehicleLabel}
                </Link>
                <span className="text-muted-foreground">
                  {transfer.direction === "out" ? "to " : "from "}
                  <Link href={`/dashboard/customers/${transfer.otherPartyId}`} className="text-primary hover:underline">
                    {transfer.otherPartyName}
                  </Link>{" "}
                  · by {transfer.staffName}
                </span>
                <Link href={`/dashboard/bikes/transfers/${transfer.id}/slip`} className="ml-auto text-xs text-primary hover:underline">
                  Slip {transfer.slipNumber}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
