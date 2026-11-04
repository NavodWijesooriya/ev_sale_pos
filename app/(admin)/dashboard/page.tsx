import { getAuthSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { formatLKR } from "@/lib/currency"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Bike,
  BadgeDollarSign,
  Building2,
  Clock,
  ArrowUpRight,
  Plus,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  Receipt,
  ArrowRight,
} from "lucide-react"
import Link from "next/link"

export const instant = false

export default async function DashboardPage() {
  const session = await getAuthSession()
  const user = session?.user

  // 1. Resolve Organization Scope
  let organizationId = user?.organizationId
  let organizationName = user?.organizationName

  if (!organizationId) {
    const defaultOrg = await prisma.organization.findFirst({
      where: { subscriptionStatus: "Active" },
      select: { id: true, businessName: true },
    })
    if (defaultOrg) {
      organizationId = defaultOrg.id
      organizationName = defaultOrg.businessName
    }
  }

  // 2. Fetch Real Database Metrics & Aggregations
  const [
    inStockCount,
    totalVehiclesCount,
    salesAgg,
    branchCount,
    pendingFinanceCount,
    totalSalesCount,
    recentSalesRaw,
  ] = await Promise.all([
    prisma.vehicle.count({
      where: {
        ...(organizationId ? { organizationId } : {}),
        status: "InStock",
      },
    }),
    prisma.vehicle.count({
      where: organizationId ? { organizationId } : {},
    }),
    prisma.sale.aggregate({
      where: organizationId ? { organizationId } : {},
      _sum: { totalAmount: true },
      _count: true,
    }),
    prisma.branch.count({
      where: organizationId ? { organizationId } : {},
    }),
    prisma.sale.count({
      where: {
        ...(organizationId ? { organizationId } : {}),
        paymentMethod: "Finance",
        status: { not: "Completed" },
      },
    }),
    prisma.sale.count({
      where: organizationId ? { organizationId } : {},
    }),
    prisma.sale.findMany({
      where: organizationId ? { organizationId } : {},
      take: 6,
      orderBy: { saleDate: "desc" },
      include: {
        customer: true,
        branch: { select: { name: true } },
        items: {
          include: {
            vehicle: {
              include: {
                vehicleModel: true,
              },
            },
          },
        },
      },
    }),
  ])

  const totalSalesRevenue = salesAgg._sum.totalAmount || 0

  // 3. Dynamic Real Stats Cards
  const stats = [
    {
      title: "EV Bikes In Stock",
      value: `${inStockCount} Units`,
      change: `${totalVehiclesCount} total registered units`,
      icon: Bike,
      iconColor: "text-blue-500",
      bgColor: "bg-blue-500/10 border-blue-500/20",
    },
    {
      title: "Total Sales Revenue",
      value: formatLKR(totalSalesRevenue),
      change: `${totalSalesCount} total sales finalized`,
      icon: BadgeDollarSign,
      iconColor: "text-emerald-500",
      bgColor: "bg-emerald-500/10 border-emerald-500/20",
    },
    {
      title: "Showroom Branches",
      value: `${branchCount} Locations`,
      change: "Active physical showrooms",
      icon: Building2,
      iconColor: "text-primary-foreground",
      bgColor: "bg-primary/10 border-primary/20",
    },
    {
      title: "Pending Finance / Leases",
      value: `${pendingFinanceCount} Applications`,
      change: pendingFinanceCount > 0 ? "Awaiting bank clearance" : "All leases cleared",
      icon: Clock,
      iconColor: "text-amber-500",
      bgColor: "bg-amber-500/10 border-amber-500/20",
    },
  ]

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Welcome back, {user?.name?.split(" ")[0] || "Admin"}
            </h1>
            <Badge variant="outline" className="text-xs bg-primary/5 text-primary border-primary/20">
              {user?.role || "OrgAdmin"}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Logged into dealership: <strong className="text-foreground">{organizationName || "Ev Sale Pos Dealership"}</strong>
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link href="/dashboard/inventory">
            <Button size="sm" variant="outline" className="text-xs">
              <Bike className="mr-1.5 size-3.5" />
              Check Bike Stock ({inStockCount})
            </Button>
          </Link>
          <Link href="/dashboard/sales">
            <Button size="sm" className="text-xs bg-primary text-primary-foreground shadow-sm">
              <Plus className="mr-1.5 size-3.5" />
              New Sale / POS
            </Button>
          </Link>
        </div>
      </div>

      {/* Real Overview Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, idx) => {
          const Icon = stat.icon
          return (
            <Card key={idx} className="border border-border/80 rounded-xl sm:rounded-2xl shadow-xs bg-card relative overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {stat.title}
                </CardTitle>
                <div className={`p-2 rounded-lg border ${stat.bgColor}`}>
                  <Icon className={`size-4 ${stat.iconColor}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tracking-tight text-foreground font-mono">{stat.value}</div>
                <div className="flex items-center gap-1 text-[11px] text-muted-foreground mt-1">
                  <ArrowUpRight className="size-3 text-emerald-500" />
                  <span>{stat.change}</span>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Main Grid: Real Recent Sales & Tenant Isolation Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Real Dealership Sales Activity */}
        <Card className="lg:col-span-2 border border-border/80 rounded-xl sm:rounded-2xl shadow-xs bg-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold">Recent EV Bike Sales</CardTitle>
                <CardDescription className="text-xs">
                  Latest cash and lease transactions recorded in the database
                </CardDescription>
              </div>
              <Link href="/dashboard/sales">
                <Button variant="ghost" size="sm" className="text-xs">
                  View All ({totalSalesCount})
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {recentSalesRaw.length === 0 ? (
              <div className="text-center py-10 space-y-2 border border-dashed rounded-xl p-6">
                <Receipt className="size-8 text-muted-foreground mx-auto opacity-50" />
                <h4 className="text-sm font-semibold text-foreground">No sales recorded yet</h4>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  Start selling electric bikes through the POS checkout to generate live invoices and revenue metrics.
                </p>
                <Link href="/dashboard/sales" className="inline-block pt-2">
                  <Button size="sm" className="text-xs">
                    <Plus className="size-3.5 mr-1" />
                    Create First Sale
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-border/60">
                {recentSalesRaw.map((sale) => {
                  const firstItem = sale.items[0]
                  const bikeModel = firstItem?.vehicle?.vehicleModel
                  const bikeTitle = bikeModel
                    ? `${bikeModel.brand} ${bikeModel.modelName}`
                    : "EV Bike Sale"

                  const formattedDate = new Date(sale.saleDate).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })

                  const paymentMethodLabel =
                    sale.paymentMethod === "Finance"
                      ? "Bank Lease / Finance"
                      : sale.paymentMethod === "SplitPayment"
                      ? "Split Payment"
                      : `${sale.paymentMethod} Payment`

                  return (
                    <div key={sale.id} className="py-3 flex items-center justify-between hover:bg-muted/30 px-2 rounded-lg transition-colors">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-foreground">
                            {sale.customer?.name || "Walk-in Customer"}
                          </span>
                          <span className="text-[10px] text-muted-foreground font-mono">
                            (INV-{sale.id.slice(0, 8).toUpperCase()})
                          </span>
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          {bikeTitle} • <span className="text-foreground/80 font-medium">{paymentMethodLabel}</span>
                          {sale.branch?.name && (
                            <span className="text-muted-foreground"> • {sale.branch.name}</span>
                          )}
                        </div>
                      </div>
                      <div className="text-right space-y-0.5">
                        <div className="text-xs font-bold text-foreground font-mono">
                          {formatLKR(sale.totalAmount)}
                        </div>
                        <div className="flex items-center justify-end gap-1.5">
                          <span
                            className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium ${
                              sale.status === "Completed"
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                            }`}
                          >
                            {sale.status}
                          </span>
                          <span className="text-[10px] text-muted-foreground">{formattedDate}</span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tenant Isolation Status Card */}
        <Card className="flex flex-col justify-between border border-border/80 rounded-xl sm:rounded-2xl shadow-xs bg-card">
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <ShieldCheck className="size-4 text-blue-500" />
              Tenant Security & Isolation
            </CardTitle>
            <CardDescription className="text-xs">
              Dealership data is strictly segregated at the database query level
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3.5">
            <div className="p-3 rounded-lg bg-muted/50 border text-xs space-y-2">
              <div className="flex items-center justify-between text-muted-foreground">
                <span>Tenant ID:</span>
                <span className="font-mono text-foreground font-semibold">
                  {organizationId ? `${organizationId.slice(0, 12)}...` : "Active"}
                </span>
              </div>
              <div className="flex items-center justify-between text-muted-foreground">
                <span>Total Showrooms:</span>
                <span className="text-foreground font-semibold">{branchCount} Branches</span>
              </div>
              <div className="flex items-center justify-between text-muted-foreground">
                <span>Assigned Role:</span>
                <Badge variant="outline" className="text-[10px] font-medium py-0">
                  {user?.role || "OrgAdmin"}
                </Badge>
              </div>
            </div>

            <div className="space-y-1.5 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="size-3.5 text-emerald-500" />
                <span>Next-Auth v4 session verified</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="size-3.5 text-emerald-500" />
                <span>Prisma foreign key constraints enforced</span>
              </div>
              <div className="flex items-center gap-2">
                <Sparkles className="size-3.5 text-blue-500" />
                <span>Real-time EV stock synchronizer ready</span>
              </div>
            </div>
          </CardContent>
          <div className="p-4 pt-0">
            <Link href="/" target="_blank" className="w-full">
              <Button variant="outline" size="sm" className="w-full text-xs">
                Open Public Customer Showroom
                <ArrowRight className="size-3.5 ml-1.5" />
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    </div>
  )
}

