"use client"

import * as React from "react"
import Link from "next/link"
import {
  Printer,
  ArrowLeft,
  Wrench,
  Zap,
  Building2,
  Phone,
  Mail,
  MapPin,
  Calendar,
  FileText,
  CheckCircle2,
  ShieldCheck,
  BatteryCharging,
  Bike,
  Clock,
  Sparkles,
  User,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ServiceType } from "@prisma/client"

export interface ServiceJobCardData {
  id: string
  serviceDate: Date | string
  nextServiceDueDate?: Date | string | null
  serviceType: ServiceType
  description?: string | null
  totalCost: number
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
}

interface PrintableJobCardProps {
  record: ServiceJobCardData
}

export function PrintableJobCard({ record }: PrintableJobCardProps) {
  const handlePrint = () => {
    window.print()
  }

  const jobCardNumber = `JOB-${record.id.slice(0, 8).toUpperCase()}`
  const formattedServiceDate = new Date(record.serviceDate).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  const formattedDueDate = record.nextServiceDueDate
    ? new Date(record.nextServiceDueDate).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null

  const formattedPrintDate = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })

  const renderServiceBadge = (type: ServiceType) => {
    switch (type) {
      case ServiceType.Free:
        return (
          <Badge
            variant="outline"
            className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 font-bold text-xs gap-1 print:border-zinc-400 print:text-black"
          >
            <CheckCircle2 className="size-3" />
            Free Periodic Service
          </Badge>
        )
      case ServiceType.Warranty:
        return (
          <Badge
            variant="outline"
            className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 font-bold text-xs gap-1 print:border-zinc-400 print:text-black"
          >
            <ShieldCheck className="size-3" />
            Warranty Repair / Claim
          </Badge>
        )
      case ServiceType.Paid:
        return (
          <Badge
            variant="outline"
            className="bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20 font-bold text-xs gap-1 print:border-zinc-400 print:text-black"
          >
            <Wrench className="size-3" />
            Paid Maintenance Service
          </Badge>
        )
      default:
        return <Badge variant="outline">{type}</Badge>
    }
  }

  return (
    <div className="min-h-screen bg-muted/30 py-4 sm:py-8 print:p-0 print:m-0 print:bg-white print:min-h-0">
      {/* Top Action Controls - Hidden when printing */}
      <div className="max-w-4xl mx-auto px-4 mb-6 print:hidden">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-card/90 backdrop-blur p-4 rounded-xl border border-border shadow-xs">
          <Link href="/dashboard/services">
            <Button variant="ghost" size="sm" className="gap-2 text-xs font-semibold">
              <ArrowLeft className="size-4" />
              Back to Services Dashboard
            </Button>
          </Link>

          <div className="flex items-center gap-3">
            {renderServiceBadge(record.serviceType)}

            <Button
              onClick={handlePrint}
              className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-md h-10 px-5 text-sm"
            >
              <Printer className="size-4" />
              Print Job Card
            </Button>
          </div>
        </div>
      </div>

      {/* Main A4 Printable Card Container */}
      <div className="max-w-4xl mx-auto bg-card text-card-foreground border border-border/80 shadow-xl rounded-2xl p-6 sm:p-12 print:max-w-none print:w-full print:border-none print:shadow-none print:rounded-none print:p-6 print:bg-white print:text-black">
        {/* HEADER SECTION */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 pb-6 border-b border-border print:border-zinc-300">
          {/* Dealership Info */}
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              {record.organization.logoUrl ? (
                <img
                  src={record.organization.logoUrl}
                  alt={record.organization.businessName}
                  className="h-12 w-auto object-contain"
                />
              ) : (
                <div className="h-11 w-11 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md print:bg-black print:text-white">
                  <Zap className="h-6 w-6" />
                </div>
              )}
              <div>
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground print:text-black">
                  {record.organization.businessName}
                </h1>
                <p className="text-xs text-muted-foreground print:text-zinc-600 font-medium">
                  Official Electric Vehicle Service & Workshop Center
                </p>
              </div>
            </div>

            <div className="text-xs text-muted-foreground print:text-zinc-600 space-y-0.5 pt-1">
              <p className="flex items-center gap-1.5 font-medium text-foreground print:text-black">
                <Building2 className="size-3.5 text-muted-foreground print:text-zinc-600 shrink-0" />
                {record.branch.name}
                {record.branch.location && ` • ${record.branch.location}`}
              </p>
              {(record.organization.phone || record.branch.contactNumber) && (
                <p className="flex items-center gap-1.5">
                  <Phone className="size-3.5 text-muted-foreground print:text-zinc-600 shrink-0" />
                  {record.organization.phone || record.branch.contactNumber}
                </p>
              )}
              {record.organization.domain && (
                <p className="text-[11px] font-mono">
                  {record.organization.domain}
                </p>
              )}
            </div>
          </div>

          {/* Job Card Meta */}
          <div className="text-left sm:text-right space-y-1.5">
            <div className="inline-block bg-primary/10 text-primary px-3 py-1 rounded-md text-xs font-bold uppercase tracking-wider print:bg-zinc-100 print:text-black print:border print:border-zinc-300">
              Service Job Card
            </div>
            <h2 className="text-xl font-black text-foreground print:text-black font-mono mt-1">
              {jobCardNumber}
            </h2>
            <div className="text-xs text-muted-foreground print:text-zinc-600 space-y-0.5">
              <p>
                <span className="font-semibold text-foreground print:text-black">Date of Service:</span>{" "}
                {formattedServiceDate}
              </p>
              <p>
                <span className="font-semibold text-foreground print:text-black">Service Category:</span>{" "}
                <span className="font-bold text-foreground print:text-black uppercase">
                  {record.serviceType}
                </span>
              </p>
              <p>
                <span className="font-semibold text-foreground print:text-black">Status:</span>{" "}
                <span className="font-bold text-emerald-600 print:text-black">
                  Completed & Verified
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* DETAILS SECTION: CUSTOMER & VEHICLE */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 py-6 border-b border-border print:border-zinc-300">
          {/* Customer / Owner Profile */}
          <div className="p-4 rounded-xl bg-muted/40 print:bg-zinc-50 print:border print:border-zinc-200 space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground print:text-zinc-600 flex items-center gap-1.5">
              <User className="size-3.5 text-blue-500" />
              Customer / Vehicle Owner
            </span>
            <h3 className="font-bold text-base text-foreground print:text-black">
              {record.customer.name}
            </h3>
            <div className="text-xs text-muted-foreground print:text-zinc-700 space-y-1">
              <p className="font-mono flex items-center gap-1.5">
                <Phone className="size-3 shrink-0" />
                {record.customer.phone}
              </p>
              {record.customer.nic && (
                <p className="font-mono flex items-center gap-1.5">
                  <FileText className="size-3 shrink-0" />
                  NIC: <span className="font-semibold text-foreground print:text-black">{record.customer.nic}</span>
                </p>
              )}
              {record.customer.email && (
                <p className="flex items-center gap-1.5">
                  <Mail className="size-3 shrink-0" />
                  {record.customer.email}
                </p>
              )}
              {record.customer.address && (
                <p className="flex items-center gap-1.5 pt-0.5">
                  <MapPin className="size-3 shrink-0" />
                  {record.customer.address}
                </p>
              )}
            </div>
          </div>

          {/* Vehicle & High-Voltage Battery Profile */}
          <div className="p-4 rounded-xl bg-muted/40 print:bg-zinc-50 print:border print:border-zinc-200 space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground print:text-zinc-600 flex items-center gap-1.5">
              <Bike className="size-3.5 text-emerald-500" />
              Electric Bike Specifications
            </span>
            <h3 className="font-bold text-base text-foreground print:text-black">
              {record.vehicle.vehicleModel.brand} {record.vehicle.vehicleModel.modelName}
            </h3>
            <div className="text-xs text-muted-foreground print:text-zinc-700 space-y-1">
              <p className="font-mono">
                Chassis (VIN):{" "}
                <span className="font-bold text-foreground print:text-black">
                  {record.vehicle.chassisNumber}
                </span>
              </p>
              {record.vehicle.motorNumber && (
                <p className="font-mono">
                  Electric Motor No: {record.vehicle.motorNumber}
                </p>
              )}
              {record.vehicle.batterySerialNumber && (
                <p className="font-mono text-emerald-600 print:text-black font-semibold">
                  Battery Pack S/N: {record.vehicle.batterySerialNumber}
                </p>
              )}
              <p>
                Warranty Period:{" "}
                <strong className="text-foreground print:text-black">
                  {record.vehicle.warrantyPeriod || "3 Years / 100,000 km"}
                </strong>
              </p>
            </div>
          </div>
        </div>

        {/* WORK CARRIED OUT & DIAGNOSTICS */}
        <div className="py-6 border-b border-border print:border-zinc-300 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground print:text-zinc-600 flex items-center gap-1.5">
              <Wrench className="size-4 text-purple-600" />
              Work Carried Out & Technical Inspection Summary
            </h3>
            {renderServiceBadge(record.serviceType)}
          </div>

          <div className="p-4 rounded-xl bg-muted/30 print:bg-white print:border print:border-zinc-200">
            <p className="text-xs text-foreground print:text-black leading-relaxed whitespace-pre-wrap font-sans">
              {record.description || "Routine Electric Vehicle multi-point inspection completed according to factory maintenance standards."}
            </p>
          </div>

          {/* Standard EV Multi-Point Inspection Table Checklist */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div className="flex items-center gap-1.5 p-2 rounded-lg bg-muted/20 border print:border-zinc-200">
              <CheckCircle2 className="size-3.5 text-emerald-500 shrink-0" />
              <span>High-Voltage Battery SOH</span>
            </div>
            <div className="flex items-center gap-1.5 p-2 rounded-lg bg-muted/20 border print:border-zinc-200">
              <CheckCircle2 className="size-3.5 text-emerald-500 shrink-0" />
              <span>Drive Motor Coolant Level</span>
            </div>
            <div className="flex items-center gap-1.5 p-2 rounded-lg bg-muted/20 border print:border-zinc-200">
              <CheckCircle2 className="size-3.5 text-emerald-500 shrink-0" />
              <span>Regenerative Braking Test</span>
            </div>
            <div className="flex items-center gap-1.5 p-2 rounded-lg bg-muted/20 border print:border-zinc-200">
              <CheckCircle2 className="size-3.5 text-emerald-500 shrink-0" />
              <span>Firmware & Safety Diagnostics</span>
            </div>
          </div>
        </div>

        {/* BILLING SUMMARY & NEXT SERVICE DUE */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 py-6 border-b border-border print:border-zinc-300">
          {/* Next Recommended Service Due Callout */}
          <div className="sm:col-span-7">
            <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/20 print:bg-zinc-50 print:border-zinc-300 space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400 print:text-black flex items-center gap-1.5">
                <Calendar className="size-4" />
                Next Recommended Service Interval
              </span>
              <p className="text-sm font-black text-foreground print:text-black">
                {formattedDueDate || "In 6 Months or 10,000 km (Whichever Occurs First)"}
              </p>
              <p className="text-[11px] text-muted-foreground print:text-zinc-600">
                To maintain your manufacturer EV battery warranty validity, ensure regular periodic servicing at any authorized {record.organization.businessName} workshop.
              </p>
            </div>
          </div>

          {/* Cost Breakdown */}
          <div className="sm:col-span-5 space-y-2 text-xs">
            <div className="flex justify-between py-1 text-muted-foreground print:text-zinc-600">
              <span>Labor & Diagnostic Charge</span>
              <span className="font-semibold text-foreground print:text-black">
                {record.totalCost === 0 ? "Complimentary" : `$${record.totalCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
              </span>
            </div>

            <div className="flex justify-between py-1 text-muted-foreground print:text-zinc-600">
              <span>Warranty / Free Program Concession</span>
              <span className="font-semibold text-emerald-600 print:text-black">
                {record.totalCost === 0 ? "- 100% Covered" : "$0.00"}
              </span>
            </div>

            <Separator className="my-2" />

            <div className="flex justify-between items-baseline pt-1">
              <span className="text-sm font-bold text-foreground print:text-black">Total Paid Amount</span>
              <span className="text-2xl font-black text-emerald-600 print:text-black">
                {record.totalCost === 0 ? "$0.00" : `$${record.totalCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
              </span>
            </div>
          </div>
        </div>

        {/* SIGNATURES & AUTHORIZATION */}
        <div className="pt-8 grid grid-cols-2 gap-12 mt-4">
          <div className="text-center space-y-2">
            <div className="h-14 border-b border-dashed border-zinc-400 print:border-zinc-600" />
            <p className="font-bold text-xs text-foreground print:text-black">
              Customer / Vehicle Recipient Signature
            </p>
            <p className="text-[10px] text-muted-foreground print:text-zinc-600">
              I acknowledge completion and satisfaction of the service work described
            </p>
          </div>

          <div className="text-center space-y-2">
            <div className="h-14 border-b border-dashed border-zinc-400 print:border-zinc-600" />
            <p className="font-bold text-xs text-foreground print:text-black">
              Workshop Supervisor / Certified EV Technician
            </p>
            <p className="text-[10px] text-muted-foreground print:text-zinc-600">
              {record.branch.name} • Official Workshop Seal
            </p>
          </div>
        </div>

        {/* FOOTER DISCLAIMER */}
        <div className="mt-10 pt-4 border-t border-border/40 print:border-zinc-200 text-center text-[10px] text-muted-foreground print:text-zinc-500 space-y-1">
          <p className="font-semibold">
            Thank you for trusting {record.organization.businessName} with your Electric Vehicle care and maintenance!
          </p>
          <p>
            This official job card serves as verification of work performed and battery health inspection. Please retain for vehicle service history and warranty records.
          </p>
          <p className="font-mono text-[9px] pt-1">
            Generated via Ev Sale Pos • Document ID: {record.id} • Printed: {formattedPrintDate}
          </p>
        </div>
      </div>
    </div>
  )
}
