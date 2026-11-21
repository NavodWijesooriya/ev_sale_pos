"use server"

import { SubscriptionStatus, UserRole } from "@prisma/client"
import { revalidatePath } from "next/cache"
import { recordAudit } from "@/lib/audit"
import { requirePlatformAdmin, type PlatformAdminIdentity } from "@/lib/platform-auth"
import { prisma } from "@/lib/prisma"
import { BAN_FOREVER, createSupabaseAdminClient, findAuthUserIdByEmail } from "@/lib/supabase/admin"

/**
 * Platform-operator control over dealership owner accounts (OrgAdmin users).
 * Every function re-checks, on the server, that the caller is a Platform Administrator.
 */

export interface DealershipOwner {
  id: string
  name: string
  email: string
  isActive: boolean
  createdAt: string
  /** Disabling or deleting this person would leave an active dealership with nobody who can sign in. */
  isLastActiveOwner: boolean
}

type ActionResult =
  | { success: true; message: string; outcome?: "deleted" | "disabled-instead" | "disabled" | "enabled" }
  | { success: false; message: string; requiresConfirmation?: boolean }

/** Columns that record "who did this" (foreign keys or plain ids). A user with a row in any of them has history. */
const ACTOR_COLUMNS = [
  "userId",
  "staffId",
  "createdById",
  "updatedById",
  "commissionRecipientId",
  "assignedTechnicianId",
  "dispatchedById",
  "receivedById",
  "cancelledById",
  "fromCustomerId",
]

async function platformActor(admin: PlatformAdminIdentity, organizationId: string) {
  // The audit log is per dealership; the platform admin is recorded as the actor.
  return { id: admin.id, name: `${admin.name} (Platform Admin)`, organizationId, branchId: null }
}

async function loadOwner(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      organizationId: true,
      organization: { select: { businessName: true, subscriptionStatus: true } },
    },
  })
  if (!user) throw new Error("Owner account not found.")
  if (user.role !== UserRole.OrgAdmin) throw new Error("Only dealership owner accounts can be managed here.")
  return user
}

async function isLastActiveOwner(organizationId: string, userId: string, subscriptionStatus: SubscriptionStatus) {
  if (subscriptionStatus !== SubscriptionStatus.Active) return false
  const others = await prisma.user.count({
    where: { organizationId, role: UserRole.OrgAdmin, isActive: true, id: { not: userId } },
  })
  return others === 0
}

/** Owners of one dealership, for the expandable row in the super admin dealership list. */
export async function getDealershipOwners(organizationId: string): Promise<DealershipOwner[]> {
  await requirePlatformAdmin()
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { subscriptionStatus: true },
  })
  if (!org) return []
  const owners = await prisma.user.findMany({
    where: { organizationId, role: UserRole.OrgAdmin },
    select: { id: true, name: true, email: true, isActive: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  })
  const activeCount = owners.filter((o) => o.isActive).length
  return owners.map((o) => ({
    id: o.id,
    name: o.name,
    email: o.email,
    isActive: o.isActive,
    createdAt: o.createdAt.toISOString(),
    isLastActiveOwner: o.isActive && activeCount === 1 && org.subscriptionStatus === SubscriptionStatus.Active,
  }))
}

/** How much history a user has: rows across every "who did this" column, by table. */
async function historyOf(userId: string): Promise<{ total: number; parts: Array<{ table: string; count: number }> }> {
  const columns = await prisma.$queryRaw<Array<{ table_name: string; column_name: string }>>`
    SELECT table_name, column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name::text <> 'User'
      AND column_name::text = ANY(${ACTOR_COLUMNS})
  `
  const parts: Array<{ table: string; count: number }> = []
  for (const { table_name, column_name } of columns) {
    // Identifiers come from information_schema (not user input); the id is a bound parameter.
    const rows = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
      `SELECT count(*)::bigint AS count FROM "${table_name}" WHERE "${column_name}"::text = $1`,
      userId,
    )
    const count = Number(rows[0]?.count ?? 0)
    if (count > 0) parts.push({ table: table_name, count })
  }
  return { total: parts.reduce((s, p) => s + p.count, 0), parts }
}

async function setBan(email: string, banned: boolean) {
  const supabase = createSupabaseAdminClient()
  const authId = await findAuthUserIdByEmail(supabase, email)
  if (!authId) return false // no login account to (un)ban
  const { error } = await supabase.auth.admin.updateUserById(authId, { ban_duration: banned ? BAN_FOREVER : "none" })
  if (error) throw new Error(`Could not ${banned ? "block" : "unblock"} the login account: ${error.message}`)
  return true
}

const LAST_OWNER_WARNING =
  "This is the last active owner of an active dealership. Nobody at the dealership will be able to sign in. Confirm to continue."

