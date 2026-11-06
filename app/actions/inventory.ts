"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { getAuthSession } from "@/lib/auth"
import { VehicleStatus } from "@prisma/client"

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

async function requireCatalogManagement() {
  const { organizationId, user } = await requireAuthOrg()

  if (user.role === "OrgAdmin") {
    return { organizationId }
  }

  if (user.role !== "BranchManager") {
    throw new Error("Forbidden. Only the dealership owner or permitted staff can manage the catalog.")
  }

  const organization = await prisma.organization.findFirst({
    where: { id: organizationId },
    select: { staffCanManageCatalog: true },
  })

  if (!organization?.staffCanManageCatalog) {
    throw new Error("Forbidden. Your dealership owner has not granted catalog management access.")
  }

  return { organizationId }
}

export async function getCatalogManagementAccess() {
  const { organizationId, user } = await requireAuthOrg()
  if (user.role === "OrgAdmin") return true
  if (user.role !== "BranchManager") return false

  const organization = await prisma.organization.findFirst({
    where: { id: organizationId },
    select: { staffCanManageCatalog: true },
  })
  return organization?.staffCanManageCatalog ?? false
}

// ==========================================
// 1. Vehicle Models
// ==========================================

export interface CreateVehicleModelInput {
  brand: string
  modelName: string
  defaultPrice: number
  minDownPayment?: number
  motorPower?: string
  batteryCapacity?: string
  rangePerCharge?: string
  range?: string
  topSpeed?: string
  chargingTime?: string
  imageUrl?: string
}

export interface UpdateVehicleModelInput extends CreateVehicleModelInput {
  id: string
}

function getVehicleModelData(input: CreateVehicleModelInput) {
  if (!input.brand?.trim()) throw new Error("Brand is required.")
  if (!input.modelName?.trim()) throw new Error("Model name is required.")
  if (typeof input.defaultPrice !== "number" || !Number.isFinite(input.defaultPrice) || input.defaultPrice <= 0) {
    throw new Error("Default price must be greater than 0.")
  }
  if (input.minDownPayment !== undefined && (!Number.isFinite(input.minDownPayment) || input.minDownPayment < 0)) {
    throw new Error("Minimum down payment must be zero or greater.")
  }

  const range = input.rangePerCharge?.trim() || input.range?.trim() || null
  return {
    brand: input.brand.trim(),
    modelName: input.modelName.trim(),
    defaultPrice: input.defaultPrice,
    minDownPayment: input.minDownPayment ?? Math.round(input.defaultPrice * 0.1),
    motorPower: input.motorPower?.trim() || null,
    batteryCapacity: input.batteryCapacity?.trim() || null,
    rangePerCharge: range,
    range,
    topSpeed: input.topSpeed?.trim() || null,
    chargingTime: input.chargingTime?.trim() || null,
    imageUrl: input.imageUrl?.trim() || null,
  }
}

export async function getVehicleModels() {
  try {
    const { organizationId } = await requireAuthOrg()

    const models = await prisma.vehicleModel.findMany({
      where: { organizationId },
      orderBy: { defaultPrice: "asc" },
      include: {
        _count: {
          select: {
            vehicles: {
              where: { status: VehicleStatus.InStock },
            },
          },
        },
      },
    })
    return { success: true, data: models }
  } catch (error) {
    console.error("getVehicleModels error:", error)
    return { success: false, error: (error as Error).message, data: [] }
  }
}

export async function createVehicleModel(input: CreateVehicleModelInput) {
  try {
    const { organizationId } = await requireCatalogManagement()

    const model = await prisma.vehicleModel.create({
      data: {
        organizationId,
        ...getVehicleModelData(input),
      },
    })

    revalidatePath("/dashboard/inventory")
    return { success: true, message: `EV Bike Model "${model.modelName}" added successfully!`, data: model }
  } catch (error) {
    console.error("createVehicleModel error:", error)
    return { success: false, message: (error as Error).message }
  }
}

