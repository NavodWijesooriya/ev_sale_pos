"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { getAuthSession } from "@/lib/auth"
import { generateNextCustomerCrn } from "@/lib/customer-crn"
import { CustomerCategory } from "@prisma/client"

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
