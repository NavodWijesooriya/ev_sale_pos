"use server"

import { revalidatePath } from "next/cache"
import { VehicleStatus } from "@prisma/client"
import { getAuthSession } from "@/lib/auth"
import { generateNextGRNNumber, lockGRNNumberSequence } from "@/lib/grn-number"
import { prisma } from "@/lib/prisma"

const GRN_BIKE_COLORS = [
  "Pangong Blue",
  "Terracotta Red",
  "Siachen White",
  "Deccan Grey",
] as const

export interface GRNBikeInput {
  chassisNumber: string
  motorNumber?: string
  chargingSerialNumber?: string
  vehicleModelId: string
  year?: number
  color: string
}

export interface CreateGRNInput {
  date: string
  branchId: string
  transportRefNumber?: string
  orderNumber?: string
  transportCost?: number
  bikes: GRNBikeInput[]
}

async function requireOrganizationId() {
  const session = await getAuthSession()
  if (!session?.user?.organizationId) {
    throw new Error("Unauthorized. Please log in to your dealership portal.")
  }
  return session.user.organizationId
}

export async function getGRNFormOptions() {
  try {
    const organizationId = await requireOrganizationId()
    const [branches, models] = await Promise.all([
      prisma.branch.findMany({
        where: { organizationId },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
      prisma.vehicleModel.findMany({
        where: { organizationId },
        select: { id: true, brand: true, modelName: true },
        orderBy: [{ brand: "asc" }, { modelName: "asc" }],
      }),
    ])

    return {
      success: true,
      data: {
        branches,
        models: models.map((model) => ({
          id: model.id,
          label: `${model.brand} ${model.modelName}`,
        })),
        colors: GRN_BIKE_COLORS,
      },
    }
  } catch (error) {
    console.error("getGRNFormOptions error:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to load GRN form options.",
      data: { branches: [], models: [], colors: GRN_BIKE_COLORS },
    }
  }
}

export async function createGRN(input: CreateGRNInput) {
  try {
    const organizationId = await requireOrganizationId()
    if (!input.branchId?.trim()) throw new Error("Select a showroom branch.")
    if (!input.date || !/^\d{4}-\d{2}-\d{2}$/.test(input.date)) {
      throw new Error("Enter a valid GRN date.")
    }
    const date = new Date(`${input.date}T00:00:00.000Z`)
    if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== input.date) {
      throw new Error("Enter a valid GRN date.")
    }
    if (!input.bikes?.length) throw new Error("Add at least one bike to this GRN.")
    if (input.bikes.length > 99) throw new Error("A GRN cannot contain more than 99 bikes.")
    if (
      input.transportCost !== undefined &&
      (!Number.isFinite(input.transportCost) || input.transportCost < 0)
    ) {
      throw new Error("Transport cost must be zero or greater.")
    }

    const branch = await prisma.branch.findFirst({
      where: { id: input.branchId, organizationId },
      select: { id: true },
    })
    if (!branch) throw new Error("Select a valid showroom branch.")

    const modelIds = new Set(input.bikes.map((bike) => bike.vehicleModelId))
    if (modelIds.has("")) throw new Error("Select a model for each bike.")
    const models = await prisma.vehicleModel.findMany({
      where: { organizationId, id: { in: Array.from(modelIds) } },
      select: { id: true },
    })
    if (models.length !== modelIds.size) {
      throw new Error("One or more selected EV models are not available in your dealership.")
    }

    const chassisNumbers = input.bikes.map((bike) => bike.chassisNumber.trim().toUpperCase())
    if (chassisNumbers.some((chassisNumber) => !chassisNumber)) {
      throw new Error("Chassis number is required for every bike.")
    }
    if (new Set(chassisNumbers).size !== chassisNumbers.length) {
      throw new Error("Chassis numbers must be unique within the GRN.")
    }
    if (input.bikes.some((bike) => !GRN_BIKE_COLORS.some((color) => color === bike.color))) {
      throw new Error("Select a valid color for every bike.")
    }
    if (input.bikes.some((bike) =>
      bike.year !== undefined &&
      (!Number.isInteger(bike.year) || bike.year < 1900 || bike.year > 2200),
    )) {
      throw new Error("Enter a valid year for each bike.")
    }
    if (input.bikes.some((bike) =>
      bike.chassisNumber.length > 120 ||
      (bike.motorNumber?.length ?? 0) > 120 ||
      (bike.chargingSerialNumber?.length ?? 0) > 120,
    )) {
      throw new Error("Bike serial numbers must not exceed 120 characters.")
    }

    const duplicates = await prisma.vehicle.findMany({
      where: { chassisNumber: { in: chassisNumbers } },
      select: { chassisNumber: true },
    })
    if (duplicates.length) {
      throw new Error(`Chassis number(s) already exist: ${duplicates.map((vehicle) => vehicle.chassisNumber).join(", ")}`)
    }

    const grn = await prisma.$transaction(async (tx) => {
      await lockGRNNumberSequence(tx)
      const grnNumber = await generateNextGRNNumber(tx)
      const createdGRN = await tx.gRN.create({
        data: {
          organizationId,
          branchId: branch.id,
          grnNumber,
          date,
          receivedDate: date,
          transportRefNumber: input.transportRefNumber?.trim() || null,
          orderNumber: input.orderNumber?.trim() || null,
          transportCost: input.transportCost ?? null,
          totalAmount: 0,
        },
      })

      for (let index = 0; index < input.bikes.length; index += 1) {
        const bike = input.bikes[index]
        const vehicle = await tx.vehicle.create({
          data: {
            organizationId,
            branchId: branch.id,
            grnId: createdGRN.id,
            vehicleModelId: bike.vehicleModelId,
            chassisNumber: chassisNumbers[index],
            motorNumber: bike.motorNumber?.trim() || null,
            chargingSerialNumber: bike.chargingSerialNumber?.trim() || null,
            year: bike.year ?? null,
            color: bike.color,
            status: VehicleStatus.AVAILABLE,
            purchasePrice: 0,
          },
        })
        await tx.gRNItem.create({
          data: {
            grnId: createdGRN.id,
            vehicleId: vehicle.id,
            unitPrice: 0,
          },
        })
      }

      return createdGRN
    })

    revalidatePath("/dashboard/grn/create")
    revalidatePath("/dashboard/grn/report")
    revalidatePath("/dashboard/grn/stock")
    revalidatePath("/dashboard/sales")
    revalidatePath("/dashboard")
    revalidatePath("/site/[domain]", "page")

    return {
      success: true,
      message: `GRN ${grn.grnNumber} created with ${input.bikes.length} bike${input.bikes.length === 1 ? "" : "s"}.`,
      grnNumber: grn.grnNumber,
    }
  } catch (error) {
    console.error("createGRN error:", error)
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to create GRN.",
    }
  }
}

export async function getGRNReport() {
  try {
    const organizationId = await requireOrganizationId()
    const grns = await prisma.gRN.findMany({
      where: { organizationId },
      include: {
        branch: { select: { id: true, name: true } },
        supplier: { select: { name: true } },
        _count: { select: { vehicles: true, items: true } },
      },
      orderBy: [{ date: "desc" }, { grnNumber: "desc" }],
    })
    return { success: true, data: grns }
  } catch (error) {
    console.error("getGRNReport error:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to load GRN report.",
      data: [],
    }
  }
}

export async function getAvailableBikeStock() {
  try {
    const organizationId = await requireOrganizationId()
    const vehicles = await prisma.vehicle.findMany({
      where: { organizationId, status: VehicleStatus.AVAILABLE },
      include: {
        branch: { select: { id: true, name: true } },
        vehicleModel: { select: { brand: true, modelName: true } },
        grn: { select: { grnNumber: true, date: true } },
      },
      orderBy: [{ createdAt: "desc" }, { chassisNumber: "asc" }],
    })
    return { success: true, data: vehicles }
  } catch (error) {
    console.error("getAvailableBikeStock error:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to load available bike stock.",
      data: [],
    }
  }
}
