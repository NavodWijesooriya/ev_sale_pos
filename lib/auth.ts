import { connection } from "next/server"
import { prisma } from "@/lib/prisma"
import { createClient } from "@/lib/supabase/server"

export interface AuthSessionUser {
  id: string
  name: string
  email: string
  role: string
  organizationId?: string
  organizationName?: string
  /** Assigned branch. Non-owner users with a branch only see that branch's data. */
  branchId?: string | null
  /** Fine-grained permission keys (see lib/permissions.ts). */
  permissions?: string[]
}

export interface AuthSession {
  user: AuthSessionUser
}

export async function getAuthSession(): Promise<AuthSession | null> {
  await connection()
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error && error.name !== "AuthSessionMissingError") {
    throw error
  }

  if (!user) {
    return null
  }

  const email = user.email?.toLowerCase().trim()
  if (!email) {
    return null
  }

  const dealershipUser = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      name: true,
      role: true,
      organizationId: true,
      branchId: true,
      permissions: true,
      organization: { select: { businessName: true } },
      isActive: true,
    },
  })

  if (dealershipUser) {
    if (!dealershipUser.isActive) {
      return null
    }

    return {
      user: {
        id: dealershipUser.id,
        name: dealershipUser.name,
        email,
        role: dealershipUser.role,
        organizationId: dealershipUser.organizationId,
        organizationName: dealershipUser.organization.businessName,
        branchId: dealershipUser.branchId,
        permissions: dealershipUser.permissions,
      },
    }
  }

  const platformUser = await prisma.platformUser.findUnique({
    where: { email },
    select: { id: true, name: true, role: true },
  })

  if (!platformUser) {
    return null
  }

  return {
    user: {
      id: platformUser.id,
      name: platformUser.name,
      email,
      role: platformUser.role,
    },
  }
}
