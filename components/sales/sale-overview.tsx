"use client"

import * as React from "react"
import { useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  ArrowLeft,
  FileText,
  Printer,
  ShieldCheck,
  Truck,
  Bike,
  User,
  Phone,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileCheck2,
  BatteryCharging,
  Zap,
  Building,
  Calendar,
  CreditCard,
  Sparkles,
  Save,
  RotateCw,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Separator } from "@/components/ui/separator"
import { updateDMTRegistration } from "@/app/actions/sales"
import { DMTStatus, PaymentMethod } from "@prisma/client"

interface SaleOverviewProps {
  sale: {
    id: string
    saleDate: Date | string
    totalAmount: number
    discount: number
    additionalCharges: number
    deliveryDate?: Date | string | null
    paymentMethod: PaymentMethod
    status: string
    organization: {
      businessName: string
      phone?: string | null
      logoUrl?: string | null
    }
    branch: {
      id: string
      name: string
      location?: string | null
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
        purchasePrice: number
        vehicleModel: {
          brand: string
          modelName: string
          batteryCapacity?: string | null
          range?: string | null
          defaultPrice: number
        }
      }
    }>
    financeDetail?: {
      financeCompany: string
      totalFinanceAmount: number
      downPaymentPaid: number
      status: string
    } | null
    dmtRegistration?: {
      id: string
      status: DMTStatus
      hasMTA2: boolean
      hasNIC: boolean
      hasPhotos: boolean
      hasTIN: boolean
      registeredNumber?: string | null
    } | null
  }
}

