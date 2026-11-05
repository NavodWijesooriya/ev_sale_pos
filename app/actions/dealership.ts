"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { createClient } from "@/lib/supabase/server"
import { createClient as createSupabaseAdminClient } from "@supabase/supabase-js"
import bcrypt from "bcrypt"
import { PlatformRole, SubscriptionPlan, SubscriptionStatus, UserRole } from "@prisma/client"

export interface RegisterDealershipInput {
  businessName: string
  phone?: string
  plan: SubscriptionPlan
  adminName: string
  adminEmail: string
  adminPassword: string
  subdomain?: string
}

export interface RegisterDealershipResult {
  success: boolean
  message: string
  organization?: {
    id: string
    businessName: string
    phone: string | null
    subdomain: string | null
    subscriptionPlan: SubscriptionPlan
    subscriptionStatus: SubscriptionStatus
    createdAt: Date
  }
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

export async function registerDealership(
  input: RegisterDealershipInput
): Promise<RegisterDealershipResult> {
  try {
    const { businessName, phone, plan, adminName, adminEmail, adminPassword } = input

    // Basic Validations
    if (!businessName || businessName.trim().length < 2) {
      return { success: false, message: "Business name must be at least 2 characters." }
    }
    if (!adminName || adminName.trim().length < 2) {
      return { success: false, message: "Admin name must be at least 2 characters." }
    }
    if (!adminEmail || !adminEmail.includes("@")) {
      return { success: false, message: "A valid admin email address is required." }
    }
    if (!adminPassword || adminPassword.length < 6) {
      return { success: false, message: "Password must be at least 6 characters long." }
    }

    const validPlans: SubscriptionPlan[] = [
      SubscriptionPlan.Free,
      SubscriptionPlan.Basic,
      SubscriptionPlan.Pro,
      SubscriptionPlan.Enterprise,
    ]
    const assignedPlan = validPlans.includes(plan) ? plan : SubscriptionPlan.Free

    const normalizedEmail = adminEmail.toLowerCase().trim()

    // Check if user email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    })

    if (existingUser) {
      return {
        success: false,
        message: `A user with email "${normalizedEmail}" is already registered.`,
      }
    }

    // Generate unique subdomain slug
    let baseSubdomain = slugify(businessName)
    if (!baseSubdomain) baseSubdomain = "ev-dealership"
    let candidateSubdomain = baseSubdomain

    const existingSubdomain = await prisma.organization.findUnique({
      where: { subdomain: candidateSubdomain },
    })

    if (existingSubdomain) {
      const randomSuffix = Math.floor(1000 + Math.random() * 9000)
      candidateSubdomain = `${baseSubdomain}-${randomSuffix}`
    }

    // Execute Prisma Transaction
    const result = await prisma.$transaction(async (tx) => {
      // a) Create Organization with optional phone
      const organization = await tx.organization.create({
        data: {
          businessName: businessName.trim(),
          phone: phone?.trim() || null,
          subdomain: candidateSubdomain,
          subscriptionPlan: assignedPlan,
          subscriptionStatus: SubscriptionStatus.Active,
        },
      })

      // b) Hash admin password
      const passwordHash = await bcrypt.hash(adminPassword, 10)

      // c) Create OrgAdmin User
      const adminUser = await tx.user.create({
        data: {
          organizationId: organization.id,
          name: adminName.trim(),
          email: normalizedEmail,
          passwordHash,
          role: UserRole.OrgAdmin,
        },
      })

      // d) Create initial primary branch for the dealership
      await tx.branch.create({
        data: {
          organizationId: organization.id,
          name: `${businessName.trim()} - Main Showroom`,
          location: "Primary Showroom",
          contactNumber: phone?.trim() || null,
        },
      })

      return { organization, adminUser }
    })

    revalidatePath("/super-admin")
    revalidatePath("/dashboard")

    return {
      success: true,
      message: `Dealership "${result.organization.businessName}" successfully registered!`,
      organization: {
        id: result.organization.id,
        businessName: result.organization.businessName,
        phone: result.organization.phone,
        subdomain: result.organization.subdomain,
        subscriptionPlan: result.organization.subscriptionPlan,
        subscriptionStatus: result.organization.subscriptionStatus,
        createdAt: result.organization.createdAt,
      },
    }
  } catch (error) {
    console.error("Dealership onboarding error:", error)
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to register dealership.",
    }
  }
}

