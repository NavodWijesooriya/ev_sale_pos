"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { getAuthSession } from "@/lib/auth"
import { UserRole } from "@prisma/client"

async function requireShopOwner() {
  const session = await getAuthSession()
  if (!session?.user?.organizationId) {
    throw new Error("Unauthorized. Please log in to your dealership portal.")
  }
  if (session.user.role !== "OrgAdmin") {
    throw new Error("Forbidden. Only the shop owner or organization admin can manage spare parts.")
  }
  return session.user.organizationId
}

export async function getAvailableSpareParts() {
  const session = await getAuthSession()
  const organizationId = session?.user?.organizationId
  if (!organizationId) {
    return { success: false as const, error: "Unauthorized.", data: [] }
  }
  if (
    session.user.role !== UserRole.OrgAdmin &&
    session.user.role !== UserRole.Technician
  ) {
    return { success: false as const, error: "Forbidden.", data: [] }
  }

  const data = await prisma.sparePart.findMany({
    where: { organizationId, stockQuantity: { gt: 0 } },
    select: { id: true, name: true, sku: true, partNumber: true, price: true, stockQuantity: true },
    orderBy: { name: "asc" },
  })
  return { success: true as const, data }
}

export async function getSpareParts() {
  try {
    const organizationId = await requireShopOwner()
    const data = await prisma.sparePart.findMany({
      where: { organizationId },
      orderBy: { name: "asc" },
    })
    return { success: true as const, data }
  } catch (error) {
    console.error("getSpareParts error:", error)
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Failed to load spare parts.",
      data: [],
    }
  }
}

export async function createSparePart(input: {
  name: string
  sku: string
  partNumber?: string | null
  price: number
  stockQuantity: number
}) {
  try {
    const organizationId = await requireShopOwner()
    const name = input.name.trim()
    const sku = input.sku.trim()
    if (!name || !sku) throw new Error("Part name and SKU are required.")
    if (!Number.isFinite(input.price) || input.price < 0) {
      throw new Error("Part price must be zero or greater.")
    }
    if (!Number.isInteger(input.stockQuantity) || input.stockQuantity < 0) {
      throw new Error("Stock quantity must be a non-negative whole number.")
    }

    const part = await prisma.sparePart.create({
      data: {
        organizationId,
        name,
        sku,
        partNumber: input.partNumber?.trim() || null,
        price: input.price,
        stockQuantity: input.stockQuantity,
      },
    })
    revalidatePath("/dashboard/services/spare-parts")
    revalidatePath("/dashboard/services")
    return { success: true as const, data: part }
  } catch (error) {
    console.error("createSparePart error:", error)
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Failed to create spare part.",
    }
  }
}

export async function updateSparePart(input: {
  id: string
  name: string
  sku: string
  partNumber?: string | null
  price: number
}) {
  try {
    const organizationId = await requireShopOwner()
    if (!input.id.trim() || !input.name.trim() || !input.sku.trim()) {
      throw new Error("Part, name, and SKU are required.")
    }
    if (!Number.isFinite(input.price) || input.price < 0) {
      throw new Error("Part price must be zero or greater.")
    }
    const result = await prisma.sparePart.updateMany({
      where: { id: input.id, organizationId },
      data: { name: input.name.trim(), sku: input.sku.trim(), partNumber: input.partNumber?.trim() || null, price: input.price },
    })
    if (result.count === 0) throw new Error("Spare part not found.")
    revalidatePath("/dashboard/services/spare-parts")
    revalidatePath("/dashboard/services")
    return { success: true as const }
  } catch (error) {
    console.error("updateSparePart error:", error)
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Failed to update spare part.",
    }
  }
}

export async function restockSparePart(id: string, quantity: number) {
  try {
    const organizationId = await requireShopOwner()
    if (!id.trim() || !Number.isInteger(quantity) || quantity <= 0) {
      throw new Error("Enter a valid part and restock quantity.")
    }
    const result = await prisma.sparePart.updateMany({
      where: { id, organizationId },
      data: { stockQuantity: { increment: quantity } },
    })
    if (result.count === 0) throw new Error("Spare part not found.")
    revalidatePath("/dashboard/services/spare-parts")
    revalidatePath("/dashboard/services")
    return { success: true as const }
  } catch (error) {
    console.error("restockSparePart error:", error)
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Failed to restock spare part.",
    }
  }
}

export async function deleteSparePart(id: string) {
  try {
    const organizationId = await requireShopOwner()
    if (!id.trim()) throw new Error("Spare part ID is required.")
    const usages = await prisma.servicePart.count({ where: { sparePartId: id } })
    if (usages > 0) {
      throw new Error("This part is used on service jobs and cannot be deleted.")
    }
    const result = await prisma.sparePart.deleteMany({
      where: { id, organizationId },
    })
    if (result.count === 0) throw new Error("Spare part not found.")
    revalidatePath("/dashboard/services/spare-parts")
    return { success: true as const }
  } catch (error) {
    console.error("deleteSparePart error:", error)
    return {
      success: false as const,
      error: error instanceof Error
        ? error.message
        : "Unable to delete a spare part that has been used on a service job.",
    }
  }
}
