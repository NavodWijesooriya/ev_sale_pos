"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { getAuthSession } from "@/lib/auth"
import { CustomerCategory, CustomerType } from "@prisma/client"

/**
 * Enforces session authentication and extracts the user's organizationId
 */
async function requireAuthOrg() {
  const session = await getAuthSession()
  if (!session?.user?.organizationId) {
    throw new Error("Unauthorized. Please log in to your dealership portal.")
  }
  return {
    organizationId: session.user.organizationId,
    user: session.user,
  }
}

export interface CustomerSummaryItem {
  id: string
  category: CustomerCategory
  customerType: CustomerType
  name: string
  phone: string
  email?: string | null
  nic?: string | null
  address?: string | null
  title?: string | null
  city?: string | null
  interestedModel?: string | null
  quantity: number
  testRide: boolean
  leadSource?: string | null
  socialMediaPlatform?: string | null
  websiteSource?: string | null
  firstCallNote?: string | null
  secondCallNote?: string | null
  thirdCallNote?: string | null
  fourthCallNote?: string | null
  totalSpent: number
  totalPurchases: number
  totalServices: number
  lastActivityDate?: Date | string | null
}

const COMMON_CUSTOMER_CITIES = [
  "Ampara",
  "Anuradhapura",
  "Badulla",
  "Batticaloa",
  "Colombo",
  "Galle",
  "Gampaha",
  "Hambantota",
  "Jaffna",
  "Kalutara",
  "Kandy",
  "Kegalle",
  "Kurunegala",
  "Matara",
  "Negombo",
  "Nuwara Eliya",
  "Polonnaruwa",
  "Puttalam",
  "Ratnapura",
  "Trincomalee",
]

const CRM_LEAD_SOURCES = ["Hotline", "Social Media", "Dealer BTL (Promotion)", "Website"] as const
const SOCIAL_MEDIA_PLATFORMS = ["Facebook", "TikTok", "Instagram"] as const
const WEBSITE_SOURCES = ["Jayakodi Groups", "Ather Energy", "Evolution Auto"] as const
const CUSTOMER_TITLES = ["Mr", "Mrs", "Miss"] as const

function isOneOf<const T extends readonly string[]>(value: string, values: T): value is T[number] {
  return values.some((item) => item === value)
}

/**
 * Retrieves all customers belonging to the current organization with summary calculations
 */
