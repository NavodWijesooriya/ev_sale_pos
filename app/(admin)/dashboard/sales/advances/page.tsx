import { redirect } from "next/navigation"
import {
  getAdvancePaymentFormOptions,
  getAdvancePayments,
} from "@/app/actions/advances"
import { AdvanceTable } from "@/components/sales/advances/advance-table"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { formatLKR } from "@/lib/currency"
import { getAuthSession } from "@/lib/auth"
import { CircleDollarSign, Clock3, RotateCcw } from "lucide-react"

export const instant = false

export const metadata = {
  title: "Advance Payments | Ev Sale Pos",
  description: "Manage customer advance payments",
}

export default async function AdvancesPage() {
  const session = await getAuthSession()
  if (!session?.user?.organizationId) {
    redirect("/login?callbackUrl=/dashboard/sales/advances")
  }

  const [advances, options] = await Promise.all([
    getAdvancePayments(),
    getAdvancePaymentFormOptions(),
  ])

  const pendingAdvances = advances.filter((advance) => advance.status === "PENDING")
  const refundedAdvances = advances.filter((advance) => advance.status === "REFUNDED")
  const usedAdvances = advances.filter((advance) => advance.status === "USED")
  const summaries = [
    {
      title: "Total Pending Advances",
      total: pendingAdvances.reduce((sum, advance) => sum + advance.amount, 0),
      count: pendingAdvances.length,
      icon: Clock3,
      color: "text-amber-600 dark:text-amber-400",
      iconColor: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    },
    {
      title: "Total Refunded",
      total: refundedAdvances.reduce((sum, advance) => sum + advance.amount, 0),
      count: refundedAdvances.length,
      icon: RotateCcw,
      color: "text-slate-700 dark:text-slate-300",
      iconColor: "bg-slate-500/10 text-slate-600 dark:text-slate-300",
    },
    {
      title: "Total Used",
      total: usedAdvances.reduce((sum, advance) => sum + advance.amount, 0),
      count: usedAdvances.length,
      icon: CircleDollarSign,
      color: "text-emerald-700 dark:text-emerald-400",
      iconColor: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Advance Payments</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Record and track customer advance payments.
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {summaries.map(({ title, total, count, icon: Icon, color, iconColor }) => (
          <Card key={title} className="rounded-2xl border-border/70 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
              <span className={`flex size-9 items-center justify-center rounded-xl ${iconColor}`}>
                <Icon className="size-4" />
              </span>
            </CardHeader>
            <CardContent>
              <p className={`text-2xl font-bold tracking-tight ${color}`}>{formatLKR(total)}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {count} {count === 1 ? "payment" : "payments"}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <AdvanceTable
        advances={advances}
        customers={options.customers}
        branches={options.branches}
      />
    </div>
  )
}
