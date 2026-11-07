"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { getAuthSession } from "@/lib/auth"
import { VehicleStatus, PaymentMethod, FinanceStatus, DMTStatus } from "@prisma/client"
import { generateNextCustomerCrn } from "@/lib/customer-crn"

/**
 * Enforces session authentication and extracts the user's organizationId and userId
 */
async function requireAuthOrg() {
  const session = await getAuthSession()
  if (!session?.user?.organizationId) {
    throw new Error("Unauthorized. Please log in to your dealership portal.")
  }
  return {
    organizationId: session.user.organizationId,
    userId: session.user.id,
    user: session.user,
  }
}

export interface ProcessSaleInput {
  // Customer info
  customerId?: string // If existing customer chosen
  customerName: string
  customerPhone: string
  customerNic?: string
  customerEmail?: string
  customerAddress?: string

  // Vehicle info
  vehicleId: string
  salePrice: number
  discount?: number
  additionalCharges?: number
  deliveryDate?: Date | string

  // Payment info
  paymentMethod: PaymentMethod
  financeCompany?: string
  totalFinanceAmount?: number
  downPaymentPaid?: number
  dealerCommission?: number
}

/**
 * Loads all in-stock vehicles, customers, and branches for the POS terminal
 */
export async function getPOSInitialData() {
  try {
    const { organizationId } = await requireAuthOrg()

    const [vehicles, customers, branches] = await Promise.all([
      // Only InStock vehicles for this organization
      prisma.vehicle.findMany({
        where: {
          organizationId,
          status: VehicleStatus.InStock,
        },
        include: {
          vehicleModel: true,
          branch: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      }),

      // Existing customers for quick auto-complete
      prisma.customer.findMany({
        where: { organizationId },
        orderBy: { name: "asc" },
        take: 100,
      }),

      // Dealership branches
      prisma.branch.findMany({
        where: { organizationId },
        orderBy: { name: "asc" },
      }),
    ])

    return {
      success: true,
      data: {
        vehicles,
        customers,
        branches,
      },
    }
  } catch (error) {
    console.error("getPOSInitialData error:", error)
    return {
      success: false,
      error: (error as Error).message,
      data: { vehicles: [], customers: [], branches: [] },
    }
  }
}

/**
 * Loads sales history with comprehensive customer, vehicle, user and finance details
 */
export async function getSalesHistory() {
  try {
    const { organizationId } = await requireAuthOrg()

    const sales = await prisma.sale.findMany({
      where: { organizationId },
      orderBy: { saleDate: "desc" },
      include: {
        customer: true,
        soldBy: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        branch: {
          select: {
            id: true,
            name: true,
            location: true,
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
    })

    return {
      success: true,
      data: sales,
    }
  } catch (error) {
    console.error("getSalesHistory error:", error)
    return {
      success: false,
      error: (error as Error).message,
      data: [],
    }
  }
}

/**
 * Process a vehicle sale with an atomic Prisma Transaction:
 * 1. Upsert / connect Customer
 * 2. Verify selected Vehicle is currently InStock
 * 3. Create Sale record
 * 4. Create SaleItem record
 * 5. Update Vehicle status to Sold
 * 6. Create FinanceDetail if Finance or SplitPayment
 */
export async function processSale(input: ProcessSaleInput) {
  try {
    const { organizationId, userId } = await requireAuthOrg()

    // 1. Validation
    if (!input.vehicleId?.trim()) {
      throw new Error("Please select a vehicle to proceed with the sale.")
    }
    if (!input.customerName?.trim()) {
      throw new Error("Customer name is required.")
    }
    if (!input.customerPhone?.trim()) {
      throw new Error("Customer phone number is required.")
    }
    if (!input.salePrice || input.salePrice <= 0) {
      throw new Error("A valid sale price greater than 0 is required.")
    }
    if (!input.paymentMethod) {
      throw new Error("Payment method is required.")
    }

    const isFinance =
      input.paymentMethod === PaymentMethod.Finance ||
      input.paymentMethod === PaymentMethod.SplitPayment

    if (isFinance) {
      if (!input.financeCompany?.trim()) {
        throw new Error("Finance company name is required for Finance/Split Payment.")
      }
      if (input.totalFinanceAmount === undefined || input.totalFinanceAmount < 0) {
        throw new Error("Valid finance amount is required.")
      }
      if (input.downPaymentPaid === undefined || input.downPaymentPaid < 0) {
        throw new Error("Down payment amount is required.")
      }
    }

    // 2. Atomic Prisma Transaction
    const result = await prisma.$transaction(async (tx) => {
      // Step A: Customer resolution
      let customerId = input.customerId

      if (customerId) {
        // Validate customer belongs to this organization
        const existingCust = await tx.customer.findFirst({
          where: { id: customerId, organizationId },
        })
        if (!existingCust) {
          customerId = undefined
        }
      }

      if (!customerId) {
        // Check if customer already exists with this phone or NIC within tenant
        const matchingCust = await tx.customer.findFirst({
          where: {
            organizationId,
            OR: [
              { phone: input.customerPhone.trim() },
              ...(input.customerNic?.trim() ? [{ nic: input.customerNic.trim() }] : []),
            ],
          },
        })

        if (matchingCust) {
          // Update customer information
          const updatedCust = await tx.customer.update({
            where: { id: matchingCust.id },
            data: {
              name: input.customerName.trim(),
              email: input.customerEmail?.trim() || matchingCust.email,
              address: input.customerAddress?.trim() || matchingCust.address,
              nic: input.customerNic?.trim() || matchingCust.nic,
            },
          })
          customerId = updatedCust.id
        } else {
          // Create new customer
          const crn = await generateNextCustomerCrn(tx)
          const newCust = await tx.customer.create({
            data: {
              organizationId,
              category: "DIRECT",
              name: input.customerName.trim(),
              phone: input.customerPhone.trim(),
              email: input.customerEmail?.trim() || null,
              nic: input.customerNic?.trim() || null,
              address: input.customerAddress?.trim() || null,
              crn,
            },
          })
          customerId = newCust.id
        }
      }

      // Step B: Verify vehicle is InStock and belongs to this organization
      const vehicle = await tx.vehicle.findFirst({
        where: {
          id: input.vehicleId,
          organizationId,
        },
        include: {
          vehicleModel: true,
        },
      })

      if (!vehicle) {
        throw new Error("Vehicle not found in your dealership inventory.")
      }

      if (vehicle.status !== VehicleStatus.InStock) {
        throw new Error(
          `Vehicle (${vehicle.chassisNumber}) cannot be sold. Current status is ${vehicle.status}.`
        )
      }

      // Dynamic financial calculation: (Vehicle Price + Additional Charges) - Discount
      const discount = Math.max(0, Number(input.discount) || 0)
      const additionalCharges = Math.max(0, Number(input.additionalCharges) || 0)
      const calculatedTotal = Math.max(0, (input.salePrice + additionalCharges) - discount)

      // Step C: Create Sale record
      const sale = await tx.sale.create({
        data: {
          organizationId,
          branchId: vehicle.branchId,
          customerId,
          userId,
          totalAmount: calculatedTotal,
          discount,
          additionalCharges,
          deliveryDate: input.deliveryDate ? new Date(input.deliveryDate) : new Date(),
          paymentMethod: input.paymentMethod,
          status: "Completed",
          saleDate: new Date(),
        },
      })

      // Step D: Create SaleItem record
      const saleItem = await tx.saleItem.create({
        data: {
          saleId: sale.id,
          vehicleId: vehicle.id,
          price: input.salePrice,
        },
      })

      // Step E: Update Vehicle status from InStock to Sold
      await tx.vehicle.update({
        where: { id: vehicle.id },
        data: {
          status: VehicleStatus.Sold,
        },
      })

      // Step F: Create FinanceDetail record if applicable
      let financeRecord = null
      if (isFinance) {
        financeRecord = await tx.financeDetail.create({
          data: {
            saleId: sale.id,
            financeCompany: input.financeCompany!.trim(),
            totalFinanceAmount: Number(input.totalFinanceAmount) || 0,
            downPaymentPaid: Number(input.downPaymentPaid) || 0,
            dealerCommission: input.dealerCommission !== undefined ? Number(input.dealerCommission) : null,
            status: FinanceStatus.Pending,
          },
        })
      }

      // Step G: Automatically create an empty DMTRegistration record linked to the new Sale
      const dmtRecord = await tx.dMTRegistration.create({
        data: {
          saleId: sale.id,
          status: DMTStatus.Pending,
          hasMTA2: false,
          hasNIC: false,
          hasPhotos: false,
          hasTIN: false,
        },
      })

      return {
        sale,
        saleItem,
        chassisNumber: vehicle.chassisNumber,
        modelName: `${vehicle.vehicleModel.brand} ${vehicle.vehicleModel.modelName}`,
        financeRecord,
        dmtRecord,
      }
    })

    // Revalidate affected pages
    revalidatePath("/dashboard/sales")
    revalidatePath("/dashboard/inventory")
    revalidatePath("/dashboard")

    return {
      success: true,
      message: `Sale successfully completed for ${result.modelName} (VIN: ${result.chassisNumber})!`,
      saleId: result.sale.id,
    }
  } catch (error) {
    console.error("processSale error:", error)
    return {
      success: false,
      error: (error as Error).message || "Failed to process sale.",
    }
  }
}

/**
 * Fetch a single sale's comprehensive overview, customer, vehicle, warranty, finance, and DMT record
 */
export async function getSaleDetails(saleId: string) {
  try {
    const { organizationId } = await requireAuthOrg()

    const sale = await prisma.sale.findFirst({
      where: { id: saleId, organizationId },
      include: {
        organization: true,
        branch: true,
        customer: true,
        soldBy: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
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
    })

    if (!sale) {
      return { success: false, error: "Sale not found in your dealership records.", data: null }
    }

    return { success: true, data: sale }
  } catch (error) {
    console.error("getSaleDetails error:", error)
    return { success: false, error: (error as Error).message, data: null }
  }
}

export interface UpdateDMTRegistrationInput {
  saleId: string
  status?: DMTStatus
  hasMTA2?: boolean
  hasNIC?: boolean
  hasPhotos?: boolean
  hasTIN?: boolean
  registeredNumber?: string
}

/**
 * Updates the DMT Registration details and document checklist for an EV sale
 */
export async function updateDMTRegistration(input: UpdateDMTRegistrationInput) {
  try {
    const { organizationId } = await requireAuthOrg()

    if (!input.saleId) {
      throw new Error("Sale ID is required.")
    }

    // Verify sale ownership
    const sale = await prisma.sale.findFirst({
      where: { id: input.saleId, organizationId },
    })

    if (!sale) {
      throw new Error("Sale not found in your dealership records.")
    }

    const dmt = await prisma.dMTRegistration.upsert({
      where: { saleId: input.saleId },
      update: {
        ...(input.status !== undefined && { status: input.status }),
        ...(input.hasMTA2 !== undefined && { hasMTA2: input.hasMTA2 }),
        ...(input.hasNIC !== undefined && { hasNIC: input.hasNIC }),
        ...(input.hasPhotos !== undefined && { hasPhotos: input.hasPhotos }),
        ...(input.hasTIN !== undefined && { hasTIN: input.hasTIN }),
        ...(input.registeredNumber !== undefined && {
          registeredNumber: input.registeredNumber.trim() || null,
        }),
      },
      create: {
        saleId: input.saleId,
        status: input.status || DMTStatus.Pending,
        hasMTA2: input.hasMTA2 ?? false,
        hasNIC: input.hasNIC ?? false,
        hasPhotos: input.hasPhotos ?? false,
        hasTIN: input.hasTIN ?? false,
        registeredNumber: input.registeredNumber?.trim() || null,
      },
    })

    revalidatePath(`/dashboard/sales/${input.saleId}`)
    revalidatePath(`/dashboard/sales/${input.saleId}/invoice`)
    revalidatePath("/dashboard/sales")

    return {
      success: true,
      message: "DMT registration status updated successfully!",
      data: dmt,
    }
  } catch (error) {
    console.error("updateDMTRegistration error:", error)
    return {
      success: false,
      error: (error as Error).message || "Failed to update DMT registration.",
    }
  }
}
