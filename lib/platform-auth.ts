import { PlatformRole } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { createClient } from "@/lib/supabase/server"

export interface PlatformAdminIdentity {
  id: string
  name: string
  email: string
}

/** The signed-in Platform Administrator (the SaaS operator, not a dealership user), or null. */
export async function getPlatformAdmin(): Promise<PlatformAdminIdentity | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const email = user?.email?.toLowerCase().trim()
  if (!email) return null

  const platformUser = await prisma.platformUser.findUnique({
    where: { email },
    select: { id: true, name: true, role: true },
  })
  if (platformUser?.role !== PlatformRole.PlatformAdmin) return null
  return { id: platformUser.id, name: platformUser.name, email }
}

/** True only for a signed-in Platform Administrator. */
export async function isPlatformAdmin(): Promise<boolean> {
  return (await getPlatformAdmin()) !== null
}

/** Throws unless a Platform Administrator is signed in; returns who it is. */
export async function requirePlatformAdmin(): Promise<PlatformAdminIdentity> {
  const admin = await getPlatformAdmin()
  if (!admin) throw new Error("Unauthorized: Only Platform Administrators can do this.")
  return admin
}