export async function toggleDealershipStatus(
  organizationId: string,
  targetStatus?: SubscriptionStatus
) {
  try {
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
    })

    if (!org) {
      return { success: false, message: "Organization not found." }
    }

    const nextStatus =
      targetStatus ??
      (org.subscriptionStatus === SubscriptionStatus.Active
        ? SubscriptionStatus.Suspended
        : SubscriptionStatus.Active)

    const updated = await prisma.organization.update({
      where: { id: organizationId },
      data: { subscriptionStatus: nextStatus },
    })

    revalidatePath("/super-admin")
    revalidatePath("/dashboard")

    return {
      success: true,
      message: `Dealership "${updated.businessName}" status changed to ${nextStatus}.`,
      status: updated.subscriptionStatus,
    }
  } catch (error) {
    console.error("Failed to toggle dealership status:", error)
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to toggle status.",
    }
  }
}

export async function getRegisteredDealerships() {
  try {
    const organizations = await prisma.organization.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        users: {
          where: { role: UserRole.OrgAdmin },
          select: { name: true, email: true },
          take: 1,
        },
        _count: {
          select: {
            branches: true,
            vehicles: true,
            sales: true,
            users: true,
          },
        },
      },
    })
    return organizations
  } catch (error) {
    console.error("Failed to fetch organizations:", error)
    return []
  }
}

export async function updateDealershipAppearance(input: {
  businessName: string
  phone?: string
  logoUrl?: string
}) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user?.email) {
      return { success: false, message: "Unauthorized. Please log in as Dealership Owner." }
    }

    const dealershipUser = await prisma.user.findUnique({
      where: { email: user.email.toLowerCase().trim() },
      select: { organizationId: true, isActive: true },
    })

    if (!dealershipUser?.isActive) {
      return { success: false, message: "Unauthorized. Please log in as Dealership Owner." }
    }

    if (!input.businessName || input.businessName.trim().length < 2) {
      return { success: false, message: "Dealership name must be at least 2 characters." }
    }

    await prisma.organization.update({
      where: { id: dealershipUser.organizationId },
      data: {
        businessName: input.businessName.trim(),
        phone: input.phone?.trim() || null,
        logoUrl: input.logoUrl?.trim() || null,
      },
    })

    revalidatePath("/dashboard")
    revalidatePath("/dashboard/settings/appearance")
    return { success: true, message: "Storefront branding and appearance updated successfully!" }
  } catch (error) {
    console.error("updateDealershipAppearance error:", error)
    return { success: false, message: (error as Error).message }
  }
}

export interface CreateTenantInput {
  businessName: string
  subdomain: string
  adminEmail: string
  adminPassword: string
  adminName?: string
  phone?: string
  plan?: SubscriptionPlan
}

