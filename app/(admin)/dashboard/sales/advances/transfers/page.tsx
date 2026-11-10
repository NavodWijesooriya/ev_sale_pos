import { connection } from "next/server"
import { redirect } from "next/navigation"
import { ArrowRightLeft } from "lucide-react"
import {
  getAdvancePayments,
  getAdvanceTransferOptions,
  type PendingAdvanceTransferRecord,
} from "@/app/actions/advances"
import { AdvanceTransferTable } from "@/components/sales/advances/advance-transfer-table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getAuthSession } from "@/lib/auth"

export const instant = false

export const metadata = {
  title: "Advance Transfers | Ev Sale Pos",
  description: "Transfer pending advances to a different customer or available vehicle",
}

export default async function AdvanceTransfersPage() {
  await connection()
  const session = await getAuthSession()
  if (!session?.user?.organizationId) {
    redirect("/login?callbackUrl=/dashboard/sales/advances/transfers")
  }

  const [{ customers, vehicles }, allAdvances] = await Promise.all([
    getAdvanceTransferOptions(),
    getAdvancePayments(),
  ])
  const advances: PendingAdvanceTransferRecord[] = allAdvances
    .filter((advance) => advance.status === "PENDING")
    .map(({ id, customerId, customerName, nicNumber, bikeModel, amount, advanceDate }) => ({
      id,
      customerId,
      customerName,
      nicNumber,
      bikeModel,
      amount,
      advanceDate,
    }))

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Advance Transfers</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Reallocate an unconsumed customer advance to another customer or available vehicle.
        </p>
      </header>

      <Card className="rounded-2xl border-border/70 shadow-sm">
        <CardHeader className="flex flex-row items-center gap-3 space-y-0">
          <span className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <ArrowRightLeft className="size-4" />
          </span>
          <CardTitle className="text-sm font-medium">
            {advances.length} pending {advances.length === 1 ? "advance" : "advances"} available to transfer
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Transfers retain the original record for audit and create a new pending advance for the selected destination.
        </CardContent>
      </Card>

      <AdvanceTransferTable
        advances={advances}
        customers={customers}
        vehicles={vehicles}
      />
    </div>
  )
}
