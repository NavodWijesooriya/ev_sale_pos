import { redirect } from "next/navigation"
import { getBankDepositOptions, getBankDepositReport } from "@/app/actions/bank-deposits"
import { BankDepositsView } from "@/components/finance/bank-deposits-view"
import { getAuthSession } from "@/lib/auth"
import { hasPermission, isOwner } from "@/lib/permissions"

export const instant = false

export const metadata = {
  title: "Daily Bank Deposits | Ev Sale Pos",
  description: "Record and report cash deposited to the bank",
}

export default async function BankDepositsPage() {
  const session = await getAuthSession()
  if (!session?.user?.organizationId) redirect("/login?callbackUrl=/dashboard/finance/bank-deposits")
  if (!hasPermission(session.user, "MANAGE_BANK_DEPOSITS")) redirect("/dashboard")

  const [options, report] = await Promise.all([getBankDepositOptions(), getBankDepositReport()])

  return (
    <div className="mx-auto w-full max-w-[1280px]">
      <BankDepositsView
        options={options}
        initialRows={report.rows}
        initialTotal={report.totalDeposited}
        isOwner={isOwner(session.user)}
        staffName={session.user.name}
      />
    </div>
  )
}
