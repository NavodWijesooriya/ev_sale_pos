"use client"

import * as React from "react"
import Link from "next/link"
import { ArrowLeft, Printer } from "lucide-react"
import type { HandoverSlipData } from "@/app/actions/documents"
import { Button } from "@/components/ui/button"
import { printDocumentA4 } from "@/lib/download-document-pdf"

const mark = (value: boolean) => (value ? "☑" : "☐")

/** Printable acknowledgement that the registration certificate and/or number plate were handed over. */
export function HandoverSlip({ data }: { data: HandoverSlipData }) {
  const ref = React.useRef<HTMLDivElement>(null)
  const recipient = data.cr?.toName ?? data.plate?.toName ?? data.owner.name
  const recipientNic = data.cr?.toNic ?? (data.cr ? null : data.owner.nic)
  return (
    <div className="mx-auto w-full max-w-3xl space-y-4">
      <div className="flex items-center justify-between print:hidden">
        <Link href="/dashboard/documents/rmv" className="flex items-center gap-1 text-sm text-muted-foreground hover:underline">
          <ArrowLeft className="size-4" />
          Back to RMV Documents
        </Link>
        <Button type="button" className="gap-2" onClick={() => ref.current && printDocumentA4(ref.current)}>
          <Printer className="size-4" />
          Print slip
        </Button>
      </div>

      <div ref={ref} data-testid="handover-slip" style={{ background: "#fff", color: "#0f172a", padding: 28, border: "1px solid #e2e8f0", fontFamily: "system-ui, sans-serif" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "2px solid #0f172a", paddingBottom: 10 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800 }}>{data.organization.businessName}</div>
            {data.organization.phone && <div style={{ fontSize: 12, color: "#475569" }}>Tel: {data.organization.phone}</div>}
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: "0.04em" }}>DOCUMENT HAND-OVER</div>
            <div style={{ fontSize: 12 }}>Invoice: <strong>{data.invoiceNumber}</strong></div>
            <div style={{ fontSize: 12 }}>Date: {data.slipDate}</div>
          </div>
        </div>

        <div style={{ marginTop: 14, border: "1px solid #cbd5e1", borderRadius: 6, padding: 10, fontSize: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "#64748b", marginBottom: 4 }}>Vehicle</div>
          <div style={{ fontWeight: 700, fontSize: 14 }}>{data.vehicle.model}</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2px 16px", marginTop: 4 }}>
            <div>Chassis No: <strong>{data.vehicle.chassisNumber}</strong></div>
            <div>Motor No: <strong>{data.vehicle.motorNumber || "-"}</strong></div>
            <div>Registration No: <strong>{data.vehicle.registrationNumber || "-"}</strong></div>
            <div>Registered owner: <strong>{data.owner.name}</strong></div>
          </div>
        </div>

        <div style={{ marginTop: 12, fontSize: 12 }}>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>Documents handed over</div>
          <div style={{ marginBottom: 6 }}>
            {mark(Boolean(data.cr))} Registration certificate (CR / book)
            {data.cr && (
              <span style={{ color: "#475569" }}>
                {" "}
                · {data.cr.handedOverAt}
                {data.cr.target === "FINANCE_COMPANY" ? ` · to the finance company${data.financeCompany ? ` (${data.financeCompany})` : ""}` : ""}
                {data.cr.reference ? ` · ref ${data.cr.reference}` : ""}
              </span>
            )}
          </div>
          <div>
            {mark(Boolean(data.plate))} Number plate
            {data.plate && <span style={{ color: "#475569" }}> · {data.plate.handedOverAt}</span>}
          </div>
          {(data.cr?.notes || data.plate?.notes) && <div style={{ marginTop: 6, color: "#475569" }}>Notes: {[data.cr?.notes, data.plate?.notes].filter(Boolean).join(" / ")}</div>}
        </div>

        <div style={{ marginTop: 12, border: "1px solid #cbd5e1", borderRadius: 6, padding: 10, fontSize: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "#64748b", marginBottom: 4 }}>Received by</div>
          <div style={{ fontWeight: 700, fontSize: 14 }}>{recipient}</div>
          <div>NIC: {recipientNic || "-"}</div>
        </div>

        <p style={{ marginTop: 14, fontSize: 11, color: "#475569" }}>
          I acknowledge that I have received the documents listed above for the vehicle described, on the date shown.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 40, marginTop: 48, fontSize: 11, textAlign: "center" }}>
          {["Received by (signature, name, NIC)", `Handed over by (${data.staffName})`].map((label) => (
            <div key={label}>
              <div style={{ borderTop: "1px solid #0f172a", paddingTop: 4 }}>{label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
