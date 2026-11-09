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
  Users2,
  User,
  Phone,
  Mail,
  FileText,
  Coins,
  Bike,
  ArrowRight,
  Sparkles,
  TrendingUp,
  MapPin,
  Calendar,
} from "lucide-react"
import { CustomerSummaryItem } from "@/app/actions/customers"
import { AddCustomerDialog } from "@/components/customers/add-customer-dialog"
import { EditCustomerDialog } from "@/components/customers/edit-customer-dialog"
import { formatLKR } from "@/lib/currency"
import { CustomerType } from "@prisma/client"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface CustomerDirectoryProps {
  customers: CustomerSummaryItem[]
  dealershipName: string
  customerType?: CustomerType
}

export function CustomerDirectory({
  customers,
  dealershipName,
  customerType,
}: CustomerDirectoryProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [activeCategory, setActiveCategory] = useState("all")

  const filteredCustomers = useMemo(() => {
    const q = searchQuery.toLowerCase()

    return customers.filter(
      (c) => {
        const matchesCategory =
          activeCategory === "all" ||
          (activeCategory === "sale" && c.customerType === CustomerType.SALE) ||
          (activeCategory === "crm" && c.customerType === CustomerType.CRM)
        const matchesCustomerType = !customerType || c.customerType === customerType
        const matchesSearch =
          !q ||
          c.name.toLowerCase().includes(q) ||
          c.phone.toLowerCase().includes(q) ||
          (c.nic && c.nic.toLowerCase().includes(q)) ||
          (c.email && c.email.toLowerCase().includes(q)) ||
          (c.address && c.address.toLowerCase().includes(q))

        return matchesCustomerType && matchesCategory && matchesSearch
      },
    )
  }, [activeCategory, customerType, customers, searchQuery])

  const totalCustomers = customers.length
  const saleCustomers = customers.filter(
    (customer) => customer.customerType === CustomerType.SALE,
  ).length
  const crmCustomers = customers.filter(
    (customer) => customer.customerType === CustomerType.CRM,
  ).length
  const totalVehiclesPurchased = customers.reduce(
    (sum, c) => sum + c.totalPurchases,
    0
  )
  const totalLifetimeValue = customers.reduce((sum, c) => sum + c.totalSpent, 0)
  const activeServiceClients = customers.filter((c) => c.totalServices > 0).length

  // Export to CSV
  const handleExportCSV = () => {
    if (filteredCustomers.length === 0) return

    const headers = [
      "Customer ID",
      "Category",
      "Full Name",
      "Phone Number",
      "NIC / Passport",
      "Email Address",
      "Address",
      "Total Vehicles Purchased",
      "Total Services",
      "Total Spent (LKR)",
    ]

    const rows = filteredCustomers.map((c) => [
      `"${c.id}"`,
      c.customerType === CustomerType.SALE ? "Sale Customer" : "CRM Lead",
      `"${c.name}"`,
      `"${c.phone}"`,
      `"${c.nic || ""}"`,
      `"${c.email || ""}"`,
      `"${(c.address || "").replace(/"/g, '""')}"`,
      c.totalPurchases,
      c.totalServices,
      c.totalSpent,
    ])

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n")
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute("download", `ev_crm_customers_${new Date().toISOString().split("T")[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((part) => part[0])
      .slice(0, 2)
      .join("")
      .toUpperCase()
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              {customerType === CustomerType.CRM
                ? "CRM Customers"
                : customerType === CustomerType.SALE
                  ? "Sale Customers"
                  : "Customer Management"}
            </h1>
            <Badge variant="outline" className="text-xs font-semibold bg-blue-500/10 text-blue-600 border-blue-500/20">
              Dealership CRM
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Manage direct customers and CRM leads, view purchase histories, and track relationships for{" "}
            <span className="font-semibold text-foreground">{dealershipName}</span>.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {!customerType && <AddCustomerDialog />}
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            disabled={filteredCustomers.length === 0}
            className="h-9 gap-2 text-xs font-semibold"
          >
            <Download className="size-4" />
            Export CRM CSV
          </Button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border/60 shadow-sm bg-card/60 backdrop-blur">
          <CardContent className="p-4 sm:p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Total Customers
              </p>
              <h3 className="text-xl sm:text-2xl font-black text-foreground mt-1">
                {totalCustomers}
              </h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Direct customers and CRM records
              </p>
            </div>
            <div className="size-10 sm:size-12 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Users2 className="size-5 sm:size-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-sm bg-card/60 backdrop-blur">
          <CardContent className="p-4 sm:p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                EV Bikes Owned
              </p>
              <h3 className="text-xl sm:text-2xl font-black text-foreground mt-1">
                {totalVehiclesPurchased}
              </h3>
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1 mt-0.5">
                <Bike className="size-3" />
                Delivered EV bikes
              </p>
            </div>
            <div className="size-10 sm:size-12 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Bike className="size-5 sm:size-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-sm bg-card/60 backdrop-blur">
          <CardContent className="p-4 sm:p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Customer LTV
              </p>
              <h3 className="text-xl sm:text-2xl font-black text-foreground mt-1">
                {formatLKR(totalLifetimeValue)}
              </h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Total lifetime revenue
              </p>
            </div>
            <div className="size-10 sm:size-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Coins className="size-5 sm:size-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-sm bg-card/60 backdrop-blur">
          <CardContent className="p-4 sm:p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Active Service Clients
              </p>
              <h3 className="text-xl sm:text-2xl font-black text-foreground mt-1">
                {activeServiceClients}
              </h3>
              <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium mt-0.5">
                Workshop retention
              </p>
            </div>
            <div className="size-10 sm:size-12 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Sparkles className="size-5 sm:size-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Customers Table Card */}
      <Card className="border-border/60 shadow-sm bg-card/60 backdrop-blur">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Users2 className="size-5 text-primary" />
                Customers & CRM
              </CardTitle>
              <CardDescription className="text-xs">
                Filter by customer category, inspect profiles, and review activity
              </CardDescription>
            </div>
          </div>

          {!customerType && (
            <Tabs
              value={activeCategory}
              onValueChange={setActiveCategory}
              className="mt-4"
            >
              <TabsList className="grid h-auto w-full grid-cols-3 sm:inline-grid sm:w-auto">
                <TabsTrigger value="all" className="gap-1.5 px-3 py-2 text-xs">
                  All Customers <span className="text-muted-foreground">({totalCustomers})</span>
                </TabsTrigger>
                <TabsTrigger value="sale" className="gap-1.5 px-3 py-2 text-xs">
                  Sale Customers <span className="text-muted-foreground">({saleCustomers})</span>
                </TabsTrigger>
                <TabsTrigger value="crm" className="gap-1.5 px-3 py-2 text-xs">
                  CRM Leads <span className="text-muted-foreground">({crmCustomers})</span>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          )}

          {/* Search bar */}
          <div className="relative mt-3">
            <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
            <Input
              placeholder="Search by customer name, phone number, NIC, or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-10 text-xs"
            />
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow className="border-border/60">
                  <TableHead className="font-semibold text-xs">Customer</TableHead>
                  <TableHead className="font-semibold text-xs">Category</TableHead>
                  <TableHead className="font-semibold text-xs">Phone Number</TableHead>
                  <TableHead className="font-semibold text-xs">NIC / Passport</TableHead>
                  <TableHead className="font-semibold text-xs">Email Address</TableHead>
                  <TableHead className="font-semibold text-xs text-center">Bikes Owned</TableHead>
                  <TableHead className="font-semibold text-xs text-right">Lifetime Spent</TableHead>
                  <TableHead className="font-semibold text-xs text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCustomers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                      <div className="flex flex-col items-center justify-center gap-1">
                        <Users2 className="size-8 text-muted-foreground/40 mb-1" />
                        <p className="font-semibold text-sm">No customers found</p>
                        <p className="text-xs">
                          {searchQuery
                            ? "Try refining your search keyword"
                            : "New customers are registered during POS vehicle sales."}
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCustomers.map((c) => (
                    <TableRow key={c.id} className="hover:bg-muted/30 transition-colors border-border/40">
                      {/* Name & Avatar */}
                      <TableCell className="align-middle py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="size-9 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center shrink-0">
                            {getInitials(c.name)}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-bold text-sm text-foreground">{c.name}</span>
                            {c.address && (
                              <span className="text-[11px] text-muted-foreground line-clamp-1 max-w-[200px]">
                                {c.address}
                              </span>
                            )}
                          </div>
                        </div>
                      </TableCell>

                      <TableCell className="align-middle py-3.5">
                        <Badge
                          variant="outline"
                          className={
                            c.customerType === CustomerType.SALE
                              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                              : "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-400"
                          }
                        >
                          {c.customerType === CustomerType.SALE ? "Sale Customer" : "CRM Lead"}
                        </Badge>
                      </TableCell>

                      {/* Phone */}
                      <TableCell className="align-middle py-3.5 font-mono text-xs font-medium text-foreground">
                        {c.phone}
                      </TableCell>

                      {/* NIC */}
                      <TableCell className="align-middle py-3.5 font-mono text-xs text-muted-foreground">
                        {c.nic ? (
                          <span className="font-semibold text-foreground">{c.nic}</span>
                        ) : (
                          "—"
                        )}
                      </TableCell>

                      {/* Email */}
                      <TableCell className="align-middle py-3.5 text-xs text-muted-foreground">
                        {c.email || "—"}
                      </TableCell>

                      {/* EVs Owned */}
                      <TableCell className="align-middle py-3.5 text-center">
                        <Badge
                          variant="secondary"
                          className="font-bold text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-none"
                        >
                          {c.totalPurchases} Unit{c.totalPurchases !== 1 ? "s" : ""}
                        </Badge>
                      </TableCell>

                      {/* Total Spent */}
                      <TableCell className="align-middle py-3.5 text-right font-mono font-bold text-sm text-foreground">
                        {formatLKR(c.totalSpent)}
                      </TableCell>

                      {/* Action */}
                      <TableCell className="align-middle py-3.5 text-right whitespace-nowrap">
                        <div className="flex justify-end gap-2">
                          <EditCustomerDialog customer={c} compact />
                          <Link href={`/dashboard/customers/${c.id}`}>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 gap-1.5 text-xs font-semibold hover:bg-primary hover:text-primary-foreground transition-all whitespace-nowrap"
                            >
                              View Profile
                              <ArrowRight className="size-3.5" />
                            </Button>
                          </Link>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
