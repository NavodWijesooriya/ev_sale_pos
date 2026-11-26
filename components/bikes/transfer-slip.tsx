"use client"

import * as React from "react"
import Link from "next/link"
import { ArrowLeft, Printer } from "lucide-react"
import { Button } from "@/components/ui/button"
import { printDocumentA4 } from "@/lib/download-document-pdf"

export interface TransferSlipData {
  slipNumber: string
  transferDate: string
  reason: string | null
  transferFee: number
  staffName: string
  docTransferForm: boolean
  docNicCopies: boolean
  docRegistrationBook: boolean
  dmtOwnerUpdated: boolean
  financeWarningConfirmed: boolean
  organization: { businessName: string; phone: string | null }
  vehicle: {
    id: string
    model: string
    chassisNumber: string
    motorNumber: string | null
    batterySerialNumber: string | null
    registrationNumber: string | null
  }
  from: { name: string; nic: string | null; phone: string; address: string | null }
  to: { name: string; nic: string | null; phone: string; address: string | null }
}

const money = (n: number) => `Rs. ${new Intl.NumberFormat("en-LK", { minimumFractionDigits: 2 }).format(n)}`
const mark = (value: boolean) => (value ? "☑" : "☐")

function Party({ title, party }: { title: string; party: TransferSlipData["from"] }) {
  return (
    <div style={{ flex: 1, border: "1px solid #cbd5e1", borderRadius: 6, padding: 10, fontSize: 12 }}>
      <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "#64748b", marginBottom: 4 }}>{title}</div>
      <div style={{ fontWeight: 700, fontSize: 14 }}>{party.name}</div>
      <div>NIC / Passport: {party.nic || "-"}</div>
      <div>Phone: {party.phone}</div>
      <div>Address: {party.address || "-"}</div>
    </div>
  )
}

/** Printable acknowledgement slip for one ownership transfer. */
export function TransferSlip({ data }: { data: TransferSlipData }) {
  const ref = React.useRef<HTMLDivElement>(null)
  return (
    <div className="mx-auto w-full max-w-3xl space-y-4">
      <div className="flex items-center justify-between print:hidden">
        <Link href={`/dashboard/bikes/${data.vehicle.id}`} className="flex items-center gap-1 text-sm text-muted-foreground hover:underline">
          <ArrowLeft className="size-4" />
          Back to the bike
        </Link>
        <Button type="button" className="gap-2" onClick={() => ref.current && printDocumentA4(ref.current)}>
          <Printer className="size-4" />
          Print slip
        </Button>
      </div>

      <div ref={ref} data-testid="transfer-slip" style={{ background: "#fff", color: "#0f172a", padding: 28, border: "1px solid #e2e8f0", fontFamily: "system-ui, sans-serif" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "2px solid #0f172a", paddingBottom: 10 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800 }}>{data.organization.businessName}</div>
            {data.organization.phone && <div style={{ fontSize: 12, color: "#475569" }}>Tel: {data.organization.phone}</div>}
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: "0.04em" }}>VEHICLE OWNERSHIP TRANSFER</div>
            <div style={{ fontSize: 12 }}>Slip No: <strong data-testid="slip-number">{data.slipNumber}</strong></div>
            <div style={{ fontSize: 12 }}>Date: {data.transferDate}</div>
          </div>
        </div>

        <div style={{ marginTop: 14, border: "1px solid #cbd5e1", borderRadius: 6, padding: 10, fontSize: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "#64748b", marginBottom: 4 }}>Vehicle</div>
          <div style={{ fontWeight: 700, fontSize: 14 }}>{data.vehicle.model}</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2px 16px", marginTop: 4 }}>
            <div>Chassis No: <strong>{data.vehicle.chassisNumber}</strong></div>
            <div>Motor No: <strong>{data.vehicle.motorNumber || "-"}</strong></div>
            <div>Battery Serial: <strong>{data.vehicle.batterySerialNumber || "-"}</strong></div>
            <div>Registration No: <strong>{data.vehicle.registrationNumber || "-"}</strong></div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
          <Party title="Previous owner (transferor)" party={data.from} />
          <Party title="New owner (transferee)" party={data.to} />
        </div>

        <div style={{ marginTop: 12, fontSize: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 16px" }}>
          <div>Transfer fee: <strong>{data.transferFee > 0 ? money(data.transferFee) : "None"}</strong></div>
          <div>Recorded by: <strong>{data.staffName}</strong></div>
          <div style={{ gridColumn: "1 / -1" }}>Reason / notes: {data.reason || "-"}</div>
          {data.dmtOwnerUpdated && <div style={{ gridColumn: "1 / -1" }}>DMT / RMV registration is to be done in the new owner&apos;s name.</div>}
        </div>

        <div style={{ marginTop: 12, fontSize: 12 }}>
          <div style={{ fontWeight: 700, marginBottom: 2 }}>Documents received</div>
          <div>{mark(data.docTransferForm)} Transfer form signed</div>
          <div>{mark(data.docNicCopies)} NIC copies of both parties</div>
          <div>{mark(data.docRegistrationBook)} Original registration document (if registered)</div>
        </div>

        {data.financeWarningConfirmed && (
          <p style={{ marginTop: 12, fontSize: 11, border: "1px solid #f59e0b", background: "#fffbeb", padding: 8, borderRadius: 6 }}>
            Note: the bike was sold on finance. The leasing company may still hold ownership until the lease is settled.
          </p>
        )}

        <p style={{ marginTop: 14, fontSize: 11, color: "#475569" }}>
          We acknowledge that ownership of the vehicle described above passes from the previous owner to the new owner on the date shown.
          The original sale invoice is not changed by this transfer.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 24, marginTop: 44, fontSize: 11, textAlign: "center" }}>
          {["Previous owner", "New owner", "Authorised signature (dealership)"].map((label) => (
            <div key={label}>
              <div style={{ borderTop: "1px solid #0f172a", paddingTop: 4 }}>{label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
