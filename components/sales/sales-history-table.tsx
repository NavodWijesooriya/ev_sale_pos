"use client"

import * as React from "react"
import { useState, useMemo } from "react"
import Link from "next/link"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Search,
  Download,
  Calendar,
  User,
  Bike,
  CreditCard,
  Building,
  CheckCircle2,
  Clock,
  Receipt,
  FileSpreadsheet,
  FileText,
  Printer,
  FileCheck2,
} from "lucide-react"
import { PaymentMethod, FinanceStatus, DMTStatus } from "@prisma/client"
import { formatLKR } from "@/lib/currency"

export interface SaleRecordItem {
  id: string
  saleDate: Date | string
  totalAmount: number
  discount?: number
  additionalCharges?: number
  warrantyOption?: string | null
  paymentMethod: PaymentMethod
  status: string
  customer: {
    id: string
    name: string
    phone: string
    email?: string | null
    nic?: string | null
    address?: string | null
  }
  soldBy: {
    id: string
    name?: string | null
    email: string
    role: string
  }
  branch: {
    id: string
    name: string
    location?: string | null
  }
  items: Array<{
    id: string
    price: number
    vehicle: {
      id: string
      chassisNumber: string
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
  dmtRegistration?: {
    id: string
    status: DMTStatus
    registeredNumber?: string | null
  } | null
}

interface SalesHistoryTableProps {
  sales: SaleRecordItem[]
}

export function SalesHistoryTable({ sales }: SalesHistoryTableProps) {
  const [searchQuery, setSearchQuery] = useState("")

  // Filtered sales based on search query
  const filteredSales = useMemo(() => {
    if (!searchQuery.trim()) return sales
    const q = searchQuery.toLowerCase()

    return sales.filter((sale) => {
      const matchCustomer =
        sale.customer.name.toLowerCase().includes(q) ||
        sale.customer.phone.toLowerCase().includes(q) ||
        (sale.customer.nic && sale.customer.nic.toLowerCase().includes(q))

      const matchId = sale.id.toLowerCase().includes(q)
      const matchBranch = sale.branch.name.toLowerCase().includes(q)
      const matchUser = sale.soldBy.name?.toLowerCase().includes(q) || sale.soldBy.email.toLowerCase().includes(q)

      const matchVehicle = sale.items.some(
        (item) =>
          item.vehicle.chassisNumber.toLowerCase().includes(q) ||
          item.vehicle.vehicleModel.brand.toLowerCase().includes(q) ||
          item.vehicle.vehicleModel.modelName.toLowerCase().includes(q)
      )

      const matchFinance =
        sale.financeDetail &&
        sale.financeDetail.financeCompany.toLowerCase().includes(q)

      return matchCustomer || matchId || matchBranch || matchUser || matchVehicle || matchFinance
    })
  }, [sales, searchQuery])

  // Payment badge helper
  const renderPaymentBadge = (method: PaymentMethod) => {
    switch (method) {
      case PaymentMethod.Cash:
        return (
          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
            Cash
          </Badge>
        )
      case PaymentMethod.Card:
        return (
          <Badge variant="outline" className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20">
            Credit/Debit Card
          </Badge>
        )
      case PaymentMethod.BankTransfer:
        return (
          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
            Bank Transfer
          </Badge>
        )
      case PaymentMethod.Finance:
        return (
          <Badge variant="outline" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20">
            Full Finance / Lease
          </Badge>
        )
      case PaymentMethod.SplitPayment:
        return (
          <Badge variant="outline" className="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20">
            Split Payment
          </Badge>
        )
      default:
        return <Badge variant="outline">{method}</Badge>
    }
  }

  // Export filtered sales data to CSV
  const handleExportCSV = () => {
    if (filteredSales.length === 0) return

    const headers = [
      "Sale ID",
      "Date",
      "Customer Name",
      "Customer Phone",
      "Customer NIC",
      "Vehicle Model",
      "Chassis Number (VIN)",
      "Branch",
      "Sales Rep",
      "Payment Method",
      "Total Amount (LKR)",
      "Finance Company",
      "Down Payment (LKR)",
      "Financed Amount (LKR)",
      "Finance Status",
    ]

    const rows = filteredSales.map((s) => {
      const firstItem = s.items[0]
      const vehicleDesc = firstItem
        ? `${firstItem.vehicle.vehicleModel.brand} ${firstItem.vehicle.vehicleModel.modelName}`
        : "N/A"
      const vin = firstItem ? firstItem.vehicle.chassisNumber : "N/A"
      const dateStr = new Date(s.saleDate).toLocaleDateString()

      return [
        `"${s.id}"`,
        `"${dateStr}"`,
        `"${s.customer.name}"`,
        `"${s.customer.phone}"`,
        `"${s.customer.nic || ""}"`,
        `"${vehicleDesc}"`,
        `"${vin}"`,
        `"${s.branch.name}"`,
        `"${s.soldBy.name || s.soldBy.email}"`,
        `"${s.paymentMethod}"`,
        `"${formatLKR(s.totalAmount)}"`,
        `"${s.financeDetail?.financeCompany || ""}"`,
        s.financeDetail ? `"${formatLKR(s.financeDetail.downPaymentPaid)}"` : "",
        s.financeDetail ? `"${formatLKR(s.financeDetail.totalFinanceAmount)}"` : "",
        `"${s.financeDetail?.status || ""}"`,
      ].join(",")
    })

    const csvContent = [headers.join(","), ...rows].join("\n")
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute("download", `ev_sales_report_${new Date().toISOString().split("T")[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <Card className="border-border/60 shadow-sm bg-card/60 backdrop-blur">
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Receipt className="h-5 w-5 text-primary" />
              Completed Vehicle Sales
            </CardTitle>
            <CardDescription>
              Chronological log of vehicle sales, lease settlements, and customer registrations
            </CardDescription>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              disabled={filteredSales.length === 0}
              className="gap-2 text-xs font-semibold h-9"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </div>

        {/* Filter input */}
        <div className="relative mt-2">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by customer name, phone, NIC, VIN, branch, or finance partner..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-10"
          />
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow className="border-border/60">
                <TableHead className="font-semibold text-xs">Date & Time</TableHead>
                <TableHead className="font-semibold text-xs">Customer Profile</TableHead>
                <TableHead className="font-semibold text-xs">EV Bike / Chassis #</TableHead>
                <TableHead className="font-semibold text-xs">Branch & Rep</TableHead>
                <TableHead className="font-semibold text-xs">Payment Method</TableHead>
                <TableHead className="font-semibold text-xs">Finance / Lease</TableHead>
                <TableHead className="font-semibold text-xs text-right">Total Sale Amount</TableHead>
                <TableHead className="font-semibold text-xs text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSales.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-1">
                      <Receipt className="h-8 w-8 text-muted-foreground/50 mb-1" />
                      <p className="font-medium text-sm">No sales records found</p>
                      <p className="text-xs">
                        {searchQuery ? "Try refining your search terms" : "New sales will appear here once finalized."}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredSales.map((sale) => {
                  const saleItem = sale.items[0]
                  const vehicle = saleItem?.vehicle
                  const model = vehicle?.vehicleModel
                  const formattedDate = new Date(sale.saleDate).toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })
                  const formattedTime = new Date(sale.saleDate).toLocaleTimeString(undefined, {
                    hour: "2-digit",
                    minute: "2-digit",
                  })

                  return (
                    <TableRow key={sale.id} className="hover:bg-muted/30 transition-colors border-border/40">
                      {/* Date & Time */}
                      <TableCell className="align-top py-3.5">
                        <div className="flex flex-col">
                          <span className="font-semibold text-xs text-foreground">
                            {formattedDate}
                          </span>
                          <span className="text-[11px] text-muted-foreground">
                            {formattedTime}
                          </span>
                          <span className="text-[10px] font-mono text-muted-foreground mt-0.5">
                            ID: {sale.id.slice(0, 8)}...
                          </span>
                        </div>
                      </TableCell>

                      {/* Customer Details */}
                      <TableCell className="align-top py-3.5">
                        <div className="flex flex-col">
                          <span className="font-semibold text-sm text-foreground">
                            {sale.customer.name}
                          </span>
                          <span className="text-xs font-mono text-muted-foreground">
                            {sale.customer.phone}
                          </span>
                          {sale.customer.nic && (
                            <span className="text-[11px] text-muted-foreground">
                              NIC: {sale.customer.nic}
                            </span>
                          )}
                        </div>
                      </TableCell>

                      {/* Vehicle Spec & Chassis */}
                      <TableCell className="align-top py-3.5">
                        {vehicle && model ? (
                          <div className="flex flex-col">
                            <span className="font-semibold text-xs text-foreground">
                              {model.brand} {model.modelName}
                            </span>
                            <span className="text-xs font-mono font-medium text-emerald-600 dark:text-emerald-400">
                              {vehicle.chassisNumber}
                            </span>
                            {vehicle.color && (
                              <span className="text-[11px] text-muted-foreground capitalize">
                                Color: {vehicle.color}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">Vehicle details not found</span>
                        )}
                      </TableCell>

                      {/* Branch & Rep */}
                      <TableCell className="align-top py-3.5">
                        <div className="flex flex-col">
                          <span className="font-medium text-xs text-foreground">
                            {sale.branch.name}
                          </span>
                          <span className="text-[11px] text-muted-foreground">
                            Rep: {sale.soldBy.name || sale.soldBy.email.split("@")[0]}
                          </span>
                        </div>
                      </TableCell>

                      {/* Payment Method Badge */}
                      <TableCell className="align-top py-3.5">
                        <div className="pt-0.5">
                          {renderPaymentBadge(sale.paymentMethod)}
                        </div>
                      </TableCell>

                      {/* Finance Details if applicable */}
                      <TableCell className="align-top py-3.5">
                        {sale.financeDetail ? (
                          <div className="flex flex-col text-xs space-y-0.5">
                            <span className="font-semibold text-purple-700 dark:text-purple-400">
                              {sale.financeDetail.financeCompany}
                            </span>
                            <span className="text-muted-foreground text-[11px]">
                              Leased: {formatLKR(sale.financeDetail.totalFinanceAmount)}
                            </span>
                            <span className="text-muted-foreground text-[11px]">
                              Down: {formatLKR(sale.financeDetail.downPaymentPaid)}
                            </span>
                            <div className="pt-1">
                              {sale.financeDetail.status === FinanceStatus.Pending ? (
                                <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-600 border-amber-500/20 gap-1">
                                  <Clock className="h-2.5 w-2.5" />
                                  Pending Bank
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20 gap-1">
                                  <CheckCircle2 className="h-2.5 w-2.5" />
                                  Settled
                                </Badge>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>

                      {/* Total Sale Price */}
                      <TableCell className="align-top py-3.5 text-right">
                        <div className="flex flex-col items-end">
                          <span className="font-extrabold text-base text-foreground">
                            {formatLKR(sale.totalAmount)}
                          </span>
                          <Badge variant="secondary" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-none font-semibold">
                            Completed
                          </Badge>
                        </div>
                      </TableCell>

                      {/* Actions: DMT Overview & Printable Invoice */}
                      <TableCell className="align-top py-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5 whitespace-nowrap">
                          <Link href={`/dashboard/sales/${sale.id}`}>
                            <Button
                              variant="secondary"
                              size="sm"
                              className="h-8 gap-1 text-xs font-semibold hover:bg-primary hover:text-white transition-all"
                              title="DMT Registration Tracker & Delivery Handover"
                            >
                              <FileCheck2 className="size-3.5 text-primary-foreground group-hover:text-white" />
                              DMT & Handover
                            </Button>
                          </Link>
                          <Link href={`/dashboard/sales/${sale.id}/invoice`}>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 gap-1.5 text-xs font-semibold hover:bg-primary hover:text-primary-foreground transition-all"
                            >
                              <FileText className="size-3.5" />
                              Invoice
                            </Button>
                          </Link>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
