import { getAuthSession } from "@/lib/auth"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  CarFront,
  BadgeDollarSign,
  Building2,
  Clock,
  ArrowUpRight,
  Plus,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
} from "lucide-react"
import Link from "next/link"

export const instant = false

export default async function DashboardPage() {
  const session = await getAuthSession()
  const user = session?.user

  const stats = [
    {
      title: "EV Vehicles in Stock",
      value: "42",
      change: "+6 this month",
      icon: CarFront,
      iconColor: "text-blue-500",
      bgColor: "bg-blue-500/10 border-blue-500/20",
    },
    {
      title: "Monthly Sales Revenue",
      value: "$342,850",
      change: "+18.2% from last month",
      icon: BadgeDollarSign,
      iconColor: "text-emerald-500",
      bgColor: "bg-emerald-500/10 border-emerald-500/20",
    },
    {
      title: "Active Showroom Branches",
      value: "3",
      change: "All branches online",
      icon: Building2,
      iconColor: "text-purple-500",
      bgColor: "bg-purple-500/10 border-purple-500/20",
    },
    {
      title: "Pending Finance / Leases",
      value: "5",
      change: "Awaiting bank clearance",
      icon: Clock,
      iconColor: "text-amber-500",
      bgColor: "bg-amber-500/10 border-amber-500/20",
    },
  ]

  const recentTransactions = [
    {
      id: "TX-9021",
      customer: "Sarah Jenkins",
      vehicle: "Volt Motors Apex GT",
      type: "Cash Payment",
      amount: "$48,500",
      status: "Completed",
      date: "Today, 2:15 PM",
    },
    {
      id: "TX-9020",
      customer: "David Chen",
      vehicle: "EcoDrive Terra SUV",
      type: "Bank Finance (Lease)",
      amount: "$56,900",
      status: "Finance Pending",
      date: "Today, 11:30 AM",
    },
    {
      id: "TX-9019",
      customer: "Elena Rostova",
      vehicle: "HyperVolt Pulse",
      type: "Split Down Payment",
      amount: "$29,990",
      status: "Completed",
      date: "Yesterday",
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
            Logged into dealership: <strong className="text-foreground">{user?.organizationName || "VoltPOS Dealership"}</strong>
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link href="/dashboard/inventory">
            <Button size="sm" variant="outline" className="text-xs">
              <CarFront className="mr-1.5 size-3.5" />
              Check Stock
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

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, idx) => {
          const Icon = stat.icon
          return (
            <Card key={idx} className="border border-slate-200/90 dark:border-slate-800 rounded-xl sm:rounded-2xl shadow-xs bg-white dark:bg-slate-900 relative overflow-hidden">
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

      {/* Main Grid: Recent Activity & Multi-Tenant Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Dealership Sales */}
        <Card className="lg:col-span-2 border border-slate-200/90 dark:border-slate-800 rounded-xl sm:rounded-2xl shadow-xs bg-white dark:bg-slate-900">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold">Recent Vehicle Sales</CardTitle>
                <CardDescription className="text-xs">
                  Latest cash and lease transactions recorded across dealership branches
                </CardDescription>
              </div>
              <Link href="/dashboard/sales">
                <Button variant="ghost" size="sm" className="text-xs">
                  View All
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-border/60">
              {recentTransactions.map((tx) => (
                <div key={tx.id} className="py-3 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-foreground">{tx.customer}</span>
                      <span className="text-[10px] text-muted-foreground font-mono">({tx.id})</span>
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {tx.vehicle} • <span className="text-foreground/80">{tx.type}</span>
                    </div>
                  </div>
                  <div className="text-right space-y-0.5">
                    <div className="text-xs font-bold text-foreground font-mono">{tx.amount}</div>
                    <span
                      className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium ${
                        tx.status === "Completed"
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                          : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                      }`}
                    >
                      {tx.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Tenant Isolation Status Card */}
        <Card className="flex flex-col justify-between border border-slate-200/90 dark:border-slate-800 rounded-xl sm:rounded-2xl shadow-xs bg-white dark:bg-slate-900">
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
                  {user?.organizationId ? `${user.organizationId.slice(0, 12)}...` : "Active"}
                </span>
              </div>
              <div className="flex items-center justify-between text-muted-foreground">
                <span>Session Expiry:</span>
                <span className="text-foreground">30 Days (Rolling JWT)</span>
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
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    </div>
  )
}
