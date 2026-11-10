"use client"

import * as React from "react"
import Link from "next/link"
import {
  ArrowLeft,
  Download,
  Printer,
  Zap,
} from "lucide-react"
import { PaymentMethod, FinanceStatus } from "@prisma/client"
import { Button } from "@/components/ui/button"
import { formatLKR } from "@/lib/currency"
import {
  extendedWarrantyPrice,
  saleWarrantyOptions,
} from "@/lib/validations/new-sale"
import {
  downloadDocumentPdf,
  printDocumentA4,
} from "@/lib/download-document-pdf"
import { toast } from "sonner"

export interface InvoiceSaleData {
  id: string
  saleDate: Date | string
  totalAmount: number
  discount?: number
  additionalCharges?: number
  warrantyOption?: string | null
  advancePayment?: {
    amount: number
  } | null
  paymentMethod: PaymentMethod | string | null
  status: string
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
  soldBy: {
    id: string
    name?: string | null
    email: string
    role: string
  }
  items: Array<{
    id: string
    price: number
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
  }>
  financeDetail?: {
    id: string
    financeCompany: string
    totalFinanceAmount: number
    downPaymentPaid: number
    dealerCommission?: number | null
    status: FinanceStatus
  } | null
}

interface PrintableInvoiceProps {
  sale: InvoiceSaleData
}

