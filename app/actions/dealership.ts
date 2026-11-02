"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcrypt"
import { SubscriptionPlan, SubscriptionStatus, UserRole } from "@prisma/client"

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
