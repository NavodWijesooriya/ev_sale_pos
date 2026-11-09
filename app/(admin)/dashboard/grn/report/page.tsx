import { redirect } from "next/navigation"
import { getGRNReport } from "@/app/actions/grn"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { GRNReportTable } from "@/components/grn/grn-report-table"
import { getAuthSession } from "@/lib/auth"

export const instant = false

export const metadata = {
  title: "GRN Report | Ev Sale Pos",
  description: "Review Goods Received Notes and received bike counts",
}

export default async function GRNReportPage() {
  const session = await getAuthSession()
  if (!session?.user?.organizationId) {
    redirect("/login?callbackUrl=/dashboard/grn/report")
  }

  const result = await getGRNReport()
  if (!result.success) throw new Error(result.error)

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle>GRN Report</CardTitle>
            <CardDescription>Goods received notes for {session.user.organizationName || "your dealership"}.</CardDescription>
          </div>
          <Badge variant="secondary">{result.data.length} GRNs</Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <GRNReportTable grns={result.data} />
      </CardContent>
    </Card>
  )
}
