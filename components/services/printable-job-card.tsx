"use client"

import * as React from "react"
import Link from "next/link"
import { ArrowLeft, Download, Printer } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ServiceType } from "@prisma/client"
import { formatLKR } from "@/lib/currency"
import {
  downloadDocumentPdf,
  printDocumentA4,
} from "@/lib/download-document-pdf"
import { toast } from "sonner"

export interface ServiceJobCardData {
  id: string
  serviceDate: Date | string
  inDate?: Date | string | null
  outDate?: Date | string | null
  inMileage?: string | null
  nextServiceMileage?: string | null
  serviceType: ServiceType
  description?: string | null
  totalCost: number
  status?: string
  organization: {
    id: string
    businessName: string
    phone?: string | null
    logoUrl?: string | null
    domain?: string | null
    subdomain?: string | null
  }
  branch: {
    id: string
    name: string
    location?: string | null
    contactNumber?: string | null
  }
  customer: {
    id: string
    name: string
    phone: string
    nic?: string | null
    email?: string | null
    address?: string | null
  }
  vehicle: {
    id: string
    chassisNumber: string
    motorNumber?: string | null
    batterySerialNumber?: string | null
    warrantyPeriod?: string | null
    color?: string | null
    vehicleModel: {
      brand: string
      modelName: string
      batteryCapacity?: string | null
      range?: string | null
    }
  }
  serviceJob?: {
    partsCost: number
    totalCost: number
    parts: Array<{
      id: string
      quantity: number
      unitPrice: number
      totalPrice: number
      sparePart: {
        id: string
        name: string
        sku: string
      }
    }>
  } | null
}

interface PrintableJobCardProps {
  record: ServiceJobCardData
}

const colors = {
  ink: "#0f172a",
  muted: "#475569",
  subtle: "#64748b",
  border: "#dbe4e8",
  soft: "#f4f8f6",
  green: "#047857",
  greenDark: "#065f46",
  greenPale: "#eaf5ef",
  white: "#ffffff",
}

const sectionHeadingStyle: React.CSSProperties = {
  margin: "0 0 2mm",
  color: colors.greenDark,
  fontSize: "8pt",
  fontWeight: 800,
  letterSpacing: "0.09em",
  textTransform: "uppercase",
}

const detailPanelStyle: React.CSSProperties = {
  boxSizing: "border-box",
  width: "50%",
  minWidth: 0,
  padding: "3mm",
  border: `1px solid ${colors.border}`,
  borderRadius: "2mm",
  backgroundColor: colors.soft,
}

const detailRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  gap: "2mm",
  margin: "1.1mm 0 0",
  color: colors.muted,
  fontSize: "8pt",
  lineHeight: 1.3,
  overflowWrap: "anywhere",
}