export async function updateVehicleModel(input: UpdateVehicleModelInput) {
  try {
    const { organizationId } = await requireCatalogManagement()
    if (!input.id?.trim()) throw new Error("Model ID is required.")

    const model = await prisma.vehicleModel.updateMany({
      where: { id: input.id, organizationId },
      data: getVehicleModelData(input),
    })

    if (model.count === 0) throw new Error("EV model not found in your dealership.")
    const updatedModel = await prisma.vehicleModel.findFirstOrThrow({
      where: { id: input.id, organizationId },
    })

    revalidatePath("/dashboard/inventory")
    return { success: true, message: `EV Bike Model "${updatedModel.modelName}" updated successfully!`, data: updatedModel }
  } catch (error) {
    console.error("updateVehicleModel error:", error)
    return { success: false, message: (error as Error).message }
  }
}

export async function deleteVehicleModel(id: string) {
  try {
    const { organizationId } = await requireCatalogManagement()
    if (!id?.trim()) throw new Error("Model ID is required.")

    const model = await prisma.vehicleModel.findFirst({
      where: { id, organizationId },
      select: {
        modelName: true,
        _count: { select: { vehicles: true, testRides: true } },
      },
    })

    if (!model) throw new Error("EV model not found in your dealership.")
    if (model._count.vehicles > 0 || model._count.testRides > 0) {
      throw new Error("This model is linked to vehicles or test rides and cannot be deleted.")
    }

    const deleted = await prisma.vehicleModel.deleteMany({ where: { id, organizationId } })
    if (deleted.count !== 1) throw new Error("EV model could not be deleted because it no longer exists.")
    revalidatePath("/dashboard/inventory")
    return { success: true, message: `EV Bike Model "${model.modelName}" deleted successfully!` }
  } catch (error) {
    console.error("deleteVehicleModel error:", error)
    return { success: false, message: (error as Error).message }
  }
}

// ==========================================
// 2. Suppliers
// ==========================================

export interface CreateSupplierInput {
  name: string
  contactPerson?: string
  phone?: string
  email?: string
}

export interface UpdateSupplierInput extends CreateSupplierInput {
  id: string
}

function getSupplierData(input: CreateSupplierInput) {
  if (!input.name?.trim()) throw new Error("Supplier company name is required.")

  const email = input.email?.trim() || null
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Please provide a valid supplier email address.")
  }

  return {
    name: input.name.trim(),
    contactPerson: input.contactPerson?.trim() || null,
    phone: input.phone?.trim() || null,
    email,
  }
}

export async function getSuppliers() {
  try {
    const { organizationId } = await requireAuthOrg()

    const suppliers = await prisma.supplier.findMany({
      where: { organizationId },
      orderBy: { name: "asc" },
      include: {
        _count: {
          select: { grns: true },
        },
      },
    })
    return { success: true, data: suppliers }
  } catch (error) {
    console.error("getSuppliers error:", error)
    return { success: false, error: (error as Error).message, data: [] }
  }
}

export async function createSupplier(input: CreateSupplierInput) {
  try {
    const { organizationId } = await requireCatalogManagement()

    const supplier = await prisma.supplier.create({
      data: {
        organizationId,
        ...getSupplierData(input),
      },
    })

    revalidatePath("/dashboard/inventory")
    return {
      success: true,
      message: `Supplier "${supplier.name}" created successfully!`,
      data: supplier,
    }
  } catch (error) {
    console.error("createSupplier error:", error)
    return { success: false, message: (error as Error).message }
  }
}