async function disableOwnerCore(admin: PlatformAdminIdentity, owner: Awaited<ReturnType<typeof loadOwner>>, note?: string) {
  // Block sign-in at the Auth level first; if that fails nothing else changes.
  await setBan(owner.email, true)
  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: owner.id }, data: { isActive: false } })
    await recordAudit(tx, await platformActor(admin, owner.organizationId), {
      action: "OWNER_ACCOUNT_DISABLED",
      entityType: "User",
      entityId: owner.id,
      description: `Owner ${owner.email} of ${owner.organization.businessName} disabled by the platform admin${note ? `: ${note}` : ""}`,
    })
  })
}

/** Disable or enable an owner. Disabling also bans the login in Supabase Auth. */
export async function setOwnerActive(input: {
  userId: string
  active: boolean
  acknowledgeLastOwner?: boolean
}): Promise<ActionResult> {
  try {
    const admin = await requirePlatformAdmin()
    const owner = await loadOwner(input.userId)

    if (input.active) {
      await setBan(owner.email, false)
      await prisma.$transaction(async (tx) => {
        await tx.user.update({ where: { id: owner.id }, data: { isActive: true } })
        await recordAudit(tx, await platformActor(admin, owner.organizationId), {
          action: "OWNER_ACCOUNT_ENABLED",
          entityType: "User",
          entityId: owner.id,
          description: `Owner ${owner.email} of ${owner.organization.businessName} enabled by the platform admin`,
        })
      })
      revalidate()
      return { success: true, outcome: "enabled", message: `${owner.email} can sign in again.` }
    }

    if (owner.isActive && !input.acknowledgeLastOwner && (await isLastActiveOwner(owner.organizationId, owner.id, owner.organization.subscriptionStatus))) {
      return { success: false, requiresConfirmation: true, message: LAST_OWNER_WARNING }
    }
    await disableOwnerCore(admin, owner)
    revalidate()
    return { success: true, outcome: "disabled", message: `${owner.email} is disabled and can no longer sign in.` }
  } catch (error) {
    return fail("setOwnerActive", error)
  }
}

/**
 * Delete an owner. Someone with no history is removed completely (database row and login).
 * Someone with history is only disabled, so the records that name them stay intact.
 */
export async function deleteOwner(input: {
  userId: string
  confirmEmail: string
  acknowledgeLastOwner?: boolean
}): Promise<ActionResult> {
  try {
    const admin = await requirePlatformAdmin()
    const owner = await loadOwner(input.userId)

    if (input.confirmEmail?.trim().toLowerCase() !== owner.email.toLowerCase()) {
      return { success: false, message: "The email you typed does not match this owner. Nothing was deleted." }
    }
    if (owner.isActive && !input.acknowledgeLastOwner && (await isLastActiveOwner(owner.organizationId, owner.id, owner.organization.subscriptionStatus))) {
      return { success: false, requiresConfirmation: true, message: LAST_OWNER_WARNING }
    }

    const history = await historyOf(owner.id)
    if (history.total > 0) {
      const summary = history.parts.map((p) => `${p.count} in ${p.table}`).join(", ")
      if (owner.isActive) {
        await disableOwnerCore(admin, owner, `delete refused, ${history.total} record(s) kept`)
      }
      revalidate()
      return {
        success: true,
        outcome: "disabled-instead",
        message: `${owner.email} has ${history.total} record(s) (${summary}); account disabled instead of deleted to keep those records.`,
      }
    }

    // No history: remove the database row (re-checking inside the transaction), then the login.
    await prisma.$transaction(async (tx) => {
      await recordAudit(tx, await platformActor(admin, owner.organizationId), {
        action: "OWNER_ACCOUNT_DELETED",
        entityType: "User",
        entityId: owner.id,
        description: `Owner ${owner.email} of ${owner.organization.businessName} deleted by the platform admin (no history)`,
      })
      await tx.user.delete({ where: { id: owner.id } })
    })

    let loginRemoved = true
    try {
      const supabase = createSupabaseAdminClient()
      const authId = await findAuthUserIdByEmail(supabase, owner.email)
      if (authId) {
        const { error } = await supabase.auth.admin.deleteUser(authId)
        if (error) throw error
      }
    } catch (authError) {
      console.error("deleteOwner: could not remove the Supabase login:", authError)
      loginRemoved = false
    }
    revalidate()
    return {
      success: true,
      outcome: "deleted",
      message: loginRemoved
        ? `${owner.email} was deleted.`
        : `${owner.email} was deleted from the dealership, but the sign-in account could not be removed. Remove it in Supabase Auth.`,
    }
  } catch (error) {
    return fail("deleteOwner", error)
  }
}

function revalidate() {
  revalidatePath("/admin-portal")
}

function fail(label: string, error: unknown): { success: false; message: string } {
  console.error(`${label} error:`, error)
  return { success: false, message: error instanceof Error ? error.message : "Something went wrong." }
}
