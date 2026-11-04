import { getRegisteredDealerships } from "@/app/actions/dealership"
import { prisma } from "@/lib/prisma"
import { formatLKR } from "@/lib/currency"
import { DealershipForm } from "@/components/super-admin/dealership-form"
import { DealershipTable } from "@/components/super-admin/dealership-table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  ShieldAlert,
  Building2,
  CheckCircle2,
  Users,
  Zap,
  Bike,
  ArrowLeft,
  Sparkles,
  HelpCircle,
} from "lucide-react"
import Link from "next/link"

export const instant = false

export const metadata = {
  title: "Super Admin Platform Console | Ev Sale Pos",
  description: "Platform owner console to onboard and manage EV dealership tenants",
}

export default async function SuperAdminPage() {
  const [organizations, salesAgg, activeVehiclesCount] = await Promise.all([
    getRegisteredDealerships(),
    prisma.sale.aggregate({ _sum: { totalAmount: true } }),
    prisma.vehicle.count({ where: { status: "InStock" } }),
  ])

  const totalTenants = organizations.length
  const totalSalesValue = salesAgg._sum.totalAmount || 0
  const totalBranches = organizations.reduce(
    (sum, o) => sum + (o._count?.branches || 0),
    0
  )

  const stats = [
    {
      title: "Total Registered Dealerships",
      value: totalTenants.toString(),
      description: "Provisioned SaaS tenants",
      icon: Building2,
      color: "text-primary-foreground",
      bg: "bg-primary/10 border-primary/20",
    },
    {
      title: "Active EV Bikes In Stock",
      value: `${activeVehiclesCount} units`,
      description: "Across all tenant showrooms",
      icon: Bike,
      color: "text-blue-500",
      bg: "bg-blue-500/10 border-blue-500/20",
    },
    {
      title: "Total Platform Sales",
      value: formatLKR(totalSalesValue),
      description: "Gross volume processed in LKR",
      icon: Zap,
      color: "text-emerald-500",
      bg: "bg-emerald-500/10 border-emerald-500/20",
    },
    {
      title: "Active Showrooms",
      value: totalBranches.toString(),
      description: "Connected physical branches",
      icon: Users,
      color: "text-cyan-500",
      bg: "bg-cyan-500/10 border-cyan-500/20",
    },
  ]

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Top Super Admin Navigation Header */}
      <header className="sticky top-0 z-30 border-b bg-card/80 backdrop-blur-md px-4 sm:px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-blue-600 flex items-center justify-center text-white shadow-md shadow-primary/20">
            <ShieldAlert className="size-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm tracking-tight text-foreground">
                Ev Sale Pos Platform Control Plane
              </span>
              <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary-foreground dark:text-purple-400 border-primary/20">
                Super Admin
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Multi-Tenant Dealership Management & Onboarding
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/admin-portal/help">
            <Button variant="outline" size="sm" className="text-xs h-8 gap-1.5 border-primary/30 text-primary-foreground dark:text-purple-400 hover:bg-primary/10">
              <HelpCircle className="size-3.5 text-primary-foreground" />
              <span>Super Admin Guide</span>
            </Button>
          </Link>
          <Link href="/dashboard">
            <Button variant="outline" size="sm" className="text-xs h-8">
              <ArrowLeft className="mr-1.5 size-3.5" />
              Dealership ERP Dashboard
            </Button>
          </Link>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        {/* Intro Banner */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              Platform Tenants & Dealership Onboarding
            </h1>
            <p className="text-xs text-muted-foreground mt-1">
              Register new EV Dealerships, assign subscription tiers, and create root OrgAdmin credentials with strict database isolation.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-lg border">
            <Sparkles className="size-3.5 text-blue-500" />
            <span>Prisma Multi-Tenant Isolation Active</span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, idx) => {
            const Icon = stat.icon
            return (
              <Card key={idx} className="border-border shadow-xs">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-xs font-medium text-muted-foreground">
                    {stat.title}
                  </CardTitle>
                  <div className={`p-2 rounded-lg border ${stat.bg}`}>
                    <Icon className={`size-4 ${stat.color}`} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold tracking-tight text-foreground">
                    {stat.value}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    {stat.description}
                  </p>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Section A: Registration Form */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold tracking-tight text-foreground">
                Section A: Onboard New Dealership
              </h2>
              <p className="text-xs text-muted-foreground">
                Fill in the details below to provision a new tenant instance.
              </p>
            </div>
          </div>
          <DealershipForm />
        </section>

        {/* Section B: Registered Dealerships Table */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold tracking-tight text-foreground">
                Section B: Registered Dealerships
              </h2>
              <p className="text-xs text-muted-foreground">
                All organizations currently provisioned on the platform.
              </p>
            </div>
          </div>
          <DealershipTable initialOrganizations={organizations} />
        </section>
      </main>
    </div>
  )
}

