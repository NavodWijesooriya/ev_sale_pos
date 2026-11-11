"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { getAuthSession } from "@/lib/auth"

const financeCompaniesPath = "/dashboard/finance/companies"
const insuranceCompaniesPath = "/dashboard/finance/insurance"

async function requireOrganization() {
  const session = await getAuthSession()
  if (!session?.user?.organizationId) {
    throw new Error("Unauthorized. Please log in to your dealership portal.")
  }
  return { organizationId: session.user.organizationId, role: session.user.role }
}

async function requireFinanceAdmin() {
  const { organizationId, role } = await requireOrganization()
  if (role !== "OrgAdmin" && role !== "SuperAdmin") {
    throw new Error("Forbidden. Only dealership administrators can manage finance companies.")
  }
  return { organizationId }
}

function companyFields(input: CompanyInput) {
  const name = input.name?.trim()
  const contactNo = input.contactNo?.trim()
  const rate = input.defaultCommissionRate

  if (!name || name.length < 2) throw new Error("Company name must be at least 2 characters.")
  if (!contactNo) throw new Error("Company contact number is required.")
  if (rate != null && (!Number.isFinite(rate) || rate < 0 || rate > 100)) {
    throw new Error("Default commission rate must be between 0 and 100.")
  }

  return { name, contactNo, defaultCommissionRate: rate ?? null }
}

function officerFields(input: OfficerInput) {
  const name = input.name?.trim()
  const contactNo = input.contactNo?.trim()
  if (!name || name.length < 2) throw new Error("Officer name must be at least 2 characters.")
  if (!contactNo) throw new Error("Officer contact number is required.")
  if (!input.companyId?.trim()) throw new Error("Select a company for this officer.")
  return { name, contactNo, companyId: input.companyId.trim() }
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback
}

function revalidateFinancePages() {
  revalidatePath(financeCompaniesPath)
  revalidatePath(insuranceCompaniesPath)
  revalidatePath("/dashboard/finance/commissions")
  revalidatePath("/dashboard/sales/new")
  revalidatePath("/dashboard/sales/history")
}

export interface CompanyInput {
  name: string
  contactNo: string
  defaultCommissionRate?: number | null
}

export interface OfficerInput {
  companyId: string
  name: string
  contactNo: string
}

export interface FinanceCompanyOption {
  id: string
  name: string
  defaultCommissionRate: number | null
}

export interface InsuranceCompanyOption {
  id: string
  name: string
  defaultCommissionRate: number | null
}

export async function getFinanceCompanies() {
  const { organizationId } = await requireOrganization()
  return prisma.financeCompany.findMany({
    where: { organizationId },
    include: { officers: true },
    orderBy: { name: "asc" },
  })
}

export async function getInsuranceCompanies() {
  const { organizationId } = await requireOrganization()
  return prisma.insuranceCompany.findMany({
    where: { organizationId },
    include: { officers: true },
    orderBy: { name: "asc" },
  })
}

export async function createFinanceCompany(input: CompanyInput) {
  try {
    const { organizationId } = await requireFinanceAdmin()
    const fields = companyFields(input)
    const duplicate = await prisma.financeCompany.findFirst({
      where: { organizationId, name: { equals: fields.name, mode: "insensitive" } },
      select: { id: true },
    })
    if (duplicate) return { success: false as const, error: "A finance company with that name already exists." }

    await prisma.financeCompany.create({ data: { organizationId, ...fields } })
    revalidateFinancePages()
    return { success: true as const }
  } catch (error) {
    console.error("createFinanceCompany error:", error)
    return { success: false as const, error: errorMessage(error, "Unable to create finance company.") }
  }
}

export async function updateFinanceCompany(input: CompanyInput & { id: string }) {
  try {
    const { organizationId } = await requireFinanceAdmin()
    const fields = companyFields(input)
    const current = await prisma.financeCompany.findFirst({
      where: { id: input.id, organizationId },
      select: { id: true },
    })
    if (!current) return { success: false as const, error: "Finance company not found." }
    const duplicate = await prisma.financeCompany.findFirst({
      where: { organizationId, name: { equals: fields.name, mode: "insensitive" }, NOT: { id: input.id } },
      select: { id: true },
    })
    if (duplicate) return { success: false as const, error: "A finance company with that name already exists." }

    await prisma.financeCompany.update({ where: { id: current.id }, data: fields })
    revalidateFinancePages()
    return { success: true as const }
  } catch (error) {
    console.error("updateFinanceCompany error:", error)
    return { success: false as const, error: errorMessage(error, "Unable to update finance company.") }
  }
}

export async function deleteFinanceCompany(id: string) {
  try {
    const { organizationId } = await requireFinanceAdmin()
    const deleted = await prisma.financeCompany.deleteMany({ where: { id, organizationId } })
    if (deleted.count !== 1) return { success: false as const, error: "Finance company not found." }
    revalidateFinancePages()
    return { success: true as const }
  } catch (error) {
    console.error("deleteFinanceCompany error:", error)
    return { success: false as const, error: errorMessage(error, "Unable to delete finance company.") }
  }
}

