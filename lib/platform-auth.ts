import { PlatformRole } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { createClient } from "@/lib/supabase/server"

/** True only for a signed-in Platform Administrator (the SaaS operator, not a dealership user). */
export async function isPlatformAdmin(): Promise<boolean> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const email = user?.email?.toLowerCase().trim()
  if (!email) return false

  const platformUser = await prisma.platformUser.findUnique({
    where: { email },
    select: { role: true },
  })
  return platformUser?.role === PlatformRole.PlatformAdmin
}

export async function requirePlatformAdmin() {
  if (!(await isPlatformAdmin())) {
    throw new Error("Unauthorized: Only Platform Administrators can do this.")
  }
}
