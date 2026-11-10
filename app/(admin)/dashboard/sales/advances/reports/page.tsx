import { connection } from "next/server"
import { redirect } from "next/navigation"
import { CircleDollarSign, RotateCcw, WalletCards } from "lucide-react"
import {
  getAdvancePayments,
  getRefundedAdvancePayments,
} from "@/app/actions/advances"
import {
  AdvanceRefundsTable,
  AdvanceReportsTable,
} from "@/components/sales/advances/advance-reports-table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { getAuthSession } from "@/lib/auth"
import { formatLKR } from "@/lib/currency"

export const instant = false

export const metadata = {
  title: "Advance Reports | Ev Sale Pos",
  description: "Filter advance payment records and review totals by status",
}

export default async function AdvanceReportsPage() {
  await connection()
  const session = await getAuthSession()
  if (!session?.user?.organizationId) {
    redirect("/login?callbackUrl=/dashboard/sales/advances/reports")
  }

  const [advances, refunds] = await Promise.all([
    getAdvancePayments(),
    getRefundedAdvancePayments(),
  ])
  const summaries = [
    {
      title: "Total Pending (Rs)",
      status: "PENDING",
      icon: WalletCards,
      className: "text-amber-700 dark:text-amber-400",
    },
    {
      title: "Total Used (Rs)",
      status: "USED",
      icon: CircleDollarSign,
      className: "text-emerald-700 dark:text-emerald-400",
    },
  ] as const
  const totalCashRefunded = refunds
    .filter((refund) => refund.paymentMethod === "Cash")
    .reduce((sum, refund) => sum + refund.amount, 0)

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Advance Reports</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Review advance payment totals and filter transactions, including refunded advances.
        </p>
      </header>

      <Tabs defaultValue="overview" className="space-y-5">
        <TabsList aria-label="Advance report views" className="w-full sm:w-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="refunds">Refunds History</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            {summaries.map(({ title, status, icon: Icon, className }) => {
              const matchingAdvances = advances.filter((advance) => advance.status === status)
              const total = matchingAdvances.reduce((sum, advance) => sum + advance.amount, 0)
              return (
                <Card key={status} className="rounded-2xl border-border/70 shadow-sm">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
                    <Icon className={`size-4 ${className}`} />
                  </CardHeader>
                  <CardContent>
                    <p className={`text-2xl font-bold tracking-tight ${className}`}>{formatLKR(total)}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {matchingAdvances.length} {matchingAdvances.length === 1 ? "payment" : "payments"}
                    </p>
                  </CardContent>
                </Card>
              )
            })}
          </div>
          <AdvanceReportsTable advances={advances} />
        </TabsContent>

        <TabsContent value="refunds" className="space-y-5">
          <Card className="rounded-2xl border-destructive/20 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Cash Refunded (Rs.)
              </CardTitle>
              <RotateCcw className="size-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold tracking-tight text-destructive">
                {formatLKR(totalCashRefunded)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {refunds.filter((refund) => refund.paymentMethod === "Cash").length} cash refunds
              </p>
            </CardContent>
          </Card>
          <AdvanceRefundsTable refunds={refunds} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
