import { redirect } from "next/navigation"
import { getInsuranceCompanies } from "@/app/actions/finance"
import { CompanyManagement } from "@/components/finance/company-management"
import { getAuthSession } from "@/lib/auth"

export const instant = false

export const metadata = {
  title: "Insurance Companies | Ev Sale Pos",
  description: "Manage insurance companies and their officers",
}

export default async function InsuranceCompaniesPage() {
  const session = await getAuthSession()
  if (
    !session?.user?.organizationId ||
    (session.user.role !== "OrgAdmin" && session.user.role !== "SuperAdmin")
  ) {
    redirect("/dashboard")
  }

  const companies = await getInsuranceCompanies()
  return (
    <CompanyManagement
      kind="insurance"
      initialCompanies={companies.map((company) => ({
        id: company.id,
        name: company.name,
        contactNo: company.contactNo,
        defaultCommissionRate: company.defaultCommissionRate,
        officers: company.officers.map(({ id, name, contactNo }) => ({ id, name, contactNo })),
      }))}
    />
  )
}