export function PrintableInvoice({ sale }: PrintableInvoiceProps) {
  const documentRef = React.useRef<HTMLDivElement>(null)
  const [isDownloading, setIsDownloading] = React.useState(false)

  const invoiceNumber = `INV-${sale.id.slice(0, 8).toUpperCase()}`
  const formattedSaleDate = new Date(sale.saleDate).toLocaleDateString("en-LK", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
  const itemSubtotal = sale.items.reduce((sum, item) => sum + item.price, 0)
  const discount = sale.discount ?? 0
  const additionalCharges = sale.additionalCharges ?? 0
  const warrantyCharge =
    sale.warrantyOption === saleWarrantyOptions[1] ? extendedWarrantyPrice : 0
  const advanceDeduction =
    sale.advancePayment && sale.advancePayment.amount > 0
      ? sale.advancePayment.amount
      : 0
  const isFinance =
    sale.paymentMethod === PaymentMethod.Finance ||
    sale.paymentMethod === PaymentMethod.SplitPayment
  const financeReceived =
    isFinance && sale.financeDetail?.status === FinanceStatus.Received
      ? sale.financeDetail.totalFinanceAmount
      : 0
  const recordedPaidAmount = isFinance
    ? (sale.financeDetail?.downPaymentPaid ?? 0) + financeReceived
    : ["paid", "completed"].includes(sale.status.toLowerCase())
      ? sale.totalAmount
      : 0
  const paidAmount = Math.min(sale.totalAmount, recordedPaidAmount)
  const balanceDue = Math.max(0, sale.totalAmount - paidAmount)

  const handlePrint = () => {
    if (documentRef.current) {
      printDocumentA4(documentRef.current)
    }
  }

  const handleDownloadPdf = async () => {
    if (!documentRef.current) {
      toast.error("Unable to find the invoice to download.")
      return
    }

    setIsDownloading(true)
    try {
      await downloadDocumentPdf(documentRef.current, `invoice-${invoiceNumber}`)
    } catch (error) {
      console.error("Failed to download invoice PDF.", error)
      toast.error("Failed to download the invoice PDF. Please try again.")
    } finally {
      setIsDownloading(false)
    }
  }

  return (
    <main
      className="invoice-page"
      style={{
        boxSizing: "border-box",
        minHeight: "100vh",
        padding: "24px 16px",
        backgroundColor: "#f1f5f9",
        color: "#0f172a",
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      }}
    >
      {/* Action Toolbar */}
      <nav
        className="invoice-toolbar"
        aria-label="Invoice actions"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "16px",
          width: "100%",
          maxWidth: "210mm",
          margin: "0 auto 20px",
        }}
      >
        <Link href="/dashboard/sales">
          <Button
            variant="ghost"
            size="sm"
            className="gap-2"
            style={{
              backgroundColor: "transparent",
              color: "#334155",
            }}
          >
            <ArrowLeft className="size-4" />
            Back to Sales
          </Button>
        </Link>
        <div
          className="invoice-toolbar-actions"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            flexWrap: "wrap",
            gap: "12px",
          }}
        >
          <span
            style={{
              color: "#047857",
              fontSize: "13px",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            Status: {sale.status}
          </span>
          <Button
            onClick={handlePrint}
            className="gap-2"
            style={{
              backgroundColor: "#000000",
              color: "#ffffff",
            }}
          >
            <Printer className="size-4" />
            Print Invoice
          </Button>
          <Button
            onClick={handleDownloadPdf}
            disabled={isDownloading}
            variant="outline"
            className="gap-2"
            style={{
              backgroundColor: "#ffffff",
              color: "#000000",
              borderColor: "#cbd5e1",
            }}
          >
            <Download className="size-4" />
            {isDownloading ? "Preparing PDF..." : "Download PDF"}
          </Button>
        </div>
      </nav>

      {/* A4 Printable Invoice Sheet */}
      <article
        ref={documentRef}
        data-pdf-document="invoice-modern"
        className="print-document invoice-sheet"
        aria-label={`Invoice ${invoiceNumber}`}
        style={{
          boxSizing: "border-box",
          width: "210mm",
          height: "297mm",
          maxHeight: "297mm",
          margin: "0 auto",
          padding: "12mm 14mm",
          backgroundColor: "#ffffff",
          color: "#0f172a",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
          borderRadius: "3px",
          overflow: "hidden",
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
          lineHeight: 1.35,
          position: "relative",
        }}
      >
        {/* TOP SECTION: Header & Meta */}
        <div>
          <header
            style={{
              display: "grid",
              gridTemplateColumns: "1fr auto",
              gap: "24px",
              paddingBottom: "14px",
              borderBottom: "2px solid #0f172a",
              alignItems: "flex-start",
            }}
          >
            {/* Organization / Dealership Info */}
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "14px",
              }}
            >
              {sale.organization.logoUrl ? (
                <img
                  src={sale.organization.logoUrl}
                  alt={`${sale.organization.businessName} logo`}
                  style={{
                    width: "56px",
                    height: "56px",
                    objectFit: "contain",
                    borderRadius: "6px",
                    border: "1px solid #e2e8f0",
                    padding: "3px",
                    backgroundColor: "#ffffff",
                    flexShrink: 0,
                  }}
                />
              ) : (
                <div
                  style={{
                    width: "52px",
                    height: "52px",
                    backgroundColor: "#0f172a",
                    color: "#ffffff",
                    borderRadius: "6px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                  aria-hidden="true"
                >
                  <Zap size={26} color="#ffffff" />
                </div>
              )}
              <div>
                <p
                  style={{
                    margin: 0,
                    fontSize: "10px",
                    fontWeight: 700,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    color: "#047857",
                  }}
                >
                  Authorized EV Dealership
                </p>
                <h1
                  style={{
                    margin: "2px 0 3px",
                    fontSize: "22px",
                    fontWeight: 800,
                    color: "#0f172a",
                    letterSpacing: "-0.02em",
                    lineHeight: 1.15,
                  }}
                >
                  {sale.organization.businessName}
                </h1>
                <p
                  style={{
                    margin: 0,
                    fontSize: "12px",
                    color: "#475569",
                    fontWeight: 500,
                  }}
                >
                  {sale.branch.name}
                  {sale.branch.location ? ` • ${sale.branch.location}` : ""}
                </p>
                {(sale.organization.phone || sale.branch.contactNumber) && (
                  <p
                    style={{
                      margin: "2px 0 0",
                      fontSize: "11px",
                      color: "#64748b",
                    }}
                  >
                    Tel: {sale.organization.phone || sale.branch.contactNumber}
                  </p>
                )}
                {sale.organization.domain && (
                  <p
                    style={{
                      margin: "1px 0 0",
                      fontSize: "11px",
                      color: "#64748b",
                    }}
                  >
                    Web: {sale.organization.domain}
                  </p>
                )}
              </div>
            </div>

            {/* Document Title & Invoice Meta */}
            <div
              style={{
                textAlign: "right",
                paddingLeft: "20px",
                borderLeft: "2px solid #e2e8f0",
              }}
            >
              <h2
                style={{
                  margin: 0,
                  fontSize: "26px",
                  fontWeight: 900,
                  letterSpacing: "0.08em",
                  color: "#0f172a",
                  lineHeight: 1,
                }}
              >
                TAX INVOICE
              </h2>
              <p
                style={{
                  margin: "6px 0 0",
                  fontFamily: 'Consolas, "Courier New", monospace',
                  fontSize: "14px",
                  fontWeight: 700,
                  color: "#047857",
                }}
              >
                {invoiceNumber}
              </p>
              <div
                style={{
                  marginTop: "8px",
                  display: "grid",
                  gridTemplateColumns: "auto auto",
                  gap: "3px 12px",
                  fontSize: "11px",
                  textAlign: "right",
                  color: "#475569",
                }}
              >
                <span>Date:</span>
                <strong style={{ color: "#0f172a" }}>{formattedSaleDate}</strong>
                <span>Payment:</span>
                <strong style={{ color: "#0f172a" }}>{sale.paymentMethod}</strong>
                <span>Status:</span>
                <strong style={{ color: "#047857", textTransform: "uppercase" }}>
                  {sale.status}
                </strong>
              </div>
            </div>
          </header>

          {/* PARTIES: Bill To & Sale Details */}
          <section
            aria-label="Invoice parties"
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "16px",
              marginTop: "14px",
            }}
          >
            {/* Buyer Info Card */}
            <div
              style={{
                backgroundColor: "#f8fafc",
                border: "1px solid #e2e8f0",
                borderRadius: "6px",
                padding: "10px 14px",
              }}
            >
              <p
                style={{
                  margin: 0,
                  fontSize: "9px",
                  fontWeight: 700,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: "#047857",
                }}
              >
                Buyer Information (Bill To)
              </p>
              <h3
                style={{
                  margin: "3px 0 6px",
                  fontSize: "14px",
                  fontWeight: 700,
                  color: "#0f172a",
                }}
              >
                {sale.customer.name}
              </h3>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "75px 1fr",
                  gap: "3px 8px",
                  fontSize: "11px",
                  color: "#334155",
                }}
              >
                <span style={{ color: "#64748b", fontWeight: 600 }}>Phone:</span>
                <span>{sale.customer.phone}</span>
                {sale.customer.nic && (
                  <>
                    <span style={{ color: "#64748b", fontWeight: 600 }}>NIC / Pass:</span>
                    <span>{sale.customer.nic}</span>
                  </>
                )}
                {sale.customer.address && (
                  <>
                    <span style={{ color: "#64748b", fontWeight: 600 }}>Address:</span>
                    <span>{sale.customer.address}</span>
                  </>
                )}
                {sale.customer.email && (
                  <>
                    <span style={{ color: "#64748b", fontWeight: 600 }}>Email:</span>
                    <span>{sale.customer.email}</span>
                  </>
                )}
              </div>
            </div>

            {/* Sale & Dispatch Details Card */}
            <div
              style={{
                backgroundColor: "#f8fafc",
                border: "1px solid #e2e8f0",
                borderRadius: "6px",
                padding: "10px 14px",
              }}
            >
              <p
                style={{
                  margin: 0,
                  fontSize: "9px",
                  fontWeight: 700,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: "#047857",
                }}
              >
                Sale &amp; Branch Records
              </p>
              <h3
                style={{
                  margin: "3px 0 6px",
                  fontSize: "14px",
                  fontWeight: 700,
                  color: "#0f172a",
                }}
              >
                {sale.branch.name}
              </h3>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "95px 1fr",
                  gap: "3px 8px",
                  fontSize: "11px",
                  color: "#334155",
                }}
              >
                <span style={{ color: "#64748b", fontWeight: 600 }}>Sales Officer:</span>
                <span>{sale.soldBy.name || sale.soldBy.email}</span>
                <span style={{ color: "#64748b", fontWeight: 600 }}>Branch Location:</span>
                <span>{sale.branch.location || "Main Showroom"}</span>
                <span style={{ color: "#64748b", fontWeight: 600 }}>Invoice Number:</span>
                <span style={{ fontFamily: 'Consolas, "Courier New", monospace' }}>
                  {invoiceNumber}
                </span>
                <span style={{ color: "#64748b", fontWeight: 600 }}>Issue Date:</span>
                <span>{formattedSaleDate}</span>
              </div>
            </div>
          </section>

          {/* ITEMIZATION TABLE */}
          <section
            aria-labelledby="invoice-items-title"
            style={{
              marginTop: "14px",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-end",
                marginBottom: "6px",
              }}
            >
              <span
                id="invoice-items-title"
                style={{
                  fontSize: "10px",
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "#0f172a",
                }}
              >
                Vehicle Itemization ({sale.items.length}{" "}
                {sale.items.length === 1 ? "unit" : "units"})
              </span>
              <span style={{ fontSize: "10px", color: "#64748b" }}>
                All prices in Sri Lankan Rupee (LKR)
              </span>
            </div>

            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: "11px",
                tableLayout: "fixed",
              }}
            >
              <thead>
                <tr
                  style={{
                    backgroundColor: "#0f172a",
                    color: "#ffffff",
                    borderTop: "1px solid #0f172a",
                    borderBottom: "1px solid #0f172a",
                  }}
                >
                  <th
                    style={{
                      width: "6%",
                      padding: "8px 6px",
                      textAlign: "center",
                      fontWeight: 700,
                      color: "#ffffff",
                    }}
                  >
                    #
                  </th>
                  <th
                    style={{
                      width: "36%",
                      padding: "8px 10px",
                      textAlign: "left",
                      fontWeight: 700,
                      color: "#ffffff",
                    }}
                  >
                    EV Model &amp; Specifications
                  </th>
                  <th
                    style={{
                      width: "28%",
                      padding: "8px 10px",
                      textAlign: "left",
                      fontWeight: 700,
                      color: "#ffffff",
                    }}
                  >
                    VIN / Chassis Number
                  </th>
                  <th
                    style={{
                      width: "12%",
                      padding: "8px 8px",
                      textAlign: "center",
                      fontWeight: 700,
                      color: "#ffffff",
                    }}
                  >
                    Color
                  </th>
                  <th
                    style={{
                      width: "18%",
                      padding: "8px 10px",
                      textAlign: "right",
                      fontWeight: 700,
                      color: "#ffffff",
                    }}
                  >
                    Unit Price
                  </th>
                </tr>
              </thead>
              <tbody>
                {sale.items.map((item, index) => (
                  <tr
                    key={item.id}
                    style={{
                      borderBottom: "1px solid #e2e8f0",
                      backgroundColor: index % 2 === 0 ? "#ffffff" : "#f8fafc",
                    }}
                  >
                    <td
                      style={{
                        padding: "10px 6px",
                        textAlign: "center",
                        color: "#64748b",
                        fontWeight: 600,
                        verticalAlign: "middle",
                      }}
                    >
                      {String(index + 1).padStart(2, "0")}
                    </td>
                    <td
                      style={{
                        padding: "10px 10px",
                        verticalAlign: "middle",
                      }}
                    >
                      <div
                        style={{
                          fontWeight: 700,
                          fontSize: "12px",
                          color: "#0f172a",
                        }}
                      >
                        {item.vehicle.vehicleModel.brand}{" "}
                        {item.vehicle.vehicleModel.modelName}
                      </div>
                      <div
                        style={{
                          fontSize: "10px",
                          color: "#64748b",
                          marginTop: "2px",
                        }}
                      >
                        {item.vehicle.motorNumber
                          ? `Motor: ${item.vehicle.motorNumber}`
                          : "Pure Electric Vehicle (BEV)"}
                        {item.vehicle.vehicleModel.batteryCapacity
                          ? ` • ${item.vehicle.vehicleModel.batteryCapacity}`
                          : ""}
                      </div>
                    </td>
                    <td
                      style={{
                        padding: "10px 10px",
                        fontFamily: 'Consolas, "Courier New", monospace',
                        fontSize: "11px",
                        color: "#0f172a",
                        fontWeight: 600,
                        verticalAlign: "middle",
                      }}
                    >
                      {item.vehicle.chassisNumber}
                    </td>
                    <td
                      style={{
                        padding: "10px 8px",
                        textAlign: "center",
                        color: "#334155",
                        verticalAlign: "middle",
                      }}
                    >
                      {item.vehicle.color || "Standard"}
                    </td>
                    <td
                      style={{
                        padding: "10px 10px",
                        textAlign: "right",
                        fontWeight: 700,
                        fontSize: "12px",
                        color: "#047857",
                        verticalAlign: "middle",
                      }}
                    >
                      {formatLKR(item.price)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          {/* FINANCIAL SUMMARY & PAYMENT DETAILS */}
          <section
            aria-label="Payment summary"
            style={{
              display: "grid",
              gridTemplateColumns: "1.1fr 0.9fr",
              gap: "20px",
              marginTop: "14px",
              paddingTop: "12px",
              borderTop: "1px solid #cbd5e1",
            }}
          >
            {/* Payment Method / Financing Details */}
            <div
              style={{
                backgroundColor: "#f8fafc",
                border: "1px solid #e2e8f0",
                borderRadius: "6px",
                padding: "12px 14px",
              }}
            >
              <p
                style={{
                  margin: 0,
                  fontSize: "9px",
                  fontWeight: 700,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: "#047857",
                }}
              >
                Payment Settlement
              </p>
              <h3
                style={{
                  margin: "3px 0 6px",
                  fontSize: "14px",
                  fontWeight: 700,
                  color: "#0f172a",
                }}
              >
                {sale.paymentMethod}
              </h3>
              {isFinance && sale.financeDetail ? (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "110px 1fr",
                    gap: "4px 8px",
                    fontSize: "11px",
                    color: "#334155",
                  }}
                >
                  <span style={{ color: "#64748b" }}>Finance Company:</span>
                  <strong style={{ color: "#0f172a" }}>
                    {sale.financeDetail.financeCompany}
                  </strong>
                  <span style={{ color: "#64748b" }}>Finance Status:</span>
                  <strong style={{ color: "#047857" }}>
                    {sale.financeDetail.status}
                  </strong>
                  <span style={{ color: "#64748b" }}>Down Payment:</span>
                  <strong style={{ color: "#0f172a" }}>
                    {formatLKR(sale.financeDetail.downPaymentPaid)}
                  </strong>
                  <span style={{ color: "#64748b" }}>Financed Amount:</span>
                  <strong style={{ color: "#0f172a" }}>
                    {formatLKR(sale.financeDetail.totalFinanceAmount)}
                  </strong>
                </div>
              ) : (
                <p
                  style={{
                    margin: 0,
                    fontSize: "11px",
                    color: "#475569",
                    lineHeight: 1.4,
                  }}
                >
                  Payment has been fully processed and verified in accordance with
                  dealership sales terms.
                </p>
              )}
              <div
                style={{
                  marginTop: "8px",
                  paddingTop: "6px",
                  borderTop: "1px dashed #cbd5e1",
                  fontSize: "10px",
                  color: "#64748b",
                }}
              >
                Sale Ref ID:{" "}
                <span
                  style={{
                    fontFamily: 'Consolas, "Courier New", monospace',
                    color: "#0f172a",
                  }}
                >
                  {sale.id}
                </span>
              </div>
            </div>

            {/* Calculations Breakdown */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "5px",
                justifyContent: "center",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "12px",
                  color: "#475569",
                }}
              >
                <span>Subtotal</span>
                <strong style={{ color: "#0f172a" }}>{formatLKR(itemSubtotal)}</strong>
              </div>
              {warrantyCharge > 0 && (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: "12px",
                    color: "#475569",
                  }}
                >
                  <span>Extended Warranty</span>
                  <strong style={{ color: "#0f172a" }}>
                    {formatLKR(warrantyCharge)}
                  </strong>
                </div>
              )}
              {additionalCharges > 0 && (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: "12px",
                    color: "#475569",
                  }}
                >
                  <span>Additional Charges / Registration</span>
                  <strong style={{ color: "#0f172a" }}>
                    {formatLKR(additionalCharges)}
                  </strong>
                </div>
              )}
              {advanceDeduction > 0 && (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: "12px",
                    color: "#64748b",
                  }}
                >
                  <span>Advance Deducted</span>
                  <strong>− {formatLKR(advanceDeduction)}</strong>
                </div>
              )}
              {discount > 0 && (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: "12px",
                    color: "#047857",
                  }}
                >
                  <span>Promotional Discount</span>
                  <strong>−{formatLKR(discount)}</strong>
                </div>
              )}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "8px 0",
                  margin: "4px 0",
                  borderTop: "2px solid #0f172a",
                  borderBottom: "2px solid #0f172a",
                  fontSize: "13px",
                  fontWeight: 800,
                  color: "#0f172a",
                }}
              >
                <span style={{ letterSpacing: "0.05em", textTransform: "uppercase" }}>
                  Total Payable
                </span>
                <span
                  style={{
                    fontSize: "16px",
                    fontWeight: 900,
                    color: "#047857",
                  }}
                >
                  {formatLKR(sale.totalAmount)}
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "12px",
                  color: "#475569",
                }}
              >
                <span>Amount Paid / Settled</span>
                <strong style={{ color: "#047857" }}>{formatLKR(paidAmount)}</strong>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "12px",
                  color: balanceDue > 0 ? "#b91c1c" : "#047857",
                  fontWeight: 700,
                }}
              >
                <span>Balance Due</span>
                <strong>{formatLKR(balanceDue)}</strong>
              </div>
            </div>
          </section>

          {/* WARRANTY DETAILS */}
          <section
            aria-labelledby="invoice-warranty-title"
            style={{
              marginTop: "14px",
              padding: "12px 14px",
              backgroundColor: "#f8fafc",
              border: "1px solid #cbd5e1",
              borderLeft: "4px solid #047857",
              borderRadius: "6px",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                paddingBottom: "8px",
                borderBottom: "1px solid #e2e8f0",
              }}
            >
              <div>
                <p
                  style={{
                    margin: 0,
                    fontSize: "9px",
                    fontWeight: 700,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    color: "#047857",
                  }}
                >
                  Warranty Selection
                </p>
                <h3
                  id="invoice-warranty-title"
                  style={{
                    margin: "2px 0 0",
                    fontSize: "13px",
                    fontWeight: 800,
                    color: "#0f172a",
                  }}
                >
                  Warranty Details
                </h3>
              </div>
              <span
                style={{
                  padding: "3px 8px",
                  backgroundColor: "#ecfdf5",
                  border: "1px solid #a7f3d0",
                  borderRadius: "20px",
                  fontSize: "9px",
                  fontWeight: 700,
                  color: "#047857",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                VIN-Linked Protection
              </span>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1.3fr",
                gap: "16px",
                paddingTop: "8px",
              }}
            >
              <div>
                <p
                  style={{
                    margin: "0 0 4px",
                    fontSize: "10px",
                    fontWeight: 700,
                    color: "#0f172a",
                    textTransform: "uppercase",
                  }}
                >
                  Registered Covered Units:
                </p>
                {sale.items.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      marginBottom: "6px",
                      fontSize: "10px",
                      color: "#334155",
                      lineHeight: 1.35,
                    }}
                  >
                    <strong style={{ color: "#0f172a" }}>
                      {item.vehicle.vehicleModel.brand}{" "}
                      {item.vehicle.vehicleModel.modelName}
                    </strong>
                    <div>VIN: {item.vehicle.chassisNumber}</div>
                    <div>
                      Battery SN:{" "}
                      {item.vehicle.batterySerialNumber || "Manufacturer Spec"}
                    </div>
                    <div>
                      Motor No: {item.vehicle.motorNumber || "Factory Fitted"}
                    </div>
                  </div>
                ))}
              </div>

              <div>
                <p
                  style={{
                    margin: "0 0 4px",
                    fontSize: "10px",
                    fontWeight: 700,
                    color: "#0f172a",
                    textTransform: "uppercase",
                  }}
                >
                  Selected warranty:
                </p>
                <div
                  style={{
                    padding: "12px",
                    border: "1px solid #a7f3d0",
                    borderRadius: "6px",
                    backgroundColor: "#ecfdf5",
                    color: "#065f46",
                    fontSize: "12px",
                    fontWeight: 700,
                    lineHeight: 1.5,
                  }}
                >
                  {sale.warrantyOption || "No warranty option recorded"}
                </div>
                <p
                  style={{
                    margin: "10px 0 0",
                    paddingTop: "8px",
                    borderTop: "1px solid #e2e8f0",
                    color: "#334155",
                    fontSize: "11px",
                    fontWeight: 700,
                  }}
                >
                  Motor Warranty: 3 Years or 30,000 km
                </p>
              </div>
            </div>
          </section>
        </div>

        {/* BOTTOM SECTION: Signatures & Footer (Always at the base of A4) */}
        <div>
          <section
            aria-label="Acknowledgements"
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "48px",
              padding: "16px 24px 0",
              borderTop: "1px solid #cbd5e1",
            }}
          >
            <div style={{ textAlign: "center" }}>
              <div
                style={{
                  height: "28px",
                  borderBottom: "1px dashed #64748b",
                  marginBottom: "6px",
                }}
              />
              <strong
                style={{
                  display: "block",
                  fontSize: "11px",
                  color: "#0f172a",
                }}
              >
                Customer Signature &amp; Acceptance
              </strong>
              <span style={{ fontSize: "9px", color: "#64748b" }}>
                Received in good condition with accessories
              </span>
            </div>

            <div style={{ textAlign: "center" }}>
              <div
                style={{
                  height: "28px",
                  borderBottom: "1px dashed #64748b",
                  marginBottom: "6px",
                }}
              />
              <strong
                style={{
                  display: "block",
                  fontSize: "11px",
                  color: "#0f172a",
                }}
              >
                Authorized Dealership Representative
              </strong>
              <span style={{ fontSize: "9px", color: "#64748b" }}>
                {sale.soldBy.name || sale.soldBy.email} • {sale.branch.name}
              </span>
            </div>
          </section>

          <footer
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: "14px",
              paddingTop: "8px",
              borderTop: "1px solid #e2e8f0",
              fontSize: "9px",
              color: "#94a3b8",
            }}
          >
            <span>
              {sale.organization.businessName} • {sale.branch.name}
              {sale.branch.location ? ` (${sale.branch.location})` : ""}
            </span>
            <span>
              Generated: {formattedSaleDate} • Invoice ID: {invoiceNumber} • Page 1 of 1
            </span>
          </footer>
        </div>
      </article>
    </main>
  )
}