export async function updateSupplier(input: UpdateSupplierInput) {
  try {
    const { organizationId } = await requireCatalogManagement()
    if (!input.id?.trim()) throw new Error("Supplier ID is required.")

    const result = await prisma.supplier.updateMany({
      where: { id: input.id, organizationId },
      data: getSupplierData(input),
    })

    if (result.count === 0) throw new Error("Supplier not found in your dealership.")
    const supplier = await prisma.supplier.findFirstOrThrow({
      where: { id: input.id, organizationId },
    })

    revalidatePath("/dashboard/inventory")
    return { success: true, message: `Supplier "${supplier.name}" updated successfully!`, data: supplier }
  } catch (error) {
    console.error("updateSupplier error:", error)
    return { success: false, message: (error as Error).message }
  }
}

export async function deleteSupplier(id: string) {
  try {
    const { organizationId } = await requireCatalogManagement()
    if (!id?.trim()) throw new Error("Supplier ID is required.")

    const supplier = await prisma.supplier.findFirst({
      where: { id, organizationId },
      select: { name: true, _count: { select: { grns: true } } },
    })

    if (!supplier) throw new Error("Supplier not found in your dealership.")
    if (supplier._count.grns > 0) {
      throw new Error("This supplier is linked to GRNs and cannot be deleted.")
    }

    const deleted = await prisma.supplier.deleteMany({ where: { id, organizationId } })
    if (deleted.count !== 1) throw new Error("Supplier could not be deleted because it no longer exists.")
    revalidatePath("/dashboard/inventory")
    return { success: true, message: `Supplier "${supplier.name}" deleted successfully!` }
  } catch (error) {
    console.error("deleteSupplier error:", error)
    return { success: false, message: (error as Error).message }
  }
}

// ==========================================
// 3. Stock Vehicles
// ==========================================

export async function getStockVehicles() {
  try {
    const { organizationId } = await requireAuthOrg()

    const vehicles = await prisma.vehicle.findMany({
      where: {
        organizationId,
        status: VehicleStatus.InStock,
      },
      include: {
        vehicleModel: true,
        branch: { select: { id: true, name: true, location: true } },
        grnItems: {
          select: {
            grn: {
              select: {
                grnNumber: true,
                receivedDate: true,
              },
            },
          },
          take: 1,
        },
      },
      orderBy: { createdAt: "desc" },
    })

    return { success: true, data: vehicles }
  } catch (error) {
    console.error("getStockVehicles error:", error)
    return { success: false, error: (error as Error).message, data: [] }
  }
}

// ==========================================
// 4. Branches
// ==========================================

export async function getDealershipBranches() {
  try {
    const { organizationId } = await requireAuthOrg()

    const branches = await prisma.branch.findMany({
      where: { organizationId },
      orderBy: { name: "asc" },
    })
    return { success: true, data: branches }
  } catch (error) {
    console.error("getDealershipBranches error:", error)
    return { success: false, error: (error as Error).message, data: [] }
  }
}

// ==========================================
// 5. GRN (Goods Received Note) Management
// ==========================================

export interface GRNVehicleItem {
  vehicleModelId: string
  chassisNumber: string
  motorNumber?: string
  batterySerialNumber?: string
  warrantyPeriod?: string
  color?: string
  purchasePrice: number
}

export interface CreateGRNInput {
  supplierId: string
  branchId: string
  totalAmount?: number
  items: GRNVehicleItem[]
}

export async function getGRNs() {
  try {
    const { organizationId } = await requireAuthOrg()

    const grns = await prisma.gRN.findMany({
      where: { organizationId },
      include: {
        supplier: { select: { id: true, name: true, phone: true } },
        branch: { select: { id: true, name: true } },
        items: {
          include: {
            vehicle: {
              include: {
                vehicleModel: { select: { id: true, brand: true, modelName: true } },
              },
            },
          },
        },
      },
      orderBy: { receivedDate: "desc" },
    })

    return { success: true, data: grns }
  } catch (error) {
    console.error("getGRNs error:", error)
    return { success: false, error: (error as Error).message, data: [] }
  }
}

