"use client"

import * as React from "react"
import Link from "next/link"
import { signOut } from "next-auth/react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  ShieldCheck,
  Building2,
  Bike,
  DollarSign,
  Users,
  Search,
  ExternalLink,
  LogOut,
  Sparkles,
  Layers,
  CheckCircle2,
  AlertCircle,
  Globe,
  RefreshCw,
  HelpCircle,
  Plus,
} from "lucide-react"
import { formatLKR } from "@/lib/currency"
import { CreateDealershipDialog } from "./create-dealership-dialog"

export interface OrganizationRow {
  id: string
  businessName: string
  subdomain: string | null
  domain: string | null
  subscriptionPlan: string
  subscriptionStatus: string
  createdAt: string
  phone: string | null
  usersCount: number
  branchesCount: number
  vehiclesCount: number
  salesCount: number
}

interface SuperAdminViewProps {
  user: {
    name?: string | null
    email?: string | null
    role?: string
  }
  kpis: {
    totalOrganizations: number
    activeVehicles: number
    totalVehicles: number
    totalSalesValue: number
    totalUsers: number
  }
  organizations: OrganizationRow[]
}

export function SuperAdminView({
  user,
  kpis,
  organizations,
}: SuperAdminViewProps) {
  const [searchTerm, setSearchTerm] = React.useState("")
  const [planFilter, setPlanFilter] = React.useState<string>("all")
  const [orgList, setOrgList] = React.useState<OrganizationRow[]>(organizations)
  const [isCreateOpen, setIsCreateOpen] = React.useState(false)

  React.useEffect(() => {
    setOrgList(organizations)
  }, [organizations])

  const filteredOrgs = React.useMemo(() => {
    return orgList.filter((org) => {
      const matchesSearch =
        org.businessName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (org.subdomain && org.subdomain.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (org.phone && org.phone.includes(searchTerm))

      if (!matchesSearch) return false

      if (planFilter === "all") return true
      return org.subscriptionPlan.toLowerCase() === planFilter.toLowerCase()
    })
  }, [orgList, searchTerm, planFilter])

  const renderPlanBadge = (plan: string) => {
    switch (plan) {
      case "Enterprise":
        return (
          <Badge
            variant="outline"
            className="bg-muted text-foreground border-border text-xs font-semibold"
          >
            Enterprise
          </Badge>
        )
      case "Pro":
        return (
          <Badge
            variant="outline"
            className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30 text-xs font-semibold"
          >
            Pro Tier
          </Badge>
        )
      case "Basic":
        return (
          <Badge
            variant="outline"
            className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-xs font-semibold"
          >
            Basic
          </Badge>
        )
      default:
        return (
          <Badge
            variant="outline"
            className="bg-muted text-muted-foreground border-border text-xs"
          >
            Free Trial
          </Badge>
        )
    }
  }

  const renderStatusBadge = (status: string) => {
    return status === "Active" ? (
      <Badge
        variant="outline"
        className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-xs font-semibold"
      >
        <CheckCircle2 className="h-3 w-3 mr-1" />
        Active
      </Badge>
    ) : (
      <Badge
        variant="outline"
        className="bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20 text-xs font-semibold"
      >
        <AlertCircle className="h-3 w-3 mr-1" />
        Suspended
      </Badge>
    )
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Platform Header */}
      <header className="sticky top-0 z-40 border-b bg-card/80 backdrop-blur-md px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-xl bg-primary text-white shadow-md shadow-primary/20">
            <ShieldCheck className="size-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-extrabold tracking-tight text-foreground">
                Ev Sale Pos • Super Admin Control Center
              </span>
              <Badge
                variant="outline"
                className="bg-primary/10 text-primary-foreground dark:text-purple-400 border-primary/30 text-[10px] font-bold"
              >
                PlatformAdmin
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Multi-Tenant EV Dealership Cloud Infrastructure
            </p>
          </div>
        </div>

        {/* User Profile & Sign Out */}
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <div className="text-xs font-bold text-foreground">{user?.name || "Platform Admin"}</div>
            <div className="text-[11px] text-muted-foreground font-mono">{user?.email}</div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Sign Out</span>
          </Button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 p-6 max-w-7xl w-full mx-auto space-y-6">
        {/* Banner */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              Global Platform Overview
              <Sparkles className="h-4 w-4 text-primary-foreground" />
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Live aggregate metrics and tenant dealership accounts across the EV SaaS network.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/admin-portal/help">
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs gap-1.5 border-primary/30 text-primary-foreground dark:text-purple-400 hover:bg-primary/10"
              >
                <HelpCircle className="h-3.5 w-3.5 text-primary-foreground" />
                <span>Super Admin Guide</span>
              </Button>
            </Link>

            <Button
              variant="outline"
              size="sm"
              onClick={() => window.location.reload()}
              className="h-8 text-xs gap-1.5"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Refresh Telemetry</span>
            </Button>
          </div>
        </div>

        {/* 3 Core KPI Cards (Requested) + 1 Platform Health Card */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* KPI 1: Total Registered Organizations */}
          <Card className="relative overflow-hidden border-border/80 shadow-xs hover:border-purple-500/40 transition-colors">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-purple-500" />
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Total Dealerships
              </span>
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary-foreground">
                <Building2 className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent className="space-y-0.5">
              <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground font-mono">
                {kpis.totalOrganizations}
              </div>
              <p className="text-xs text-muted-foreground">
                Registered dealership tenant accounts
              </p>
            </CardContent>
          </Card>

          {/* KPI 2: Total Active Vehicles (across all tenants) */}
          <Card className="relative overflow-hidden border-border/80 shadow-xs hover:border-blue-500/40 transition-colors">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-blue-500" />
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Active EV Bikes
              </span>
              <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500">
                <Bike className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent className="space-y-0.5">
              <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground font-mono">
                {kpis.activeVehicles}{" "}
                <span className="text-sm font-normal text-muted-foreground">in stock</span>
              </div>
              <p className="text-xs text-muted-foreground">
                {kpis.totalVehicles} total EV bikes registered across all tenants
              </p>
            </CardContent>
          </Card>

          {/* KPI 3: Total Sales Value (across all tenants) */}
          <Card className="relative overflow-hidden border-border/80 shadow-xs hover:border-emerald-500/40 transition-colors">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-emerald-500" />
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Total Sales Value
              </span>
              <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                <DollarSign className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent className="space-y-0.5">
              <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-emerald-600 dark:text-emerald-400 font-mono">
                {formatLKR(kpis.totalSalesValue)}
              </div>
              <p className="text-xs text-muted-foreground">
                Gross transaction volume processed
              </p>
            </CardContent>
          </Card>

          {/* KPI 4: Total Platform Users */}
          <Card className="relative overflow-hidden border-border/80 shadow-xs hover:border-cyan-500/40 transition-colors">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-cyan-500" />
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Tenant Workforce
              </span>
              <div className="h-8 w-8 rounded-lg bg-cyan-500/10 flex items-center justify-center text-cyan-500">
                <Users className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent className="space-y-0.5">
              <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground font-mono">
                {kpis.totalUsers}
              </div>
              <p className="text-xs text-muted-foreground">
                Active dealership staff logins across all tenants
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Organizations Data Table Card */}
        <Card className="shadow-xs border-border/80">
          <CardHeader className="pb-3 border-b">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-primary-foreground" />
                  Registered Dealership Organizations
                </CardTitle>
                <CardDescription className="text-xs">
                  All active tenant databases, subdomains, and subscription tiers
                </CardDescription>
              </div>

              {/* Right actions: Plan Filter + Add Dealership Button */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  {[
                    { id: "all", label: "All Plans" },
                    { id: "enterprise", label: "Enterprise" },
                    { id: "pro", label: "Pro" },
                    { id: "basic", label: "Basic" },
                    { id: "free", label: "Free" },
                  ].map((plan) => (
                    <Button
                      key={plan.id}
                      size="sm"
                      variant={planFilter === plan.id ? "default" : "outline"}
                      className="h-7 px-2.5 text-xs font-medium"
                      onClick={() => setPlanFilter(plan.id)}
                    >
                      {plan.label}
                    </Button>
                  ))}
                </div>

                <Button
                  onClick={() => setIsCreateOpen(true)}
                  className="h-7 px-3 text-xs font-semibold bg-primary hover:bg-purple-700 text-white gap-1.5 shadow-xs rounded-md cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add New Dealership
                </Button>
              </div>
            </div>

            {/* Search Box */}
            <div className="pt-2">
              <div className="relative max-w-sm">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search organization by name, subdomain, or phone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 h-8 text-xs"
                />
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {filteredOrgs.length === 0 ? (
              <div className="py-12 text-center text-xs text-muted-foreground">
                No organization accounts match the current filter.
              </div>
            ) : (
              <div className="overflow-x-auto w-full">
                <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow>
                    <TableHead className="text-xs font-semibold">Business Name</TableHead>
                    <TableHead className="text-xs font-semibold">Subdomain / Domain</TableHead>
                    <TableHead className="text-xs font-semibold">Subscription Plan</TableHead>
                    <TableHead className="text-xs font-semibold text-center">Status</TableHead>
                    <TableHead className="text-xs font-semibold text-center">Branches</TableHead>
                    <TableHead className="text-xs font-semibold text-center">EV Bikes</TableHead>
                    <TableHead className="text-xs font-semibold text-center">Staff</TableHead>
                    <TableHead className="text-xs font-semibold">Created Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrgs.map((org) => (
                    <TableRow key={org.id} className="hover:bg-muted/40 transition-colors">
                      {/* Business Name */}
                      <TableCell className="text-xs">
                        <div className="font-bold text-foreground flex items-center gap-1.5">
                          {org.businessName}
                        </div>
                        {org.phone && (
                          <div className="text-[11px] text-muted-foreground font-mono">
                            {org.phone}
                          </div>
                        )}
                      </TableCell>

                      {/* Subdomain */}
                      <TableCell className="text-xs">
                        {org.subdomain ? (
                          <div className="flex items-center gap-1 font-mono text-primary font-semibold">
                            <Globe className="h-3 w-3 shrink-0 text-muted-foreground" />
                            <span>{org.subdomain}.evdealership.com</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground font-mono">—</span>
                        )}
                      </TableCell>

                      {/* Subscription Plan */}
                      <TableCell className="text-xs">
                        {renderPlanBadge(org.subscriptionPlan)}
                      </TableCell>

                      {/* Subscription Status */}
                      <TableCell className="text-xs text-center">
                        {renderStatusBadge(org.subscriptionStatus)}
                      </TableCell>

                      {/* Branches Count */}
                      <TableCell className="text-xs text-center font-mono">
                        <Badge variant="outline" className="text-[11px]">
                          {org.branchesCount}
                        </Badge>
                      </TableCell>

                      {/* Vehicles Count */}
                      <TableCell className="text-xs text-center font-mono">
                        <Badge variant="outline" className="text-[11px]">
                          {org.vehiclesCount}
                        </Badge>
                      </TableCell>

                      {/* Staff Count */}
                      <TableCell className="text-xs text-center font-mono">
                        <Badge variant="outline" className="text-[11px]">
                          {org.usersCount}
                        </Badge>
                      </TableCell>

                      {/* Created Date */}
                      <TableCell className="text-xs font-mono text-muted-foreground whitespace-nowrap">
                        {new Date(org.createdAt).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
        </Card>
      </main>

      {/* Create Dealership Dialog */}
      <CreateDealershipDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onSuccess={(newOrg) => {
          setOrgList((prev) => [newOrg, ...prev])
        }}
      />

      {/* Footer */}
      <footer className="border-t py-4 px-6 text-center text-[11px] text-muted-foreground">
        Ev Sale Pos Multi-Tenant Platform • Control Center v1.0
      </footer>
    </div>
  )
}