function formatDocumentDate(value: Date | string | null | undefined) {
  if (!value) return "Not scheduled"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "Not scheduled"
  return date.toLocaleDateString("en-LK", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

function formatServiceType(type: ServiceType) {
  switch (type) {
    case ServiceType.Free:
      return "Free Periodic Service"
    case ServiceType.Warranty:
      return "Warranty Repair / Claim"
    case ServiceType.Paid:
      return "Paid Maintenance"
    default:
      return String(type)
  }
}

export function PrintableJobCard({ record }: PrintableJobCardProps) {
  const documentRef = React.useRef<HTMLDivElement>(null)
  const [isDownloading, setIsDownloading] = React.useState(false)

  const jobCardNumber = `JOB-${record.id.slice(0, 8).toUpperCase()}`
  const printDate = new Date().toLocaleString("en-LK", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
  const partsCost = record.serviceJob?.partsCost ?? 0
  const totalCost = record.serviceJob?.totalCost ?? record.totalCost
  const laborCost = Math.max(0, totalCost - partsCost)
  const status = (record.status || "COMPLETED").replaceAll("_", " ")
  const vehicleModel = `${record.vehicle.vehicleModel.brand} ${record.vehicle.vehicleModel.modelName}`

  const handlePrint = () => {
    if (documentRef.current) printDocumentA4(documentRef.current)
  }

  const handleDownloadPdf = async () => {
    if (!documentRef.current) {
      toast.error("Unable to find the job card to download.")
      return
    }

    setIsDownloading(true)
    try {
      await downloadDocumentPdf(documentRef.current, `job-card-${jobCardNumber}`)
    } catch (error) {
      console.error("Failed to download job card PDF.", error)
      toast.error("Failed to download the job card PDF. Please try again.")
    } finally {
      setIsDownloading(false)
    }
  }

  return (
    <main
      className="service-job-card-page"
      style={{
        minHeight: "100vh",
        padding: "16px",
        boxSizing: "border-box",
        backgroundColor: "#eef3f1",
        color: colors.ink,
        fontFamily: 'Arial, "Helvetica Neue", Helvetica, sans-serif',
      }}
    >
      <div className="print:hidden" style={{ maxWidth: "960px", margin: "0 auto 16px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "12px",
            padding: "12px 16px",
            border: `1px solid ${colors.border}`,
            borderRadius: "10px",
            backgroundColor: colors.white,
          }}
        >
          <Link href="/dashboard/services">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="size-4" />
              Back to Services
            </Button>
          </Link>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            <Button onClick={handlePrint} className="gap-2">
              <Printer className="size-4" />
              Print Job Card
            </Button>
            <Button
              onClick={handleDownloadPdf}
              disabled={isDownloading}
              variant="outline"
              className="gap-2"
            >
              <Download className="size-4" />
              {isDownloading ? "Preparing PDF..." : "Download PDF"}
            </Button>
          </div>
        </div>
      </div>

      <article
        ref={documentRef}
        className="service-job-card-sheet"
        data-pdf-document="job-card"
        aria-label={`Service job card ${jobCardNumber}`}
        style={{
          boxSizing: "border-box",
          width: "198mm",
          minHeight: "285mm",
          margin: "0 auto",
          padding: "8mm 9mm",
          display: "flex",
          flexDirection: "column",
          gap: "4mm",
          overflow: "visible",
          backgroundColor: colors.white,
          color: colors.ink,
          fontFamily: 'Arial, "Helvetica Neue", Helvetica, sans-serif',
          fontSize: "8pt",
          lineHeight: 1.3,
          boxShadow: "0 8px 26px rgba(15, 23, 42, 0.12)",
        }}
      >
        <header
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: "8mm",
            paddingBottom: "4mm",
            borderBottom: `2px solid ${colors.green}`,
          }}
        >
          <div style={{ display: "flex", alignItems: "flex-start", gap: "3mm", minWidth: 0 }}>
            <div
              aria-hidden="true"
              style={{
                width: "13mm",
                height: "13mm",
                flex: "0 0 13mm",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: "2mm",
                backgroundColor: colors.green,
                color: colors.white,
                fontSize: "15pt",
                fontWeight: 800,
              }}
            >
              {record.organization.businessName.trim().charAt(0).toUpperCase() || "E"}
            </div>
            <div style={{ minWidth: 0 }}>
              <p
                style={{
                  margin: "0 0 1mm",
                  color: colors.green,
                  fontSize: "7pt",
                  fontWeight: 800,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                }}
              >
                Authorized EV Workshop
              </p>
              <h1
                style={{
                  margin: 0,
                  color: colors.ink,
                  fontSize: "17pt",
                  fontWeight: 800,
                  lineHeight: 1.1,
                  overflowWrap: "anywhere",
                }}
              >
                {record.organization.businessName}
              </h1>
              <p style={{ margin: "1mm 0 0", color: colors.muted, fontSize: "8pt" }}>
                {record.branch.name}
                {record.branch.location ? ` · ${record.branch.location}` : ""}
              </p>
              {(record.organization.phone || record.branch.contactNumber || record.organization.domain) && (
                <p style={{ margin: "1mm 0 0", color: colors.subtle, fontSize: "7.5pt" }}>
                  {[record.organization.phone || record.branch.contactNumber, record.organization.domain]
                    .filter(Boolean)
                    .join("  ·  ")}
                </p>
              )}
            </div>
          </div>

          <div style={{ flex: "0 0 auto", textAlign: "right" }}>
            <p
              style={{
                display: "inline-block",
                margin: 0,
                padding: "1.5mm 2.5mm",
                borderRadius: "1mm",
                backgroundColor: colors.greenPale,
                color: colors.greenDark,
                fontSize: "7pt",
                fontWeight: 800,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
            >
              Service Job Card
            </p>
            <p
              style={{
                margin: "2mm 0 1mm",
                color: colors.ink,
                fontFamily: 'Consolas, "Courier New", monospace',
                fontSize: "13pt",
                fontWeight: 800,
              }}
            >
              {jobCardNumber}
            </p>
            <p style={{ margin: "0.7mm 0", color: colors.muted }}>
              <strong style={{ color: colors.ink }}>Date:</strong>{" "}
              {formatDocumentDate(record.serviceDate)}
            </p>
            <p style={{ margin: "0.7mm 0", color: colors.muted }}>
              <strong style={{ color: colors.ink }}>Status:</strong>{" "}
              <span style={{ color: colors.greenDark, fontWeight: 800 }}>{status}</span>
            </p>
            <p style={{ margin: "0.7mm 0", color: colors.muted }}>
              <strong style={{ color: colors.ink }}>Service:</strong>{" "}
              {formatServiceType(record.serviceType)}
            </p>
          </div>
        </header>

        <section aria-label="Customer and vehicle details">
          <div style={{ display: "flex", gap: "3mm" }}>
            <div style={detailPanelStyle}>
              <h2 style={sectionHeadingStyle}>Customer Details</h2>
              <p style={{ margin: 0, color: colors.ink, fontSize: "11pt", fontWeight: 800 }}>
                {record.customer.name}
              </p>
              <p style={detailRowStyle}>
                <strong style={{ color: colors.ink, flex: "0 0 18mm" }}>Phone</strong>
                <span>{record.customer.phone || "—"}</span>
              </p>
              <p style={detailRowStyle}>
                <strong style={{ color: colors.ink, flex: "0 0 18mm" }}>NIC</strong>
                <span>{record.customer.nic || "—"}</span>
              </p>
              <p style={detailRowStyle}>
                <strong style={{ color: colors.ink, flex: "0 0 18mm" }}>Address</strong>
                <span>{record.customer.address || "—"}</span>
              </p>
            </div>
            <div style={detailPanelStyle}>
              <h2 style={sectionHeadingStyle}>Vehicle Details</h2>
              <p style={{ margin: 0, color: colors.ink, fontSize: "11pt", fontWeight: 800 }}>
                {vehicleModel}
              </p>
              <p style={detailRowStyle}>
                <strong style={{ color: colors.ink, flex: "0 0 24mm" }}>Chassis / VIN</strong>
                <span style={{ overflowWrap: "anywhere" }}>{record.vehicle.chassisNumber}</span>
              </p>
              <p style={detailRowStyle}>
                <strong style={{ color: colors.ink, flex: "0 0 24mm" }}>Motor No.</strong>
                <span>{record.vehicle.motorNumber || "—"}</span>
              </p>
              <p style={detailRowStyle}>
                <strong style={{ color: colors.ink, flex: "0 0 24mm" }}>Battery S/N</strong>
                <span>{record.vehicle.batterySerialNumber || "—"}</span>
              </p>
              <p style={detailRowStyle}>
                <strong style={{ color: colors.ink, flex: "0 0 24mm" }}>Color / Warranty</strong>
                <span>
                  {[record.vehicle.color, record.vehicle.warrantyPeriod || "Not specified"]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              </p>
            </div>
          </div>
        </section>

        <section aria-label="Work and inspection summary">
          <h2 style={sectionHeadingStyle}>Work Carried Out & Inspection Summary</h2>
          <div
            style={{
              minHeight: "16mm",
              padding: "3mm",
              border: `1px solid ${colors.border}`,
              borderRadius: "2mm",
              color: colors.ink,
              whiteSpace: "pre-wrap",
              overflowWrap: "anywhere",
              lineHeight: 1.4,
            }}
          >
            {record.description?.trim() || "No work description recorded."}
          </div>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "2mm 4mm",
              marginTop: "2.5mm",
              color: colors.muted,
              fontSize: "7.5pt",
            }}
          >
            {[
              "Battery health / connections",
              "Motor & drivetrain",
              "Brakes & road test",
              "Lights, controls & safety",
            ].map((item) => (
              <span key={item} style={{ display: "inline-flex", alignItems: "center", gap: "1.5mm" }}>
                <span
                  aria-hidden="true"
                  style={{
                    boxSizing: "border-box",
                    width: "3mm",
                    height: "3mm",
                    border: `1px solid ${colors.subtle}`,
                    borderRadius: "0.5mm",
                  }}
                />
                {item}
              </span>
            ))}
          </div>
        </section>

        <section aria-label="Spare parts used">
          <h2 style={sectionHeadingStyle}>Spare Parts Used</h2>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              tableLayout: "fixed",
              color: colors.ink,
              fontSize: "7.5pt",
            }}
          >
            <thead>
              <tr style={{ backgroundColor: colors.greenPale, color: colors.greenDark }}>
                <th style={{ width: "33%", padding: "2mm", textAlign: "left", borderBottom: `1px solid ${colors.border}` }}>Part Name</th>
                <th style={{ width: "20%", padding: "2mm", textAlign: "left", borderBottom: `1px solid ${colors.border}` }}>SKU</th>
                <th style={{ width: "9%", padding: "2mm", textAlign: "right", borderBottom: `1px solid ${colors.border}` }}>Qty</th>
                <th style={{ width: "19%", padding: "2mm", textAlign: "right", borderBottom: `1px solid ${colors.border}` }}>Unit Price</th>
                <th style={{ width: "19%", padding: "2mm", textAlign: "right", borderBottom: `1px solid ${colors.border}` }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {record.serviceJob?.parts.length ? (
                record.serviceJob.parts.map((part) => (
                  <tr key={part.id}>
                    <td style={{ padding: "1.7mm 2mm", borderBottom: `1px solid ${colors.border}`, overflowWrap: "anywhere" }}>{part.sparePart.name}</td>
                    <td style={{ padding: "1.7mm 2mm", borderBottom: `1px solid ${colors.border}`, fontFamily: 'Consolas, "Courier New", monospace', overflowWrap: "anywhere" }}>{part.sparePart.sku}</td>
                    <td style={{ padding: "1.7mm 2mm", borderBottom: `1px solid ${colors.border}`, textAlign: "right" }}>{part.quantity}</td>
                    <td style={{ padding: "1.7mm 2mm", borderBottom: `1px solid ${colors.border}`, textAlign: "right", whiteSpace: "nowrap" }}>{formatLKR(part.unitPrice)}</td>
                    <td style={{ padding: "1.7mm 2mm", borderBottom: `1px solid ${colors.border}`, textAlign: "right", whiteSpace: "nowrap", fontWeight: 700 }}>{formatLKR(part.totalPrice)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} style={{ padding: "2mm", borderBottom: `1px solid ${colors.border}`, color: colors.subtle, textAlign: "center" }}>
                    No spare parts recorded for this service.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>

        <section aria-label="Service charges and next service date">
          <div style={{ display: "flex", alignItems: "stretch", gap: "4mm" }}>
            <div
              style={{
                boxSizing: "border-box",
                width: "50%",
                padding: "3mm",
                border: `1px solid ${colors.border}`,
                borderRadius: "2mm",
                backgroundColor: colors.soft,
              }}
            >
              <h2 style={sectionHeadingStyle}>Next Recommended Service</h2>
              <p style={{ margin: 0, color: colors.ink, fontSize: "11pt", fontWeight: 800 }}>
                {record.nextServiceMileage ? `${record.nextServiceMileage} km` : "As per schedule"}
              </p>
              <p style={{ margin: "1.5mm 0 0", color: colors.subtle, fontSize: "7pt" }}>
                Please follow the vehicle manufacturer’s maintenance schedule.
              </p>
            </div>
            <div
              style={{
                boxSizing: "border-box",
                width: "50%",
                padding: "3mm",
                border: `1px solid ${colors.border}`,
                borderRadius: "2mm",
              }}
            >
              <h2 style={sectionHeadingStyle}>Financial Summary</h2>
              <div style={{ display: "flex", justifyContent: "space-between", gap: "3mm", margin: "1mm 0", color: colors.muted }}>
                <span>Labor & diagnostics</span>
                <strong style={{ color: colors.ink }}>{laborCost === 0 ? "Complimentary" : formatLKR(laborCost)}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", gap: "3mm", margin: "1mm 0", color: colors.muted }}>
                <span>Spare parts</span>
                <strong style={{ color: colors.ink }}>{formatLKR(partsCost)}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", gap: "3mm", margin: "1mm 0", color: colors.muted }}>
                <span>Total Paid Amount</span>
                <strong style={{ color: colors.ink }}>Not recorded</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "3mm", marginTop: "2mm", paddingTop: "2mm", borderTop: `1px solid ${colors.border}` }}>
                <strong style={{ color: colors.greenDark, fontSize: "9pt" }}>Total Service Amount</strong>
                <strong style={{ color: colors.greenDark, fontSize: "13pt" }}>{formatLKR(totalCost)}</strong>
              </div>
              <p style={{ margin: "1mm 0 0", color: colors.subtle, fontSize: "6.5pt", textAlign: "right" }}>
                Payment received is not recorded on this service record.
              </p>
            </div>
          </div>
        </section>

        <footer style={{ marginTop: "auto" }}>
          <div style={{ display: "flex", gap: "12mm", paddingTop: "5mm" }}>
            <div style={{ flex: 1, textAlign: "center" }}>
              <div style={{ height: "11mm", borderBottom: `1px solid ${colors.subtle}` }} />
              <p style={{ margin: "1.5mm 0 0", color: colors.ink, fontSize: "7.5pt", fontWeight: 700 }}>
                Customer Acknowledgement
              </p>
              <p style={{ margin: "1mm 0 0", color: colors.subtle, fontSize: "6.5pt" }}>
                I acknowledge receipt of the vehicle and the work described above.
              </p>
            </div>
            <div style={{ flex: 1, textAlign: "center" }}>
              <div style={{ height: "11mm", borderBottom: `1px solid ${colors.subtle}` }} />
              <p style={{ margin: "1.5mm 0 0", color: colors.ink, fontSize: "7.5pt", fontWeight: 700 }}>
                Technician / Authorized Signature
              </p>
              <p style={{ margin: "1mm 0 0", color: colors.subtle, fontSize: "6.5pt" }}>
                {record.branch.name}
              </p>
            </div>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: "4mm",
              marginTop: "4mm",
              paddingTop: "2mm",
              borderTop: `1px solid ${colors.border}`,
              color: colors.subtle,
              fontSize: "6.5pt",
            }}
          >
            <span>
              Retain this document for your vehicle’s service and warranty records.
            </span>
            <span style={{ textAlign: "right", whiteSpace: "nowrap" }}>
              Generated {printDate} · {record.id}
            </span>
          </div>
        </footer>
      </article>
    </main>
  )
}
