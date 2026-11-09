"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { getAuthSession } from "@/lib/auth"
import { generateNextCustomerCrn } from "@/lib/customer-crn"
import { CustomerCategory, CustomerType } from "@prisma/client"

const CRM_LEAD_SOURCES = [
  "Hotline",
  "Social Media",
  "Dealer BTL (Promotion)",
  "Website",
] as const
const SOCIAL_MEDIA_PLATFORMS = ["Facebook", "TikTok", "Instagram"] as const
const WEBSITE_SOURCES = ["Jayakodi Groups", "Ather Energy", "Evolution Auto"] as const

function isCRMLeadSource(value: string): value is (typeof CRM_LEAD_SOURCES)[number] {
  return CRM_LEAD_SOURCES.some((source) => source === value)
}

function isOneOf<const T extends readonly string[]>(value: string, values: T): value is T[number] {
  return values.some((item) => item === value)
}

type CreateCustomerResult =
  | { success: true; crn: string; category: CustomerCategory }
  | { success: false; error: string }

export async function createCustomer(formData: FormData): Promise<CreateCustomerResult> {
  const session = await getAuthSession()
  const organizationId = session?.user?.organizationId

  if (!organizationId) {
    return { success: false, error: "Unauthorized. Please log in to your dealership portal." }
  }

  const name = String(formData.get("name") ?? "").trim()
  const phone = String(formData.get("phone") ?? "").trim()
  const email = String(formData.get("email") ?? "").trim()
  const requestedCategory = String(formData.get("category") ?? CustomerCategory.CRM)
  const category =
    requestedCategory === CustomerCategory.DIRECT
      ? CustomerCategory.DIRECT
      : CustomerCategory.CRM

  if (!name || !phone) {
    return { success: false, error: "Customer name and phone number are required." }
  }

  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { success: false, error: "Enter a valid email address." }
  }

  try {
    const crn = await generateNextCustomerCrn(prisma)
    await prisma.customer.create({
      data: {
        organizationId,
        category,
        customerType: category === CustomerCategory.DIRECT ? CustomerType.SALE : CustomerType.CRM,
        name,
        phone,
        email: email || null,
        crn,
      },
    })

    revalidatePath("/dashboard/customers")
    return { success: true, crn, category }
  } catch (error) {
    console.error("createCustomer error:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create customer.",
    }
  }
}

type CreateCRMCustomerResult =
  | { success: true; crn: string }
  | { success: false; error: string }

export async function createCRMCustomer(formData: FormData): Promise<CreateCRMCustomerResult> {
  const session = await getAuthSession()
  const organizationId = session?.user?.organizationId

  if (!organizationId) {
    return { success: false, error: "Unauthorized. Please log in to your dealership portal." }
  }

  const name = String(formData.get("name") ?? "").trim()
  const phone = String(formData.get("phone") ?? "").trim()
  const email = String(formData.get("email") ?? "").trim()
  const nic = String(formData.get("nic") ?? "").trim()
  const address = String(formData.get("address") ?? "").trim()
  const title = String(formData.get("title") ?? "").trim()
  const city = String(formData.get("city") ?? "").trim()
  const interestedModel = String(formData.get("interestedModel") ?? "").trim()
  const leadSource = String(formData.get("leadSource") ?? "")
  const socialMediaPlatform = String(formData.get("socialMediaPlatform") ?? "")
  const websiteSource = String(formData.get("websiteSource") ?? "")
  const rawQuantity = String(formData.get("quantity") ?? "1").trim()
  const quantity = Number(rawQuantity || "1")

  if (!name || !phone) {
    return { success: false, error: "Customer name and phone number are required." }
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { success: false, error: "Enter a valid email address." }
  }
  if (title && !["Mr", "Mrs", "Miss"].includes(title)) {
    return { success: false, error: "Select a valid customer title." }
  }
  if (!Number.isSafeInteger(quantity) || quantity < 1) {
    return { success: false, error: "Quantity must be a whole number greater than 0." }
  }
  if (!isCRMLeadSource(leadSource)) {
    return { success: false, error: "Select a valid lead source." }
  }
  if (
    (leadSource === "Social Media" && !isOneOf(socialMediaPlatform, SOCIAL_MEDIA_PLATFORMS)) ||
    (leadSource !== "Social Media" && socialMediaPlatform)
  ) {
    return { success: false, error: "Select a valid social media platform." }
  }
  if (
    (leadSource === "Website" && !isOneOf(websiteSource, WEBSITE_SOURCES)) ||
    (leadSource !== "Website" && websiteSource)
  ) {
    return { success: false, error: "Select a valid website source." }
  }

  try {
    const models = interestedModel
      ? await prisma.vehicleModel.findMany({
          where: { organizationId },
          select: { brand: true, modelName: true },
        })
      : []
    const interestedVehicleModel = models.find(
      (model) => `${model.brand} ${model.modelName}` === interestedModel,
    )
    if (interestedModel && !interestedVehicleModel) {
      return { success: false, error: "Select a valid vehicle model." }
    }

    const crn = await generateNextCustomerCrn(prisma)
    await prisma.customer.create({
      data: {
        organizationId,
        category: CustomerCategory.CRM,
        customerType: CustomerType.CRM,
        name,
        phone,
        email: email || null,
        nic: nic || null,
        address: address || null,
        title: title || null,
        city: city || null,
        interestedModel: interestedVehicleModel
          ? `${interestedVehicleModel.brand} ${interestedVehicleModel.modelName}`
          : null,
        quantity,
        testRide: formData.get("testRide") === "on",
        leadSource,
        socialMediaPlatform: socialMediaPlatform || null,
        websiteSource: websiteSource || null,
        firstCallNote: String(formData.get("firstCallNote") ?? "").trim() || null,
        secondCallNote: String(formData.get("secondCallNote") ?? "").trim() || null,
        thirdCallNote: String(formData.get("thirdCallNote") ?? "").trim() || null,
        fourthCallNote: String(formData.get("fourthCallNote") ?? "").trim() || null,
        crn,
      },
    })

    revalidatePath("/dashboard/customers")
    revalidatePath("/dashboard/customers/crm")
    return { success: true, crn }
  } catch (error) {
    console.error("createCRMCustomer error:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create CRM customer.",
    }
  }
}
