"use server"

import { prisma } from "@/lib/prisma"
import { getAuthSession } from "@/lib/auth"
import { revalidatePath } from "next/cache"

/**
 * Enforces session authentication and validates that the user is an OrgAdmin
 */
async function requireOrgAdmin() {
  const session = await getAuthSession()
  if (!session?.user?.organizationId) {
    throw new Error("Unauthorized. Please log in to your dealership portal.")
  }

  // Strictly enforce OrgAdmin role
  if (session.user.role !== "OrgAdmin" && session.user.role !== "SuperAdmin") {
    throw new Error(
      "Forbidden. Only Dealership Administrators (OrgAdmin) can manage branch showrooms."
    )
  }

  return {
    organizationId: session.user.organizationId,
    currentUserId: session.user.id,
    user: session.user,
  }
}

export interface BranchRecordItem {
  id: string
  name: string
  location: string | null
  contactNumber: string | null
  createdAt: string
  usersCount: number
  vehiclesCount: number
  salesCount: number
  serviceRecordsCount: number
}

/**
 * Retrieves all branches belonging strictly to the authenticated organization
 */
export async function getBranches(): Promise<BranchRecordItem[]> {
  const { organizationId } = await requireOrgAdmin()

  const branches = await prisma.branch.findMany({
    where: { organizationId },
    include: {
      _count: {
        select: {
          users: true,
          vehicles: true,
          sales: true,
          serviceRecords: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  return branches.map((b) => ({
    id: b.id,
    name: b.name,
    location: b.location,
    contactNumber: b.contactNumber,
    createdAt: b.createdAt.toISOString(),
    usersCount: b._count.users,
    vehiclesCount: b._count.vehicles,
    salesCount: b._count.sales,
    serviceRecordsCount: b._count.serviceRecords,
  }))
}

export interface CreateBranchInput {
  name: string
  location?: string
  contactNumber?: string
}

/**
 * Creates a new branch for the current organization
 */
export async function createBranch(input: CreateBranchInput) {
  try {
    const { organizationId } = await requireOrgAdmin()

    const name = input.name?.trim()
    if (!name || name.length < 2) {
      return { success: false, error: "Branch name must be at least 2 characters long." }
    }

    const location = input.location?.trim() || null
    const contactNumber = input.contactNumber?.trim() || null

    // Check for duplicate branch name in same organization
    const existing = await prisma.branch.findFirst({
      where: {
        organizationId,
        name: { equals: name, mode: "insensitive" },
      },
    })

    if (existing) {
      return {
        success: false,
        error: `A branch named "${name}" already exists in your dealership.`,
      }
    }

    const newBranch = await prisma.branch.create({
      data: {
        organizationId,
        name,
        location,
        contactNumber,
      },
    })

    revalidatePath("/dashboard/settings/branches")
    revalidatePath("/dashboard/branches")
    revalidatePath("/dashboard/grn/create")
    revalidatePath("/dashboard/grn/stock")
    revalidatePath("/dashboard/settings/users")
    revalidatePath("/dashboard/sales")

    return {
      success: true,
      message: `Branch "${newBranch.name}" created successfully!`,
      branch: {
        id: newBranch.id,
        name: newBranch.name,
        location: newBranch.location,
        contactNumber: newBranch.contactNumber,
        createdAt: newBranch.createdAt.toISOString(),
        usersCount: 0,
        vehiclesCount: 0,
        salesCount: 0,
        serviceRecordsCount: 0,
      },
    }
  } catch (error) {
    console.error("createBranch error:", error)
    return {
      success: false,
      error: (error as Error).message || "Failed to create branch.",
    }
  }
}

export interface UpdateBranchInput {
  id: string
  name: string
  location?: string
  contactNumber?: string
}

/**
 * Updates an existing branch strictly scoped to current organization
 */
export async function updateBranch(input: UpdateBranchInput) {
  try {
    const { organizationId } = await requireOrgAdmin()

    if (!input.id) {
      return { success: false, error: "Branch ID is required." }
    }

    const name = input.name?.trim()
    if (!name || name.length < 2) {
      return { success: false, error: "Branch name must be at least 2 characters long." }
    }

    // Verify branch belongs to this organization
    const branch = await prisma.branch.findFirst({
      where: {
        id: input.id,
        organizationId,
      },
    })

    if (!branch) {
      return { success: false, error: "Branch not found or unauthorized." }
    }

    // Check duplicate name on another branch
    const duplicate = await prisma.branch.findFirst({
      where: {
        organizationId,
        name: { equals: name, mode: "insensitive" },
        NOT: { id: input.id },
      },
    })

    if (duplicate) {
      return {
        success: false,
        error: `Another branch with the name "${name}" already exists.`,
      }
    }

    const updated = await prisma.branch.update({
      where: { id: input.id },
      data: {
        name,
        location: input.location?.trim() || null,
        contactNumber: input.contactNumber?.trim() || null,
      },
      include: {
        _count: {
          select: {
            users: true,
            vehicles: true,
            sales: true,
            serviceRecords: true,
          },
        },
      },
    })

    revalidatePath("/dashboard/settings/branches")
    revalidatePath("/dashboard/branches")
    revalidatePath("/dashboard/grn/create")
    revalidatePath("/dashboard/grn/stock")
    revalidatePath("/dashboard/settings/users")
    revalidatePath("/dashboard/sales")

    return {
      success: true,
      message: `Branch "${updated.name}" updated successfully!`,
      branch: {
        id: updated.id,
        name: updated.name,
        location: updated.location,
        contactNumber: updated.contactNumber,
        createdAt: updated.createdAt.toISOString(),
        usersCount: updated._count.users,
        vehiclesCount: updated._count.vehicles,
        salesCount: updated._count.sales,
        serviceRecordsCount: updated._count.serviceRecords,
      },
    }
  } catch (error) {
    console.error("updateBranch error:", error)
    return {
      success: false,
      error: (error as Error).message || "Failed to update branch.",
    }
  }
}

/**
 * Deletes a branch with safety checks to ensure no active stock/sales/staff are orphaned
 */
export async function deleteBranch(id: string) {
  try {
    const { organizationId } = await requireOrgAdmin()

    if (!id) {
      return { success: false, error: "Branch ID is required." }
    }

    const branch = await prisma.branch.findFirst({
      where: {
        id,
        organizationId,
      },
      include: {
        _count: {
          select: {
            users: true,
            vehicles: true,
            sales: true,
            grns: true,
            serviceRecords: true,
          },
        },
      },
    })

    if (!branch) {
      return { success: false, error: "Branch not found or unauthorized." }
    }

    // Safety checks: ensure no active records depend on this branch
    const { users, vehicles, sales, grns, serviceRecords } = branch._count
    const totalLinked = users + vehicles + sales + grns + serviceRecords

    if (totalLinked > 0) {
      const reasons: string[] = []
      if (users > 0) reasons.push(`${users} staff member(s)`)
      if (vehicles > 0) reasons.push(`${vehicles} vehicle(s) in stock`)
      if (sales > 0) reasons.push(`${sales} sale order(s)`)
      if (grns > 0) reasons.push(`${grns} GRN voucher(s)`)
      if (serviceRecords > 0) reasons.push(`${serviceRecords} service record(s)`)

      return {
        success: false,
        error: `Cannot delete branch "${branch.name}". It has active links to: ${reasons.join(", ")}. Please reassign them before deleting.`,
      }
    }

    await prisma.branch.delete({
      where: { id },
    })

    revalidatePath("/dashboard/settings/branches")
    revalidatePath("/dashboard/branches")
    revalidatePath("/dashboard/grn/create")
    revalidatePath("/dashboard/grn/stock")
    revalidatePath("/dashboard/settings/users")
    revalidatePath("/dashboard/sales")

    return {
      success: true,
      message: `Branch "${branch.name}" was successfully removed.`,
    }
  } catch (error) {
    console.error("deleteBranch error:", error)
    return {
      success: false,
      error: (error as Error).message || "Failed to delete branch.",
    }
  }
}