export async function addFinanceOfficer(input: OfficerInput) {
  try {
    const { organizationId } = await requireFinanceAdmin()
    const fields = officerFields(input)
    const company = await prisma.financeCompany.findFirst({
      where: { id: fields.companyId, organizationId },
      select: { id: true },
    })
    if (!company) return { success: false as const, error: "Finance company not found." }

    await prisma.financeOfficer.create({
      data: { name: fields.name, contactNo: fields.contactNo, financeCompanyId: company.id },
    })
    revalidateFinancePages()
    return { success: true as const }
  } catch (error) {
    console.error("addFinanceOfficer error:", error)
    return { success: false as const, error: errorMessage(error, "Unable to add finance officer.") }
  }
}

export async function deleteFinanceOfficer(id: string) {
  try {
    const { organizationId } = await requireFinanceAdmin()
    const deleted = await prisma.financeOfficer.deleteMany({
      where: { id, financeCompany: { organizationId } },
    })
    if (deleted.count !== 1) return { success: false as const, error: "Finance officer not found." }
    revalidateFinancePages()
    return { success: true as const }
  } catch (error) {
    console.error("deleteFinanceOfficer error:", error)
    return { success: false as const, error: errorMessage(error, "Unable to delete finance officer.") }
  }
}

export async function createInsuranceCompany(input: CompanyInput) {
  try {
    const { organizationId } = await requireFinanceAdmin()
    const fields = companyFields(input)
    const duplicate = await prisma.insuranceCompany.findFirst({
      where: { organizationId, name: { equals: fields.name, mode: "insensitive" } },
      select: { id: true },
    })
    if (duplicate) return { success: false as const, error: "An insurance company with that name already exists." }

    await prisma.insuranceCompany.create({ data: { organizationId, ...fields } })
    revalidateFinancePages()
    return { success: true as const }
  } catch (error) {
    console.error("createInsuranceCompany error:", error)
    return { success: false as const, error: errorMessage(error, "Unable to create insurance company.") }
  }
}

export async function updateInsuranceCompany(input: CompanyInput & { id: string }) {
  try {
    const { organizationId } = await requireFinanceAdmin()
    const fields = companyFields(input)
    const current = await prisma.insuranceCompany.findFirst({
      where: { id: input.id, organizationId },
      select: { id: true },
    })
    if (!current) return { success: false as const, error: "Insurance company not found." }
    const duplicate = await prisma.insuranceCompany.findFirst({
      where: { organizationId, name: { equals: fields.name, mode: "insensitive" }, NOT: { id: input.id } },
      select: { id: true },
    })
    if (duplicate) return { success: false as const, error: "An insurance company with that name already exists." }

    await prisma.insuranceCompany.update({ where: { id: current.id }, data: fields })
    revalidateFinancePages()
    return { success: true as const }
  } catch (error) {
    console.error("updateInsuranceCompany error:", error)
    return { success: false as const, error: errorMessage(error, "Unable to update insurance company.") }
  }
}

export async function deleteInsuranceCompany(id: string) {
  try {
    const { organizationId } = await requireFinanceAdmin()
    const deleted = await prisma.insuranceCompany.deleteMany({ where: { id, organizationId } })
    if (deleted.count !== 1) return { success: false as const, error: "Insurance company not found." }
    revalidateFinancePages()
    return { success: true as const }
  } catch (error) {
    console.error("deleteInsuranceCompany error:", error)
    return { success: false as const, error: errorMessage(error, "Unable to delete insurance company.") }
  }
}

export async function addInsuranceOfficer(input: OfficerInput) {
  try {
    const { organizationId } = await requireFinanceAdmin()
    const fields = officerFields(input)
    const company = await prisma.insuranceCompany.findFirst({
      where: { id: fields.companyId, organizationId },
      select: { id: true },
    })
    if (!company) return { success: false as const, error: "Insurance company not found." }

    await prisma.insuranceOfficer.create({
      data: { name: fields.name, contactNo: fields.contactNo, insuranceCompanyId: company.id },
    })
    revalidateFinancePages()
    return { success: true as const }
  } catch (error) {
    console.error("addInsuranceOfficer error:", error)
    return { success: false as const, error: errorMessage(error, "Unable to add insurance officer.") }
  }
}

export async function deleteInsuranceOfficer(id: string) {
  try {
    const { organizationId } = await requireFinanceAdmin()
    const deleted = await prisma.insuranceOfficer.deleteMany({
      where: { id, insuranceCompany: { organizationId } },
    })
    if (deleted.count !== 1) return { success: false as const, error: "Insurance officer not found." }
    revalidateFinancePages()
    return { success: true as const }
  } catch (error) {
    console.error("deleteInsuranceOfficer error:", error)
    return { success: false as const, error: errorMessage(error, "Unable to delete insurance officer.") }
  }
}