export async function getCustomers(customerType?: CustomerType) {
  try {
    const { organizationId } = await requireAuthOrg()

    const customers = await prisma.customer.findMany({
      where: {
        organizationId,
        ...(customerType ? { customerType } : {}),
      },
      include: {
        sales: {
          select: {
            id: true,
            totalAmount: true,
            saleDate: true,
          },
          orderBy: { saleDate: "desc" },
        },
        serviceRecords: {
          select: {
            id: true,
            serviceDate: true,
          },
          orderBy: { serviceDate: "desc" },
          take: 1,
        },
        _count: {
          select: {
            sales: true,
            serviceRecords: true,
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    })

    const formatted: CustomerSummaryItem[] = customers.map((c) => {
      const totalSpent = c.sales.reduce((sum, s) => sum + s.totalAmount, 0)
      const lastSaleDate = c.sales[0]?.saleDate
      const lastServiceDate = c.serviceRecords[0]?.serviceDate

      let lastActivity: Date | null = null
      if (lastSaleDate && lastServiceDate) {
        lastActivity = new Date(lastSaleDate) > new Date(lastServiceDate) ? lastSaleDate : lastServiceDate
      } else {
        lastActivity = lastSaleDate || lastServiceDate || null
      }

      return {
        id: c.id,
        category: c.category,
        customerType: c.customerType,
        name: c.name,
        phone: c.phone,
        email: c.email,
        nic: c.nic,
        address: c.address,
        title: c.title,
        city: c.city,
        interestedModel: c.interestedModel,
        quantity: c.quantity,
        testRide: c.testRide,
        leadSource: c.leadSource,
        socialMediaPlatform: c.socialMediaPlatform,
        websiteSource: c.websiteSource,
        firstCallNote: c.firstCallNote,
        secondCallNote: c.secondCallNote,
        thirdCallNote: c.thirdCallNote,
        fourthCallNote: c.fourthCallNote,
        totalSpent,
        totalPurchases: c._count.sales,
        totalServices: c._count.serviceRecords,
        lastActivityDate: lastActivity,
      }
    })

    return {
      success: true,
      data: formatted,
    }
  } catch (error) {
    console.error("getCustomers error:", error)
    return {
      success: false,
      error: (error as Error).message,
      data: [],
    }
  }
}

export async function getCRMCustomerFormOptions() {
  try {
    const { organizationId } = await requireAuthOrg()
    const [models, customers] = await Promise.all([
      prisma.vehicleModel.findMany({
        where: { organizationId },
        select: { id: true, brand: true, modelName: true },
        orderBy: [{ brand: "asc" }, { modelName: "asc" }],
      }),
      prisma.customer.findMany({
        where: { organizationId, city: { not: null } },
        select: { city: true },
        distinct: ["city"],
        orderBy: { city: "asc" },
      }),
    ])

    return {
      success: true,
      data: {
        models: models.map((model) => ({
          id: model.id,
          name: `${model.brand} ${model.modelName}`,
        })),
        cities: Array.from(new Set([
          ...COMMON_CUSTOMER_CITIES,
          ...customers.flatMap((customer) => customer.city ? [customer.city] : []),
        ])).sort((a, b) => a.localeCompare(b)),
      },
    }
  } catch (error) {
    console.error("getCRMCustomerFormOptions error:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to load CRM form options.",
      data: { models: [], cities: [] },
    }
  }
}

export async function updateCustomer(customerId: string, formData: FormData) {
  try {
    const { organizationId } = await requireAuthOrg()
    const customer = await prisma.customer.findFirst({
      where: { id: customerId, organizationId },
      select: { id: true, interestedModel: true },
    })

    if (!customer) {
      return { success: false, error: "Customer not found in your dealership records." }
    }

    const name = String(formData.get("name") ?? "").trim()
    const phone = String(formData.get("phone") ?? "").trim()
    const email = String(formData.get("email") ?? "").trim()
    const nic = String(formData.get("nic") ?? "").trim()
    const address = String(formData.get("address") ?? "").trim()
    const title = String(formData.get("title") ?? "").trim()
    const city = String(formData.get("city") ?? "").trim()
    const interestedModel = String(formData.get("interestedModel") ?? "").trim()
    const leadSource = String(formData.get("leadSource") ?? "").trim()
    const socialMediaPlatform = String(formData.get("socialMediaPlatform") ?? "").trim()
    const websiteSource = String(formData.get("websiteSource") ?? "").trim()
    const rawQuantity = String(formData.get("quantity") ?? "").trim()
    const quantity = Number(rawQuantity)

    if (!name || !phone) {
      return { success: false, error: "Customer name and phone number are required." }
    }
    if (name.length > 120 || phone.length > 32 || email.length > 254 || nic.length > 64 || address.length > 500) {
      return { success: false, error: "One or more customer details exceed the allowed length." }
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return { success: false, error: "Enter a valid email address." }
    }
    if (title && !isOneOf(title, CUSTOMER_TITLES)) {
      return { success: false, error: "Select a valid customer title." }
    }
    if (!Number.isSafeInteger(quantity) || quantity < 1) {
      return { success: false, error: "Quantity must be a whole number greater than 0." }
    }
    if (leadSource && !isOneOf(leadSource, CRM_LEAD_SOURCES)) {
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
    if (interestedModel.length > 160) {
      return { success: false, error: "Interested model is too long." }
    }

    if (interestedModel && interestedModel !== customer.interestedModel) {
      const models = await prisma.vehicleModel.findMany({
        where: { organizationId },
        select: { brand: true, modelName: true },
      })
      if (!models.some((model) => `${model.brand} ${model.modelName}` === interestedModel)) {
        return { success: false, error: "Select a valid vehicle model." }
      }
    }

    const notes = ["firstCallNote", "secondCallNote", "thirdCallNote", "fourthCallNote"] as const
    const callNotes = Object.fromEntries(
      notes.map((field) => [field, String(formData.get(field) ?? "").trim() || null]),
    )
    if (notes.some((field) => String(formData.get(field) ?? "").length > 10000)) {
      return { success: false, error: "Call notes must not exceed 10,000 characters." }
    }

    await prisma.customer.update({
      where: { id: customer.id },
      data: {
        name,
        phone,
        email: email || null,
        nic: nic || null,
        address: address || null,
        title: title || null,
        city: city || null,
        interestedModel: interestedModel || null,
        quantity,
        testRide: formData.get("testRide") === "on",
        leadSource: leadSource || null,
        socialMediaPlatform: socialMediaPlatform || null,
        websiteSource: websiteSource || null,
        ...callNotes,
      },
    })

    revalidatePath("/dashboard/customers")
    revalidatePath("/dashboard/customers/crm")
    revalidatePath("/dashboard/customers/sales")
    revalidatePath(`/dashboard/customers/${customer.id}`)
    return { success: true }
  } catch (error) {
    console.error("updateCustomer error:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update customer.",
    }
  }
}

/**
 * Retrieves a customer's detailed CRM profile with complete purchase and service history
 */
export async function getCustomerProfile(customerId: string) {
  try {
    const { organizationId } = await requireAuthOrg()

    const customer = await prisma.customer.findFirst({
      where: {
        id: customerId,
        organizationId,
      },
      include: {
        sales: {
          orderBy: { saleDate: "desc" },
          include: {
            branch: {
              select: {
                id: true,
                name: true,
                location: true,
              },
            },
            soldBy: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            items: {
              include: {
                vehicle: {
                  include: {
                    vehicleModel: true,
                  },
                },
              },
            },
            financeDetail: true,
            dmtRegistration: true,
          },
        },
        serviceRecords: {
          orderBy: { serviceDate: "desc" },
          include: {
            branch: {
              select: {
                id: true,
                name: true,
                location: true,
              },
            },
            vehicle: {
              include: {
                vehicleModel: true,
              },
            },
          },
        },
      },
    })

    if (!customer) {
      return {
        success: false,
        error: "Customer not found in your dealership records.",
        data: null,
      }
    }

    const totalSpent = customer.sales.reduce((sum, s) => sum + s.totalAmount, 0)

    return {
      success: true,
      data: {
        ...customer,
        totalSpent,
      },
    }
  } catch (error) {
    console.error("getCustomerProfile error:", error)
    return {
      success: false,
      error: (error as Error).message,
      data: null,
    }
  }
}
