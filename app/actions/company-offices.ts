"use server"

import { revalidatePath } from "next/cache"
import { Prisma } from "@prisma/client"
import { requireOwner } from "@/lib/authorize"
import { cleanOffice, type OfficeInput } from "@/lib/company-offices"
import { prisma } from "@/lib/prisma"

export type OfficeKind = "finance" | "insurance"

function refresh() {
  revalidatePath("/dashboard/finance/companies")
  revalidatePath("/dashboard/finance/insurance")
  revalidatePath("/dashboard/sales/new")
}

function failure(error: unknown, fallback: string) {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    return { success: false as const, error: "This company already has an office with that name." }
  }
  return { success: false as const, error: error instanceof Error ? error.message : fallback }
}

/** Sales that used the office (as the finance or the insurance office). */
function salesUsing(officeId: string) {
  return prisma.sale.count({ where: { OR: [{ financeOfficeId: officeId }, { insuranceOfficeId: officeId }] } })
}

export async function addCompanyOffice(kind: OfficeKind, companyId: string, input: OfficeInput) {
  try {
    const owner = await requireOwner()
    const office = cleanOffice(input)
    const company =
      kind === "finance"
        ? await prisma.financeCompany.findFirst({ where: { id: companyId, organizationId: owner.organizationId }, select: { id: true } })
        : await prisma.insuranceCompany.findFirst({ where: { id: companyId, organizationId: owner.organizationId }, select: { id: true } })
    if (!company) return { success: false as const, error: "Company not found." }
    const duplicate = await prisma.companyOffice.findFirst({
      where: {
        ...(kind === "finance" ? { financeCompanyId: company.id } : { insuranceCompanyId: company.id }),
        name: { equals: office.name, mode: "insensitive" },
      },
      select: { id: true },
    })
    if (duplicate) return { success: false as const, error: "This company already has an office with that name." }
    await prisma.companyOffice.create({
      data: {
        organizationId: owner.organizationId,
        ...(kind === "finance" ? { financeCompanyId: company.id } : { insuranceCompanyId: company.id }),
        ...office,
      },
    })
    refresh()
    return { success: true as const }
  } catch (error) {
    console.error("addCompanyOffice error:", error)
    return failure(error, "Could not add the office.")
  }
}

export async function updateCompanyOffice(officeId: string, input: OfficeInput & { isActive?: boolean }) {
  try {
    const owner = await requireOwner()
    const office = cleanOffice(input)
    const current = await prisma.companyOffice.findFirst({
      where: { id: officeId, organizationId: owner.organizationId },
      select: { id: true, financeCompanyId: true, insuranceCompanyId: true },
    })
    if (!current) return { success: false as const, error: "Office not found." }
    const duplicate = await prisma.companyOffice.findFirst({
      where: {
        NOT: { id: current.id },
        ...(current.financeCompanyId ? { financeCompanyId: current.financeCompanyId } : { insuranceCompanyId: current.insuranceCompanyId }),
        name: { equals: office.name, mode: "insensitive" },
      },
      select: { id: true },
    })
    if (duplicate) return { success: false as const, error: "This company already has an office with that name." }
    await prisma.companyOffice.update({
      where: { id: current.id },
      data: { ...office, ...(input.isActive === undefined ? {} : { isActive: input.isActive }) },
    })
    refresh()
    return { success: true as const }
  } catch (error) {
    console.error("updateCompanyOffice error:", error)
    return failure(error, "Could not update the office.")
  }
}

/** An office a sale used cannot be deleted (the sale shows its name): it can be set inactive instead. */
export async function deleteCompanyOffice(officeId: string) {
  try {
    const owner = await requireOwner()
    const current = await prisma.companyOffice.findFirst({
      where: { id: officeId, organizationId: owner.organizationId },
      select: { id: true },
    })
    if (!current) return { success: false as const, error: "Office not found." }
    const used = await salesUsing(current.id)
    if (used > 0) {
      return {
        success: false as const,
        error: `Used in ${used} ${used === 1 ? "sale" : "sales"}. Set it Inactive instead of deleting it.`,
      }
    }
    await prisma.companyOffice.delete({ where: { id: current.id } })
    refresh()
    return { success: true as const }
  } catch (error) {
    console.error("deleteCompanyOffice error:", error)
    return failure(error, "Could not delete the office.")
  }
}