export async function createGRN(input: CreateGRNInput) {
  try {
    const { organizationId } = await requireAuthOrg()

    if (!input.supplierId) throw new Error("Supplier selection is required.")
    if (!input.branchId) throw new Error("Target showroom/branch is required.")
    if (!input.items || input.items.length === 0) {
      throw new Error("At least one vehicle must be included in the GRN.")
    }

    // Validate supplier ownership
    const supplier = await prisma.supplier.findFirst({
      where: { id: input.supplierId, organizationId },
    })
    if (!supplier) throw new Error("Invalid supplier selected.")

    // Validate branch ownership
    const branch = await prisma.branch.findFirst({
      where: { id: input.branchId, organizationId },
    })
    if (!branch) throw new Error("Invalid branch selected.")

    // Validate chassis uniqueness in items
    const chassisSet = new Set<string>()
    for (const item of input.items) {
      const chassis = item.chassisNumber?.trim().toUpperCase()
      if (!chassis) throw new Error("Chassis number cannot be empty.")
      if (chassisSet.has(chassis)) {
        throw new Error(`Duplicate chassis number "${chassis}" in this GRN.`)
      }
      chassisSet.add(chassis)

      if (typeof item.purchasePrice !== "number" || item.purchasePrice <= 0) {
        throw new Error(`Purchase price for chassis "${chassis}" must be greater than 0.`)
      }
    }

    // Check if any chassis number is already registered in the database
    const existingVehicles = await prisma.vehicle.findMany({
      where: {
        chassisNumber: { in: Array.from(chassisSet) },
      },
      select: { chassisNumber: true },
    })

    if (existingVehicles.length > 0) {
      const duplicates = existingVehicles.map((v) => v.chassisNumber).join(", ")
      throw new Error(`Chassis number(s) already exist in database: ${duplicates}`)
    }

    // Calculate total amount
    const totalAmount =
      input.totalAmount && input.totalAmount > 0
        ? input.totalAmount
        : input.items.reduce((sum, item) => sum + item.purchasePrice, 0)

    // Generate readable GRN sequence number
    const count = await prisma.gRN.count({ where: { organizationId } })
    const padded = String(count + 1).padStart(4, "0")
    const grnNumber = `GRN-${new Date().getFullYear()}-${padded}`

    // Run atomic Prisma Transaction
    const grnRecord = await prisma.$transaction(async (tx) => {
      // a) Create the GRN record
      const grn = await tx.gRN.create({
        data: {
          organizationId,
          branchId: input.branchId,
          supplierId: input.supplierId,
          grnNumber,
          totalAmount,
          receivedDate: new Date(),
        },
      })

      // b) Create Vehicles & GRNItems
      for (const item of input.items) {
        const vehicle = await tx.vehicle.create({
          data: {
            organizationId,
            branchId: input.branchId,
            vehicleModelId: item.vehicleModelId,
            chassisNumber: item.chassisNumber.trim().toUpperCase(),
            motorNumber: item.motorNumber?.trim() || null,
            batterySerialNumber: item.batterySerialNumber?.trim() || null,
            warrantyPeriod: item.warrantyPeriod?.trim() || "3 Years",
            color: item.color?.trim() || "Standard",
            purchasePrice: item.purchasePrice,
            status: VehicleStatus.InStock,
          },
        })

        // c) Create GRNItem linking GRN and Vehicle
        await tx.gRNItem.create({
          data: {
            grnId: grn.id,
            vehicleId: vehicle.id,
            unitPrice: item.purchasePrice,
          },
        })
      }

      return grn
    })

    revalidatePath("/dashboard/inventory")
    revalidatePath("/dashboard")
    revalidatePath("/site/[domain]", "page")

    return {
      success: true,
      message: `GRN "${grnRecord.grnNumber}" created with ${input.items.length} vehicles added to stock!`,
      data: grnRecord,
    }
  } catch (error) {
    console.error("createGRN error:", error)
    return { success: false, message: (error as Error).message }
  }
}
