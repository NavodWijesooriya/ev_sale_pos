import { redirect } from "next/navigation"
import { getStockTransfers, getTransferOptions } from "@/app/actions/stock-transfers"
import { StockTransfersView } from "@/components/grn/stock-transfers-view"
import { getAuthSession } from "@/lib/auth"
import { hasPermission } from "@/lib/permissions"

export const instant = false

export const metadata = {
  title: "Stock Transfers | Ev Sale Pos",
  description: "Move bikes between showrooms",
}

export default async function StockTransfersPage() {
  const session = await getAuthSession()
  if (!session?.user?.organizationId) redirect("/login?callbackUrl=/dashboard/grn/transfers")
  if (!hasPermission(session.user, "TRANSFER_STOCK")) redirect("/dashboard")

  const [transfers, options] = await Promise.all([getStockTransfers(), getTransferOptions()])
  return (
    <div className="mx-auto w-full max-w-[1280px]">
      <StockTransfersView transfers={transfers} options={options} />
    </div>
  )
}
