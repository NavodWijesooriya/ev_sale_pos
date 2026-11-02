"use client"

import * as React from "react"
import Link from "next/link"
import {
  Printer,
  ArrowLeft,
  Zap,
  Building2,
  Phone,
  Mail,
  MapPin,
  Calendar,
  FileText,
  CheckCircle2,
  ShieldCheck,
  CreditCard,
  Car,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { PaymentMethod, FinanceStatus } from "@prisma/client"

export interface InvoiceSaleData {
  id: string
  saleDate: Date | string
  totalAmount: number
  paymentMethod: PaymentMethod
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
  const handlePrint = () => {
    window.print()
  }

  const invoiceNumber = `INV-${sale.id.slice(0, 8).toUpperCase()}`
  const formattedSaleDate = new Date(sale.saleDate).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
  const formattedPrintDate = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })

  const isFinance =
    sale.paymentMethod === PaymentMethod.Finance ||
    sale.paymentMethod === PaymentMethod.SplitPayment

  return (
    <div className="min-h-screen bg-muted/30 py-4 sm:py-8 print:p-0 print:m-0 print:bg-white print:min-h-0">
      {/* Print Controls Bar - Hidden when printing */}
      <div className="max-w-4xl mx-auto px-4 mb-6 print:hidden">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-card/90 backdrop-blur p-4 rounded-xl border border-border shadow-xs">
          <Link href="/dashboard/sales">
            <Button variant="ghost" size="sm" className="gap-2 text-xs font-semibold">
              <ArrowLeft className="h-4 w-4" />
              Back to Sales Dashboard
            </Button>
          </Link>

          <div className="flex items-center gap-3">
            <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-600 border-emerald-500/20 py-1">
              Status: {sale.status}
            </Badge>

            <Button
              onClick={handlePrint}
              className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-md h-10 px-5 text-sm"
            >
              <Printer className="h-4 w-4" />
              Print Invoice / Receipt
            </Button>
          </div>
        </div>
      </div>

      {/* Main A4 Invoice Container */}
      <div className="max-w-4xl mx-auto bg-card text-card-foreground border border-border/80 shadow-xl rounded-2xl p-6 sm:p-12 print:max-w-none print:w-full print:border-none print:shadow-none print:rounded-none print:p-6 print:bg-white print:text-black">
        {/* INVOICE HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 pb-6 border-b border-border print:border-zinc-300">
          {/* Dealership Info */}
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              {sale.organization.logoUrl ? (
                <img
                  src={sale.organization.logoUrl}
                  alt={sale.organization.businessName}
                  className="h-12 w-auto object-contain"
                />
              ) : (
                <div className="h-11 w-11 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md print:bg-black print:text-white">
                  <Zap className="h-6 w-6" />
                </div>
              )}
              <div>
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground print:text-black">
                  {sale.organization.businessName}
                </h1>
                <p className="text-xs text-muted-foreground print:text-zinc-600 font-medium">
                  Official Electric Vehicle Dealership
                </p>
              </div>
            </div>

            <div className="text-xs text-muted-foreground print:text-zinc-600 space-y-0.5 pt-1">
              <p className="flex items-center gap-1.5 font-medium text-foreground print:text-black">
                <Building2 className="h-3.5 w-3.5 text-muted-foreground print:text-zinc-600 shrink-0" />
                {sale.branch.name}
                {sale.branch.location && ` • ${sale.branch.location}`}
              </p>
              {(sale.organization.phone || sale.branch.contactNumber) && (
                <p className="flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 text-muted-foreground print:text-zinc-600 shrink-0" />
                  {sale.organization.phone || sale.branch.contactNumber}
                </p>
              )}
              {sale.organization.domain && (
                <p className="text-[11px] font-mono">
                  {sale.organization.domain}
                </p>
              )}
            </div>
          </div>

          {/* Invoice Meta */}
          <div className="text-left sm:text-right space-y-1.5">
            <div className="inline-block bg-primary/10 text-primary px-3 py-1 rounded-md text-xs font-bold uppercase tracking-wider print:bg-zinc-100 print:text-black print:border print:border-zinc-300">
              Tax Invoice & Receipt
            </div>
            <h2 className="text-xl font-black text-foreground print:text-black font-mono mt-1">
              {invoiceNumber}
            </h2>
            <div className="text-xs text-muted-foreground print:text-zinc-600 space-y-0.5">
              <p>
                <span className="font-semibold text-foreground print:text-black">Date of Sale:</span>{" "}
                {formattedSaleDate}
              </p>
              <p>
                <span className="font-semibold text-foreground print:text-black">Sales Rep:</span>{" "}
                {sale.soldBy.name || sale.soldBy.email}
              </p>
              <p>
                <span className="font-semibold text-foreground print:text-black">Payment Status:</span>{" "}
                <span className="font-bold text-emerald-600 print:text-black uppercase">
                  {sale.status}
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* BILL TO & VEHICLE SPEC SUMMARY */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 py-6 border-b border-border print:border-zinc-300">
          {/* Customer / Buyer Information */}
          <div className="p-4 rounded-xl bg-muted/40 print:bg-zinc-50 print:border print:border-zinc-200 space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground print:text-zinc-600">
              Bill To / Purchaser Details
            </span>
            <h3 className="font-bold text-base text-foreground print:text-black">
              {sale.customer.name}
            </h3>
            <div className="text-xs text-muted-foreground print:text-zinc-700 space-y-1">
              <p className="font-mono flex items-center gap-1.5">
                <Phone className="h-3 w-3 shrink-0" />
                {sale.customer.phone}
              </p>
              {sale.customer.nic && (
                <p className="font-mono flex items-center gap-1.5">
                  <FileText className="h-3 w-3 shrink-0" />
                  NIC / Passport: <span className="font-semibold text-foreground print:text-black">{sale.customer.nic}</span>
                </p>
              )}
              {sale.customer.email && (
                <p className="flex items-center gap-1.5">
                  <Mail className="h-3 w-3 shrink-0" />
                  {sale.customer.email}
                </p>
              )}
              {sale.customer.address && (
                <p className="flex items-center gap-1.5 pt-0.5">
                  <MapPin className="h-3 w-3 shrink-0" />
                  {sale.customer.address}
                </p>
              )}
            </div>
          </div>

          {/* Deal & Payment Terms Overview */}
          <div className="p-4 rounded-xl bg-muted/40 print:bg-zinc-50 print:border print:border-zinc-200 space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground print:text-zinc-600">
              Payment & Delivery Terms
            </span>
            <div className="text-xs space-y-2 pt-1">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground print:text-zinc-600">Payment Method:</span>
                <Badge variant="outline" className="font-semibold text-xs print:border-zinc-400">
                  {sale.paymentMethod}
                </Badge>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-muted-foreground print:text-zinc-600">Issuing Branch:</span>
                <span className="font-medium text-foreground print:text-black">
                  {sale.branch.name}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-muted-foreground print:text-zinc-600">Transaction ID:</span>
                <span className="font-mono text-[11px] text-muted-foreground print:text-zinc-700">
                  {sale.id}
                </span>
              </div>

              <div className="flex justify-between items-center pt-1 border-t border-border/60 print:border-zinc-300">
                <span className="font-semibold text-foreground print:text-black">Vehicle Delivery:</span>
                <span className="font-semibold text-emerald-600 print:text-black flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Ownership Transferred
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ITEMIZED VEHICLE TABLE */}
        <div className="py-6">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground print:text-zinc-600 mb-3">
            Itemized Vehicle Specification
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b-2 border-border print:border-black bg-muted/30 print:bg-zinc-100">
                  <th className="py-2.5 px-3 font-bold text-foreground print:text-black">Item #</th>
                  <th className="py-2.5 px-3 font-bold text-foreground print:text-black">Vehicle Description</th>
                  <th className="py-2.5 px-3 font-bold text-foreground print:text-black">Chassis No. (VIN)</th>
                  <th className="py-2.5 px-3 font-bold text-foreground print:text-black">Motor No.</th>
                  <th className="py-2.5 px-3 font-bold text-foreground print:text-black">Specs</th>
                  <th className="py-2.5 px-3 font-bold text-foreground print:text-black text-right">Amount ($)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 print:divide-zinc-200">
                {sale.items.map((item, idx) => {
                  const v = item.vehicle
                  const m = v.vehicleModel
                  return (
                    <tr key={item.id} className="align-top">
                      <td className="py-3 px-3 font-mono font-medium">{idx + 1}</td>
                      <td className="py-3 px-3">
                        <span className="font-bold text-sm text-foreground print:text-black block">
                          {m.brand} {m.modelName}
                        </span>
                        {v.color && (
                          <span className="text-[11px] text-muted-foreground print:text-zinc-600 capitalize">
                            Exterior Color: {v.color}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 font-mono font-semibold text-foreground print:text-black">
                        {v.chassisNumber}
                      </td>
                      <td className="py-3 px-3 font-mono text-muted-foreground print:text-zinc-700">
                        {v.motorNumber || "N/A"}
                      </td>
                      <td className="py-3 px-3 text-[11px] text-muted-foreground print:text-zinc-700">
                        {m.batteryCapacity && <div>Battery: {m.batteryCapacity}</div>}
                        {m.range && <div>Range: {m.range}</div>}
                      </td>
                      <td className="py-3 px-3 font-bold text-sm text-right text-foreground print:text-black">
                        ${item.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* PAYMENT SUMMARY & LEASING BREAKDOWN */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 pt-4 pb-8 border-t border-border print:border-zinc-300">
          {/* Left Column: Finance details if applicable */}
          <div className="sm:col-span-7">
            {isFinance && sale.financeDetail ? (
              <div className="p-4 rounded-xl bg-purple-500/5 border border-purple-500/20 print:bg-zinc-50 print:border-zinc-300 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-purple-700 dark:text-purple-400 print:text-black flex items-center gap-1.5">
                    <ShieldCheck className="h-4 w-4" />
                    Automotive Financing / Lease Settlement
                  </span>
                  <Badge variant="outline" className="text-[10px] bg-purple-500/10 text-purple-600 print:text-black print:border-zinc-400">
                    {sale.financeDetail.status}
                  </Badge>
                </div>

                <div className="text-xs space-y-1.5 text-muted-foreground print:text-zinc-700 pt-1">
                  <div className="flex justify-between">
                    <span>Financing Institution:</span>
                    <span className="font-semibold text-foreground print:text-black">
                      {sale.financeDetail.financeCompany}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Down Payment Received (Cash/Bank):</span>
                    <span className="font-semibold text-foreground print:text-black">
                      ${sale.financeDetail.downPaymentPaid.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Financed Principal Loan Amount:</span>
                    <span className="font-bold text-purple-700 dark:text-purple-400 print:text-black">
                      ${sale.financeDetail.totalFinanceAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  {sale.financeDetail.dealerCommission && (
                    <div className="flex justify-between text-[11px]">
                      <span>Dealer Commission / Facility Fee:</span>
                      <span>${sale.financeDetail.dealerCommission.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl border border-dashed border-border/80 print:border-zinc-300 space-y-1 text-xs text-muted-foreground print:text-zinc-600">
                <span className="font-semibold text-foreground print:text-black block">Settlement Note</span>
                <p>
                  Full vehicle payment settled via {sale.paymentMethod}. No outstanding lease or finance lien on this chassis from dealership records.
                </p>
              </div>
            )}
          </div>

          {/* Right Column: Totals */}
          <div className="sm:col-span-5 space-y-2 text-xs">
            <div className="flex justify-between py-1 text-muted-foreground print:text-zinc-600">
              <span>Subtotal</span>
              <span className="font-semibold text-foreground print:text-black">
                ${sale.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>

            <div className="flex justify-between py-1 text-muted-foreground print:text-zinc-600">
              <span>Government EV Rebate / Concession</span>
              <span className="font-medium text-foreground print:text-black">$0.00</span>
            </div>

            <div className="flex justify-between py-1 text-muted-foreground print:text-zinc-600">
              <span>Documentation & Registration Fee</span>
              <span className="font-medium text-foreground print:text-black">Included</span>
            </div>

            <Separator className="my-2" />

            <div className="flex justify-between items-baseline pt-1">
              <span className="text-sm font-bold text-foreground print:text-black">Total Amount</span>
              <span className="text-2xl font-black text-emerald-600 print:text-black">
                ${sale.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>

            {isFinance && sale.financeDetail && (
              <div className="p-2.5 rounded-lg bg-muted/60 print:bg-zinc-100 space-y-1 text-[11px] mt-2">
                <div className="flex justify-between text-muted-foreground print:text-zinc-700">
                  <span>Down Payment Collected:</span>
                  <span className="font-semibold text-foreground print:text-black">
                    ${sale.financeDetail.downPaymentPaid.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between text-muted-foreground print:text-zinc-700">
                  <span>Financed by {sale.financeDetail.financeCompany}:</span>
                  <span className="font-semibold text-foreground print:text-black">
                    ${sale.financeDetail.totalFinanceAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* SIGNATURES & AUTHORIZATION AREA */}
        <div className="pt-8 border-t border-border print:border-zinc-300 grid grid-cols-2 gap-12 mt-6">
          <div className="text-center space-y-2">
            <div className="h-14 border-b border-dashed border-zinc-400 print:border-zinc-600" />
            <p className="font-bold text-xs text-foreground print:text-black">
              Customer / Purchaser Signature
            </p>
            <p className="text-[10px] text-muted-foreground print:text-zinc-600">
              I acknowledge receipt of the vehicle and agree to terms
            </p>
          </div>

          <div className="text-center space-y-2">
            <div className="h-14 border-b border-dashed border-zinc-400 print:border-zinc-600" />
            <p className="font-bold text-xs text-foreground print:text-black">
              Authorized Dealership Representative
            </p>
            <p className="text-[10px] text-muted-foreground print:text-zinc-600">
              Issued by: {sale.soldBy.name || sale.soldBy.email} • Official Stamp
            </p>
          </div>
        </div>

        {/* FOOTER DISCLAIMER */}
        <div className="mt-10 pt-4 border-t border-border/40 print:border-zinc-200 text-center text-[10px] text-muted-foreground print:text-zinc-500 space-y-1">
          <p className="font-semibold">
            Thank you for choosing {sale.organization.businessName} for your Electric Vehicle journey!
          </p>
          <p>
            This document serves as an official commercial tax invoice and receipt of payment. Keep safe for warranty claims and motor traffic vehicle registration.
          </p>
          <p className="font-mono text-[9px] pt-1">
            Generated via VoltPOS EV Dealership ERP • Document ID: {sale.id} • Printed: {formattedPrintDate}
          </p>
        </div>
      </div>
    </div>
  )
}