export function SaleOverview({ sale }: SaleOverviewProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // DMT Tracking state
  const initialDMT = sale.dmtRegistration || {
    status: DMTStatus.Pending,
    hasMTA2: false,
    hasNIC: false,
    hasPhotos: false,
    hasTIN: false,
    registeredNumber: "",
  }

  const [dmtStatus, setDmtStatus] = useState<DMTStatus>(initialDMT.status)
  const [hasMTA2, setHasMTA2] = useState<boolean>(initialDMT.hasMTA2)
  const [hasNIC, setHasNIC] = useState<boolean>(initialDMT.hasNIC)
  const [hasPhotos, setHasPhotos] = useState<boolean>(initialDMT.hasPhotos)
  const [hasTIN, setHasTIN] = useState<boolean>(initialDMT.hasTIN)
  const [registeredNumber, setRegisteredNumber] = useState<string>(
    initialDMT.registeredNumber || ""
  )

  // Calculate completed checklist percentage
  const checklistItems = [hasMTA2, hasNIC, hasPhotos, hasTIN]
  const completedDocsCount = checklistItems.filter(Boolean).length
  const checklistPercentage = Math.round((completedDocsCount / 4) * 100)

  // Delivery Note print trigger
  const handlePrintDeliveryNote = () => {
    window.print()
  }

  // Update DMT record
  const handleSaveDMT = () => {
    startTransition(async () => {
      const res = await updateDMTRegistration({
        saleId: sale.id,
        status: dmtStatus,
        hasMTA2,
        hasNIC,
        hasPhotos,
        hasTIN,
        registeredNumber,
      })

      if (res.success) {
        toast.success(res.message || "DMT registration updated successfully!")
        router.refresh()
      } else {
        toast.error(res.error || "Failed to update DMT registration.")
      }
    })
  }

  const primaryItem = sale.items[0]
  const vehicle = primaryItem?.vehicle
  const model = vehicle?.vehicleModel

  const formattedSaleDate = new Date(sale.saleDate).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })

  const formattedDeliveryDate = new Date(sale.deliveryDate || sale.saleDate).toLocaleDateString(
    "en-US",
    {
      year: "numeric",
      month: "short",
      day: "numeric",
    }
  )

  const renderDMTBadge = (status: DMTStatus) => {
    switch (status) {
      case DMTStatus.Pending:
        return (
          <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20 gap-1">
            <Clock className="size-3" />
            Pending Documents
          </Badge>
        )
      case DMTStatus.DocumentsCollected:
        return (
          <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20 gap-1">
            <FileCheck2 className="size-3" />
            Documents Collected
          </Badge>
        )
      case DMTStatus.Processing:
        return (
          <Badge variant="outline" className="bg-purple-500/10 text-purple-600 border-purple-500/20 gap-1">
            <RotateCw className="size-3 animate-spin" />
            Processing at DMT Werahera
          </Badge>
        )
      case DMTStatus.Completed:
        return (
          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 gap-1">
            <CheckCircle2 className="size-3" />
            DMT Registered & Number Issued
          </Badge>
        )
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Navigation & Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <div className="flex items-center gap-2">
            <Link href="/dashboard/sales">
              <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground">
                <ArrowLeft className="size-4" />
                Sales Dashboard
              </Button>
            </Link>
            <span className="text-muted-foreground/40">/</span>
            <span className="text-xs font-mono font-semibold text-foreground">
              INV-{sale.id.slice(0, 8).toUpperCase()}
            </span>
          </div>

          <div className="flex items-center gap-2.5 mt-2">
            <h1 className="text-2xl font-black tracking-tight text-foreground">
              EV Bike Sale Overview & Handover
            </h1>
            {renderDMTBadge(dmtStatus)}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Purchased by <strong className="text-foreground">{sale.customer.name}</strong> • Handled by {sale.soldBy.name || sale.soldBy.email}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href={`/dashboard/sales/${sale.id}/invoice`}>
            <Button variant="outline" size="sm" className="h-9 gap-1.5 text-xs font-medium">
              <FileText className="size-4 text-primary" />
              Tax Invoice
            </Button>
          </Link>

          <Button
            onClick={handlePrintDeliveryNote}
            className="h-9 gap-1.5 text-xs font-bold bg-primary text-primary-foreground shadow-xs"
          >
            <Printer className="size-4" />
            Print Delivery Note
          </Button>
        </div>
      </div>

      {/* Grid of Sections: Delivery Note & Warranty (Left), DMT Registration (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Section A (Delivery Note) & Section B (Warranty Activation) */}
        <div className="lg:col-span-7 space-y-6">
          {/* SECTION A: DELIVERY NOTE & HANDOVER SPECIFICATION */}
          <Card className="border-border/60 shadow-sm bg-card/60 backdrop-blur print:border-none print:shadow-none">
            <CardHeader className="pb-3 border-b border-border/40">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="size-9 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                    <Truck className="size-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-bold">Section A: EV Bike Delivery Note</CardTitle>
                    <CardDescription className="text-xs">
                      Handover certificate, physical inspection & custody transfer
                    </CardDescription>
                  </div>
                </div>

                <Badge variant="outline" className="text-xs bg-blue-500/5 text-blue-600 border-blue-500/20">
                  Delivery: {formattedDeliveryDate}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-lg bg-muted/40 border space-y-1">
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase">
                    Delivered EV Bike
                  </span>
                  <p className="font-bold text-foreground text-sm">
                    {model?.brand} {model?.modelName}
                  </p>
                  <p className="font-mono text-muted-foreground">
                    Chassis #: <span className="text-foreground font-semibold">{vehicle?.chassisNumber}</span>
                  </p>
                  <p className="text-muted-foreground">
                    Color: <span className="text-foreground capitalize">{vehicle?.color || "Standard"}</span>
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-muted/40 border space-y-1">
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase">
                    Customer / Recipient
                  </span>
                  <p className="font-bold text-foreground text-sm">{sale.customer.name}</p>
                  <p className="font-mono text-muted-foreground">Phone: {sale.customer.phone}</p>
                  {sale.customer.nic && (
                    <p className="font-mono text-muted-foreground">NIC: {sale.customer.nic}</p>
                  )}
                </div>
              </div>

              {/* Handover Inspection Checklist (Printed on Delivery Note) */}
              <div className="space-y-2 pt-1">
                <span className="text-xs font-semibold text-muted-foreground">
                  Physical Handover Protocol
                </span>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-2 p-2 rounded-md bg-muted/30 border">
                    <CheckCircle2 className="size-4 text-emerald-500 shrink-0" />
                    <span>Type-2 Portable EV Charger</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded-md bg-muted/30 border">
                    <CheckCircle2 className="size-4 text-emerald-500 shrink-0" />
                    <span>2 Smart Remote Keys</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded-md bg-muted/30 border">
                    <CheckCircle2 className="size-4 text-emerald-500 shrink-0" />
                    <span>Owner's Manual & Warranty Guide</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded-md bg-muted/30 border">
                    <CheckCircle2 className="size-4 text-emerald-500 shrink-0" />
                    <span>100% Pre-Delivery Charge (PDI)</span>
                  </div>
                </div>
              </div>

              {/* Signature Blocks (Visible on Screen & for Print) */}
              <div className="pt-4 border-t border-border/40 grid grid-cols-2 gap-6 text-center">
                <div className="space-y-1">
                  <div className="h-12 border-b border-dashed border-muted-foreground/40" />
                  <p className="text-xs font-semibold text-foreground">Customer Handover Signature</p>
                  <p className="text-[10px] text-muted-foreground">Received vehicle in satisfactory condition</p>
                </div>
                <div className="space-y-1">
                  <div className="h-12 border-b border-dashed border-muted-foreground/40" />
                  <p className="text-xs font-semibold text-foreground">Dealership Handover Officer</p>
                  <p className="text-[10px] text-muted-foreground">Verified by: {sale.soldBy.name || sale.soldBy.email}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* SECTION B: WARRANTY ACTIVATION DETAILS */}
          <Card className="border-border/60 shadow-sm bg-card/60 backdrop-blur">
            <CardHeader className="pb-3 border-b border-border/40">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="size-9 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                    <ShieldCheck className="size-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-bold">Section B: Manufacturer EV & Battery Warranty</CardTitle>
                    <CardDescription className="text-xs">
                      Official battery pack certificate & warranty activation details
                    </CardDescription>
                  </div>
                </div>

                <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                  Warranty Active
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-lg bg-emerald-500/5 border border-emerald-500/20 space-y-1.5">
                  <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wide flex items-center gap-1.5">
                    <BatteryCharging className="size-4" />
                    High-Voltage Battery Pack
                  </span>
                  <div className="text-xs space-y-1">
                    <p className="text-muted-foreground">
                      Battery Serial:{" "}
                      <span className="font-mono font-bold text-foreground">
                        {vehicle?.batterySerialNumber || "Registered with Manufacturer"}
                      </span>
                    </p>
                    <p className="text-muted-foreground">
                      Pack Capacity:{" "}
                      <span className="font-medium text-foreground">{model?.batteryCapacity || "Standard"}</span>
                    </p>
                    <p className="text-muted-foreground">
                      Estimated Range:{" "}
                      <span className="font-medium text-foreground">{model?.range || "N/A"}</span>
                    </p>
                  </div>
                </div>

                <div className="p-3.5 rounded-lg bg-muted/40 border space-y-1.5">
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                    <ShieldCheck className="size-4 text-blue-500" />
                    Coverage Terms
                  </span>
                  <div className="text-xs space-y-1">
                    <p className="text-muted-foreground">
                      Warranty Period:{" "}
                      <strong className="text-foreground">
                        {vehicle?.warrantyPeriod || "3 Years / 100,000 km"}
                      </strong>
                    </p>
                    <p className="text-muted-foreground">
                      Activation Date:{" "}
                      <span className="font-medium text-foreground">{formattedSaleDate}</span>
                    </p>
                    <p className="text-muted-foreground">
                      Electric Motor No:{" "}
                      <span className="font-mono text-foreground">{vehicle?.motorNumber || "Factory Matched"}</span>
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-muted/20 border text-xs text-muted-foreground flex items-center gap-2">
                <Sparkles className="size-4 text-amber-500 shrink-0" />
                <span>
                  Warranty is linked to Chassis VIN <strong>{vehicle?.chassisNumber}</strong> and valid at all authorized EV service centers.
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Section C (DMT Registration Tracker) */}
        <div className="lg:col-span-5 space-y-6">
          <Card className="border-border/60 shadow-lg bg-card/80 backdrop-blur sticky top-6">
            <CardHeader className="pb-3 border-b border-border/40">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="size-9 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                    <FileCheck2 className="size-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-bold">Section C: DMT Registration Tracker</CardTitle>
                    <CardDescription className="text-xs">
                      Sri Lanka Department of Motor Traffic (RMV / Werahera)
                    </CardDescription>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-4 space-y-5">
              {/* Status Selector */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">DMT Registration Status</Label>
                <Select
                  value={dmtStatus}
                  onValueChange={(val) => setDmtStatus(val as DMTStatus)}
                >
                  <SelectTrigger className="h-10 text-xs">
                    <SelectValue placeholder="Select DMT status..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={DMTStatus.Pending} className="text-xs">
                      🟡 Pending — Awaiting documents from buyer
                    </SelectItem>
                    <SelectItem value={DMTStatus.DocumentsCollected} className="text-xs">
                      🔵 Documents Collected — Ready for submission
                    </SelectItem>
                    <SelectItem value={DMTStatus.Processing} className="text-xs">
                      🟣 Processing — Submitted to DMT Werahera
                    </SelectItem>
                    <SelectItem value={DMTStatus.Completed} className="text-xs">
                      🟢 Completed — Registration plate issued
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Registered License Plate Number */}
              <div className="space-y-1.5">
                <Label htmlFor="reg-plate" className="text-xs font-semibold">
                  Official DMT Registered Number (Plate No.)
                </Label>
                <Input
                  id="reg-plate"
                  placeholder="e.g. WP CAD-4521 or CP EP-9012"
                  value={registeredNumber}
                  onChange={(e) => setRegisteredNumber(e.target.value.toUpperCase())}
                  className="font-mono font-bold text-sm h-10 tracking-wider uppercase bg-muted/30"
                />
                <p className="text-[11px] text-muted-foreground">
                  Enter final vehicle registration number once issued by DMT.
                </p>
              </div>

              <Separator />

              {/* DMT Document Checklist */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    DMT Required Documents Checklist
                  </span>
                  <Badge variant="secondary" className="text-[11px] font-semibold">
                    {completedDocsCount}/4 Collected ({checklistPercentage}%)
                  </Badge>
                </div>

                <div className="space-y-2.5">
                  {/* MTA-2 */}
                  <label
                    htmlFor="chk-mta2"
                    className="flex items-start gap-3 p-3 rounded-lg border bg-muted/20 hover:bg-muted/40 cursor-pointer transition-colors"
                  >
                    <Checkbox
                      id="chk-mta2"
                      checked={hasMTA2}
                      onCheckedChange={setHasMTA2}
                      className="mt-0.5"
                    />
                    <div className="space-y-0.5">
                      <span className="text-xs font-semibold text-foreground block">
                        MTA-2 Application Form
                      </span>
                      <p className="text-[11px] text-muted-foreground">
                        Filled & signed by purchaser with ink signature
                      </p>
                    </div>
                  </label>

                  {/* Customer NIC */}
                  <label
                    htmlFor="chk-nic"
                    className="flex items-start gap-3 p-3 rounded-lg border bg-muted/20 hover:bg-muted/40 cursor-pointer transition-colors"
                  >
                    <Checkbox
                      id="chk-nic"
                      checked={hasNIC}
                      onCheckedChange={setHasNIC}
                      className="mt-0.5"
                    />
                    <div className="space-y-0.5">
                      <span className="text-xs font-semibold text-foreground block">
                        Customer NIC / Passport Certified Copy
                      </span>
                      <p className="text-[11px] text-muted-foreground">
                        Clear copy certified by JP or Grama Niladhari
                      </p>
                    </div>
                  </label>

                  {/* Photos & Stencil */}
                  <label
                    htmlFor="chk-photos"
                    className="flex items-start gap-3 p-3 rounded-lg border bg-muted/20 hover:bg-muted/40 cursor-pointer transition-colors"
                  >
                    <Checkbox
                      id="chk-photos"
                      checked={hasPhotos}
                      onCheckedChange={setHasPhotos}
                      className="mt-0.5"
                    />
                    <div className="space-y-0.5">
                      <span className="text-xs font-semibold text-foreground block">
                        Vehicle Photographs & Pencil Chassis Stencil
                      </span>
                      <p className="text-[11px] text-muted-foreground">
                        Front, rear, and chassis number imprint rubbing
                      </p>
                    </div>
                  </label>

                  {/* TIN Certificate */}
                  <label
                    htmlFor="chk-tin"
                    className="flex items-start gap-3 p-3 rounded-lg border bg-muted/20 hover:bg-muted/40 cursor-pointer transition-colors"
                  >
                    <Checkbox
                      id="chk-tin"
                      checked={hasTIN}
                      onCheckedChange={setHasTIN}
                      className="mt-0.5"
                    />
                    <div className="space-y-0.5">
                      <span className="text-xs font-semibold text-foreground block">
                        Taxpayer Identification Number (TIN) Certificate
                      </span>
                      <p className="text-[11px] text-muted-foreground">
                        Mandatory under Inland Revenue DMT registration guidelines
                      </p>
                    </div>
                  </label>
                </div>
              </div>
            </CardContent>

            <CardFooter className="pt-2 pb-5 border-t border-border/40">
              <Button
                onClick={handleSaveDMT}
                disabled={isPending}
                className="w-full h-11 text-xs font-bold gap-2 bg-purple-600 hover:bg-purple-700 text-white shadow-md"
              >
                {isPending ? (
                  <>
                    <RotateCw className="size-3.5 animate-spin" />
                    Updating DMT Tracker...
                  </>
                ) : (
                  <>
                    <Save className="size-3.5" />
                    Save DMT Registration Status
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  )
}
