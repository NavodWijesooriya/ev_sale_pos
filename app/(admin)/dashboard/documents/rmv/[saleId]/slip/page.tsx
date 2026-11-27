import { connection } from "next/server"
import { notFound } from "next/navigation"
import { getHandoverSlip } from "@/app/actions/documents"
import { HandoverSlip } from "@/components/documents/handover-slip"

export const instant = false

export const metadata = {
  title: "Document Hand-over Slip | Ev Sale Pos",
  description: "Printable acknowledgement of documents handed over",
}

export default async function HandoverSlipPage({ params }: { params: Promise<{ saleId: string }> }) {
  await connection()
  const { saleId } = await params
  const result = await getHandoverSlip(saleId)
  if (!result.success) notFound()
  return <HandoverSlip data={result.data} />
}
