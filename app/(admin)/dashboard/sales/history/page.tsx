import { connection } from "next/server"
import { redirect } from "next/navigation"
import { getSalesHistory } from "@/app/actions/sales"
import { SalesHistoryTable } from "@/components/sales/history/sales-history-table"
import { getAuthSession } from "@/lib/auth"

export const instant = false

export const metadata = {
  title: "Sales History | Ev Sale Pos",
  description: "Search and review completed vehicle sales and invoices",
}

export default async function SalesHistoryPage() {
  await connection()
  const session = await getAuthSession()
  if (!session?.user?.organizationId) {
    redirect("/login?callbackUrl=/dashboard/sales/history")
  }

  const result = await getSalesHistory()
  if (!result.success) {
    throw new Error(result.error || "Unable to load sales history.")
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Sales History</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Review completed sales, advance deductions, and printable invoices.
        </p>
      </header>
      <SalesHistoryTable sales={result.data} />
    </div>
  )
}
