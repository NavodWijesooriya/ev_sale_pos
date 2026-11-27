import { guardRoute } from "@/lib/route-guard"

export default async function ReceivedDocumentsLayout({ children }: { children: React.ReactNode }) {
  // Anyone who works with sales, customers or finance receivables may look; changes need MANAGE_DOCUMENTS (checked in every action).
  await guardRoute("MANAGE_DOCUMENTS", "CREATE_SALE", "MANAGE_CUSTOMERS", "MANAGE_FINANCE_RECEIVABLES")
  return children
}
