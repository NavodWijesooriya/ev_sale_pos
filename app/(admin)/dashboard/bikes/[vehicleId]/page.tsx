import Link from "next/link"
import { notFound } from "next/navigation"
import { getBikeDetails } from "@/app/actions/bike-details"
import { BikeDmtWorkflow } from "@/components/bikes/bike-dmt-workflow"
import { OwnershipHistoryList } from "@/components/bikes/ownership-history"
import { TransferOwnershipDialog } from "@/components/bikes/transfer-ownership-dialog"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { colomboDateKey } from "@/lib/dates"

export const instant = false

export const metadata = {
  title: "Bike Details | Ev Sale Pos",
  description: "One bike: batch, sale and DMT / RMV registration progress",
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium">{value ?? "-"}</dd>
    </div>
  )
}

export default async function BikeDetailsPage({ params }: { params: Promise<{ vehicleId: string }> }) {
  const { vehicleId } = await params
  const bike = await getBikeDetails(vehicleId)
  if (!bike) notFound()

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <div>
        <Link href="/dashboard/grn/stock" className="text-sm text-muted-foreground hover:underline">
          ← Current bike stock
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">{bike.model}</h1>
          {bike.unitGrnNumber && (
            <Badge variant="secondary" className="font-mono">
              {bike.unitGrnNumber}
            </Badge>
          )}
          <Badge variant="outline">{bike.status}</Badge>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Bike details</CardTitle>
          <CardDescription>Round / batch {bike.batch ?? "-"}</CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 sm:grid-cols-3">
            <Field label="Chassis number" value={<span className="font-mono">{bike.chassisNumber}</span>} />
            <Field label="Motor number" value={bike.motorNumber} />
            <Field label="Charging serial" value={bike.chargingSerialNumber} />
            <Field label="Battery serial" value={bike.batterySerialNumber} />
            <Field label="Colour" value={bike.color} />
            <Field label="Year" value={bike.year} />
            <Field label="Showroom" value={bike.branchName} />
            <Field label="Round / batch" value={bike.batch} />
            {bike.purchasePrice !== null && (
              <Field
                label="Purchase cost"
                value={`Rs. ${new Intl.NumberFormat("en-LK", { minimumFractionDigits: 2 }).format(bike.purchasePrice)}`}
              />
            )}
          </dl>
        </CardContent>
      </Card>

      {bike.sale ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Sale</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-4 sm:grid-cols-3">
                <Field
                  label="Invoice"
                  value={
                    <Link href={`/dashboard/sales/${bike.sale.id}`} className="text-primary hover:underline">
                      {bike.sale.invoiceNumber}
                    </Link>
                  }
                />
                <Field label="Sold on" value={colomboDateKey(new Date(bike.sale.saleDate))} />
                <Field label="Original buyer" value={bike.sale.customerName} />
                <Field label="Phone" value={bike.sale.customerPhone} />
                <Field label="NIC" value={bike.sale.customerNic} />
              </dl>
            </CardContent>
          </Card>
          {bike.ownership && (
            <Card>
              <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
                <div>
                  <CardTitle>Ownership history</CardTitle>
                  <CardDescription>The original sale stays as it was; transfers only change who owns the bike.</CardDescription>
                </div>
                {bike.canTransfer && (
                  <TransferOwnershipDialog vehicles={[{ id: bike.id, label: bike.model }]} />
                )}
              </CardHeader>
              <CardContent>
                <OwnershipHistoryList history={bike.ownership} />
                {bike.dmtOwnerName && (
                  <p className="mt-3 text-xs text-muted-foreground">
                    DMT / RMV registration is in the name of <strong className="text-foreground">{bike.dmtOwnerName}</strong>.
                  </p>
                )}
              </CardContent>
            </Card>
          )}
          {bike.dmt && <BikeDmtWorkflow saleId={bike.sale.id} initial={bike.dmt} canEdit={bike.canEditDmt} />}
        </>
      ) : (
        <Card>
          <CardContent className="py-6 text-sm text-muted-foreground">
            This bike has not been sold yet, so there is no DMT / RMV registration to track.
          </CardContent>
        </Card>
      )}
    </div>
  )
}
