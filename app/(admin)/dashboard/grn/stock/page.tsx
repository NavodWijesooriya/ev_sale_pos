import { redirect } from "next/navigation"
import { getAvailableBikeStock } from "@/app/actions/grn"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BikeStockTable } from "@/components/grn/bike-stock-table"
import { getAuthSession } from "@/lib/auth"

export const instant = false

export const metadata = {
  title: "Current Bike Stock | Ev Sale Pos",
  description: "View all available EV bikes in dealership inventory",
}

export default async function CurrentBikeStockPage() {
  const session = await getAuthSession()
  if (!session?.user?.organizationId) {
    redirect("/login?callbackUrl=/dashboard/grn/stock")
  }

  const result = await getAvailableBikeStock()
  if (!result.success) throw new Error(result.error)

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle>Current Bike Stock</CardTitle>
            <CardDescription>Available bikes grouped by showroom and vehicle model.</CardDescription>
          </div>
          <Badge variant="secondary">{result.data.length} bikes</Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <BikeStockTable vehicles={result.data} />
      </CardContent>
    </Card>
  )
}