export async function createTenant(input: CreateTenantInput): Promise<{
  success: boolean
  message: string
  organization?: {
    id: string
    businessName: string
    subdomain: string | null
    domain: string | null
    subscriptionPlan: string
    subscriptionStatus: string
    createdAt: string
    phone: string | null
    usersCount: number
    branchesCount: number
    vehiclesCount: number
    salesCount: number
  }
}> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const platformUser = user?.email
      ? await prisma.platformUser.findUnique({
          where: { email: user.email.toLowerCase().trim() },
          select: { role: true },
        })
      : null

    if (platformUser?.role !== PlatformRole.PlatformAdmin) {
      return { success: false, message: "Unauthorized: Only Platform Administrators can provision new dealerships." }
    }

    const { businessName, subdomain, adminEmail, adminPassword, adminName, phone, plan } = input

    // 1. Validate Business Name
    if (!businessName || businessName.trim().length < 2) {
      return { success: false, message: "Dealership name must be at least 2 characters." }
    }

    // 2. Validate Subdomain
    if (!subdomain || !subdomain.trim()) {
      return { success: false, message: "Subdomain is required." }
    }

    const cleanSubdomain = subdomain.toLowerCase().trim().replace(/[^a-z0-9-]/g, "")
    if (cleanSubdomain.length < 2) {
      return { success: false, message: "Subdomain must contain at least 2 valid characters (lowercase letters, numbers, hyphens)." }
    }

    // Check if subdomain is a reserved keyword
    const reserved = ["admin", "api", "www", "app", "dashboard", "superadmin", "platform", "portal", "mail", "auth"]
    if (reserved.includes(cleanSubdomain)) {
      return { success: false, message: `"${cleanSubdomain}" is a reserved system subdomain and cannot be used.` }
    }

    // Check if subdomain already exists in DB
    const existingOrg = await prisma.organization.findUnique({
      where: { subdomain: cleanSubdomain },
    })
    if (existingOrg) {
      return { success: false, message: `Subdomain "${cleanSubdomain}" is already assigned to another dealership.` }
    }

    // 3. Validate Admin Email
    if (!adminEmail || !adminEmail.includes("@")) {
      return { success: false, message: "A valid admin email address is required." }
    }
    const cleanEmail = adminEmail.toLowerCase().trim()

    // Check if user email already exists in DB
    const existingUser = await prisma.user.findUnique({
      where: { email: cleanEmail },
    })
    if (existingUser) {
      return { success: false, message: `User email "${cleanEmail}" is already registered on the system.` }
    }

    // 4. Validate Admin Password
    if (!adminPassword || adminPassword.length < 6) {
      return { success: false, message: "Admin password must be at least 6 characters long." }
    }

    // 5. Hash password
    const passwordHash = await bcrypt.hash(adminPassword, 10)

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !supabaseServiceRoleKey) {
      throw new Error("Supabase admin credentials are not configured.")
    }

    const supabaseAdmin = createSupabaseAdminClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        detectSessionInUrl: false,
        persistSession: false,
      },
    })
    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email: cleanEmail,
        password: adminPassword,
        email_confirm: true,
        user_metadata: {
          name: adminName?.trim() || `${businessName.trim()} Admin`,
        },
      })

    if (authError) {
      throw new Error(`Failed to create Supabase Auth user: ${authError.message}`)
    }
    if (!authData.user) {
      throw new Error("Supabase Auth did not return the created user.")
    }

    // 6. Prisma Transaction
    const result = await prisma.$transaction(async (tx) => {
      // a) Create Organization
      const org = await tx.organization.create({
        data: {
          businessName: businessName.trim(),
          subdomain: cleanSubdomain,
          phone: phone?.trim() || null,
          subscriptionPlan: plan || SubscriptionPlan.Pro,
          subscriptionStatus: SubscriptionStatus.Active,
        },
      })

      // b) Create Flagship Branch
      const branch = await tx.branch.create({
        data: {
          organizationId: org.id,
          name: `${businessName.trim()} Showroom`,
          location: "Primary Flagship",
          contactNumber: phone?.trim() || null,
        },
      })

      // c) Create OrgAdmin User
      const user = await tx.user.create({
        data: {
          organizationId: org.id,
          branchId: branch.id,
          name: adminName?.trim() || `${businessName.trim()} Admin`,
          email: cleanEmail,
          passwordHash,
          role: UserRole.OrgAdmin,
          isActive: true,
        },
      })

      return { org, branch, user }
    }).catch(async (error: unknown) => {
      const { error: cleanupError } = await supabaseAdmin.auth.admin.deleteUser(
        authData.user.id,
      )
      if (cleanupError) {
        console.error("createTenant Supabase Auth cleanup error:", cleanupError)
        throw new Error(
          `Tenant database creation failed, and the Supabase Auth user could not be removed: ${cleanupError.message}`,
        )
      }

      throw error
    })

    // Revalidate paths
    revalidatePath("/admin-portal")
    revalidatePath("/super-admin")
    revalidatePath("/dashboard")

    return {
      success: true,
      message: `Dealership "${result.org.businessName}" provisioned successfully with subdomain "${cleanSubdomain}"!`,
      organization: {
        id: result.org.id,
        businessName: result.org.businessName,
        subdomain: result.org.subdomain,
        domain: result.org.domain,
        subscriptionPlan: result.org.subscriptionPlan,
        subscriptionStatus: result.org.subscriptionStatus,
        createdAt: result.org.createdAt.toISOString(),
        phone: result.org.phone,
        usersCount: 1,
        branchesCount: 1,
        vehiclesCount: 0,
        salesCount: 0,
      },
    }
  } catch (error: unknown) {
    console.error("createTenant error:", error)
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to create tenant dealership.",
    }
  }
}
