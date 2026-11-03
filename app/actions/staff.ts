"use server"

import { prisma } from "@/lib/prisma"
import { getAuthSession } from "@/lib/auth"
import bcrypt from "bcrypt"
import { UserRole } from "@prisma/client"

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
    throw new Error("Forbidden. Only Dealership Administrators (OrgAdmin) can manage staff accounts.")
  }

  return {
    organizationId: session.user.organizationId,
    currentUserId: session.user.id,
    user: session.user,
  }
}

export interface StaffUserItem {
  id: string
  name: string
  email: string
  role: UserRole
  isActive: boolean
  createdAt: string
  branchId?: string | null
  branchName?: string | null
  branchLocation?: string | null
}

export interface BranchOption {
  id: string
  name: string
  location?: string | null
}

export interface StaffInitialData {
  users: StaffUserItem[]
  branches: BranchOption[]
  currentUserId: string
}

/**
 * Retrieves all staff members and available branches for the current organization
 */
export async function getStaffInitialData(): Promise<StaffInitialData> {
  const { organizationId, currentUserId } = await requireOrgAdmin()

  const [usersRaw, branches] = await Promise.all([
    prisma.user.findMany({
      where: { organizationId },
      include: {
        branch: {
          select: {
            id: true,
            name: true,
            location: true,
          },
        },
      },
      orderBy: [
        { role: "asc" },
        { createdAt: "desc" },
      ],
    }),
    prisma.branch.findMany({
      where: { organizationId },
      select: {
        id: true,
        name: true,
        location: true,
      },
      orderBy: { name: "asc" },
    }),
  ])

  const users: StaffUserItem[] = usersRaw.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    isActive: u.isActive,
    createdAt: u.createdAt.toISOString(),
    branchId: u.branchId,
    branchName: u.branch ? u.branch.name : "All Branches (HQ)",
    branchLocation: u.branch?.location || null,
  }))

  return {
    users,
    branches,
    currentUserId,
  }
}

export interface CreateStaffUserInput {
  name: string
  email: string
  password: string
  role: UserRole
  branchId?: string | null
}

/**
 * Creates a new staff member with a hashed password attached strictly to current organization
 */
export async function createStaffUser(input: CreateStaffUserInput) {
  try {
    const { organizationId } = await requireOrgAdmin()

    // 1. Validation
    const name = input.name?.trim()
    const email = input.email?.toLowerCase().trim()
    const password = input.password?.trim()
    const role = input.role
    const branchId = input.branchId || null

    if (!name || name.length < 2) {
      return { success: false, error: "Staff member name must be at least 2 characters." }
    }

    if (!email || !email.includes("@")) {
      return { success: false, error: "Please provide a valid email address." }
    }

    if (!password || password.length < 6) {
      return { success: false, error: "Password must be at least 6 characters long." }
    }

    const validRoles: UserRole[] = [
      UserRole.BranchManager,
      UserRole.SalesRep,
      UserRole.Cashier,
      UserRole.Technician,
      UserRole.OrgAdmin,
    ]
    if (!validRoles.includes(role)) {
      return { success: false, error: "Invalid role selected." }
    }

    // 2. Check email uniqueness across all users
    const existingUser = await prisma.user.findUnique({
      where: { email },
    })
    if (existingUser) {
      return { success: false, error: "A user account with this email address already exists." }
    }

    // 3. Verify branch belongs to organization if provided
    if (branchId) {
      const branch = await prisma.branch.findFirst({
        where: { id: branchId, organizationId },
      })
      if (!branch) {
        return { success: false, error: "Selected branch does not belong to your dealership." }
      }
    }

    // 4. Hash password securely using bcrypt
    const passwordHash = await bcrypt.hash(password, 10)

    // 5. Create user attached strictly to current organization
    const newUser = await prisma.user.create({
      data: {
        organizationId,
        name,
        email,
        passwordHash,
        role,
        branchId,
        isActive: true,
      },
      include: {
        branch: {
          select: { id: true, name: true, location: true },
        },
      },
    })

    return {
      success: true,
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        isActive: newUser.isActive,
        createdAt: newUser.createdAt.toISOString(),
        branchId: newUser.branchId,
        branchName: newUser.branch?.name || "All Branches (HQ)",
        branchLocation: newUser.branch?.location || null,
      },
    }
  } catch (err: any) {
    console.error("Error creating staff user:", err)
    return { success: false, error: err.message || "Failed to create staff member." }
  }
}

export interface UpdateStaffUserInput {
  id: string
  name: string
  role: UserRole
  branchId?: string | null
  newPassword?: string
}

/**
 * Updates an existing staff member's profile, role, branch, or password
 */
export async function updateStaffUser(input: UpdateStaffUserInput) {
  try {
    const { organizationId, currentUserId } = await requireOrgAdmin()

    const targetUser = await prisma.user.findFirst({
      where: { id: input.id, organizationId },
    })
    if (!targetUser) {
      return { success: false, error: "User account not found." }
    }

    // Prevent changing your own role away from OrgAdmin
    if (targetUser.id === currentUserId && input.role !== targetUser.role) {
      return { success: false, error: "You cannot change your own role from OrgAdmin." }
    }

    const updateData: any = {
      name: input.name.trim(),
      role: input.role,
      branchId: input.branchId || null,
    }

    if (input.newPassword && input.newPassword.trim().length >= 6) {
      updateData.passwordHash = await bcrypt.hash(input.newPassword.trim(), 10)
    }

    const updated = await prisma.user.update({
      where: { id: input.id },
      data: updateData,
      include: {
        branch: {
          select: { id: true, name: true, location: true },
        },
      },
    })

    return {
      success: true,
      user: {
        id: updated.id,
        name: updated.name,
        email: updated.email,
        role: updated.role,
        isActive: updated.isActive,
        createdAt: updated.createdAt.toISOString(),
        branchId: updated.branchId,
        branchName: updated.branch?.name || "All Branches (HQ)",
        branchLocation: updated.branch?.location || null,
      },
    }
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to update staff user." }
  }
}

/**
 * Enables or disables a staff member's login access
 */
export async function toggleStaffStatus(userId: string, isActive: boolean) {
  try {
    const { organizationId, currentUserId } = await requireOrgAdmin()

    if (userId === currentUserId) {
      return { success: false, error: "You cannot disable your own administrator account." }
    }

    const targetUser = await prisma.user.findFirst({
      where: { id: userId, organizationId },
    })
    if (!targetUser) {
      return { success: false, error: "User not found in your dealership." }
    }

    await prisma.user.update({
      where: { id: userId },
      data: { isActive },
    })

    return { success: true, isActive }
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to toggle staff status." }
  }
}
