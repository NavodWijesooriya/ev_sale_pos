"use server"

import { revalidatePath } from "next/cache"
import { randomUUID } from "node:crypto"
import { prisma } from "@/lib/prisma"
import { getAuthSession } from "@/lib/auth"
import {
  AdvancePaymentStatus,
  VehicleStatus,
  PaymentMethod,
  FinanceStatus,
  DMTStatus,
  CustomerType,
} from "@prisma/client"
import { generateNextCustomerCrn } from "@/lib/customer-crn"
import {
  createNewSaleSchema,
  extendedWarrantyPrice,
  saleWarrantyOptions,
  type CreateNewSaleInput,
} from "@/lib/validations/new-sale"

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

export interface PendingCustomerAdvance {
  id: string
  amount: number
}

export async function getPendingCustomerAdvance(
  customerId: string,
): Promise<PendingCustomerAdvance | null> {
  const { organizationId } = await requireAuthOrg()
  const advance = await prisma.advancePayment.findFirst({
    where: {
      customerId,
      organizationId,
      status: AdvancePaymentStatus.PENDING,
    },
    select: { id: true, amount: true },
    orderBy: [{ advanceDate: "desc" }, { id: "desc" }],
  })

  return advance
}

export async function createNewSale(
  input: CreateNewSaleInput,
): Promise<{ success: true; saleId: string; invoiceNumber: string } | { success: false; error: string }> {
  try {
    const { organizationId, userId } = await requireAuthOrg()
    const parsedInput = createNewSaleSchema.safeParse(input)
    if (!parsedInput.success) {
      return {
        success: false,
        error: parsedInput.error.issues[0]?.message ?? "Enter valid sale details.",
      }
    }

    const data = parsedInput.data
    const advancePaymentId = data.advancePaymentId?.trim() || null
    const financeCompanyId = data.financeCompanyId?.trim() || null
    const insuranceCompanyId = data.insuranceCompanyId?.trim() || null
    const commissionRecipientId = data.commissionRecipientId?.trim() || null
    const result = await prisma.$transaction(async (tx) => {
      const [customer, vehicle, financeCompany, insuranceCompany] = await Promise.all([
        tx.customer.findFirst({
          where: { id: data.customerId, organizationId },
          select: { id: true },
        }),
        tx.vehicle.findFirst({
          where: {
            id: data.vehicleId,
            organizationId,
            status: { in: [VehicleStatus.AVAILABLE, VehicleStatus.InStock] },
          },
          include: { vehicleModel: true },
        }),
        financeCompanyId
          ? tx.financeCompany.findFirst({
              where: { id: financeCompanyId, organizationId },
              select: { id: true },
            })
          : Promise.resolve(null),
        insuranceCompanyId
          ? tx.insuranceCompany.findFirst({
              where: { id: insuranceCompanyId, organizationId },
              select: { id: true },
            })
          : Promise.resolve(null),
      ])

      if (!customer) throw new Error("The selected customer was not found.")
      if (!vehicle) throw new Error("This vehicle is no longer available. Refresh stock and choose another vehicle.")
      if (financeCompanyId && !financeCompany) {
        throw new Error("The selected finance company was not found.")
      }
      if (insuranceCompanyId && !insuranceCompany) {
        throw new Error("The selected insurance company was not found.")
      }

      const subtotal = vehicle.vehicleModel.defaultPrice
      let advanceAmount = 0
      if (advancePaymentId) {
        const advance = await tx.advancePayment.findFirst({
          where: {
            id: advancePaymentId,
            customerId: customer.id,
            organizationId,
            status: AdvancePaymentStatus.PENDING,
          },
          select: { id: true, amount: true },
        })
        if (!advance) throw new Error("The selected customer advance is no longer pending.")

        const updatedAdvance = await tx.advancePayment.updateMany({
          where: {
            id: advance.id,
            customerId: customer.id,
            organizationId,
            status: AdvancePaymentStatus.PENDING,
          },
          data: { status: AdvancePaymentStatus.USED },
        })
        if (updatedAdvance.count !== 1) {
          throw new Error("The selected advance was already used by another sale.")
        }
        advanceAmount = advance.amount
      }

      const reservedVehicle = await tx.vehicle.updateMany({
        where: {
          id: vehicle.id,
          organizationId,
          status: { in: [VehicleStatus.AVAILABLE, VehicleStatus.InStock] },
        },
        data: { status: VehicleStatus.Sold },
      })
      if (reservedVehicle.count !== 1) {
        throw new Error("This vehicle was just sold or reserved. Refresh stock and try again.")
      }

      const invoiceNumber = `INV-${Date.now()}-${randomUUID().slice(0, 8).toUpperCase()}`
      const warrantyCharge =
        data.warrantyOption === saleWarrantyOptions[1] ? extendedWarrantyPrice : 0
      const sale = await tx.sale.create({
        data: {
          organizationId,
          branchId: vehicle.branchId,
          customerId: customer.id,
          userId,
          vehicleId: vehicle.id,
          invoiceNumber,
          totalAmount: Math.max(0, subtotal + warrantyCharge - advanceAmount),
          paymentMethod: data.paymentMethod,
          warrantyOption: data.warrantyOption,
          saleDate: new Date(),
          status: "Completed",
          freeItems: data.freeItems,
          freeServices: data.freeServices,
          advancePaymentId,
          financeCompanyId,
          insuranceCompanyId,
          advanceDeducted: advanceAmount,
          financeCommission: financeCompanyId ? data.financeCommission ?? null : null,
          insuranceCommission: insuranceCompanyId ? data.insuranceCommission ?? null : null,
          commissionRecipientId: (financeCompanyId && commissionRecipientId) ? commissionRecipientId : null,
          items: {
            create: {
              vehicleId: vehicle.id,
              price: subtotal,
            },
          },
          dmtRegistration: {
            create: {
              status: DMTStatus.Pending,
              hasMTA2: false,
              hasNIC: false,
              hasPhotos: false,
              hasTIN: false,
            },
          },
        },
        select: { id: true, invoiceNumber: true },
      })

      await tx.customer.update({
        where: { id: customer.id },
        data: { customerType: CustomerType.SALE, category: "DIRECT" },
      })

      return { saleId: sale.id, invoiceNumber: sale.invoiceNumber }
    }, { maxWait: 5000, timeout: 20000 })

    revalidatePath("/dashboard/sales")
    revalidatePath("/dashboard/sales/new")
    revalidatePath("/dashboard/sales/history")
    revalidatePath("/dashboard/grn/stock")
    revalidatePath("/dashboard/customers")
    revalidatePath("/dashboard/customers/sales")
    revalidatePath("/dashboard/sales/advances")

    return { success: true, ...result }
  } catch (error) {
    console.error("createNewSale error:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unable to complete this sale.",
    }
  }
}

/**
 * Loads all in-stock vehicles, customers, branches, and active staff for the POS terminal
 */
export async function getPOSInitialData() {
  try {
    const { organizationId } = await requireAuthOrg()

    const [vehicles, customers, branches, staff] = await Promise.all([
      // Only InStock vehicles for this organization
      prisma.vehicle.findMany({
        where: {
          organizationId,
          status: { in: [VehicleStatus.AVAILABLE, VehicleStatus.InStock] },
        },
        include: {
          vehicleModel: true,
          branch: true,
          grn: { select: { grnNumber: true } },
        },
        orderBy: {
          createdAt: "desc",
        },
      }),

      // Existing customers for quick auto-complete
      prisma.customer.findMany({
        where: {
          organizationId,
          customerType: { in: [CustomerType.CRM, CustomerType.SALE] },
        },
        orderBy: { name: "asc" },
      }),

      // Dealership branches
      prisma.branch.findMany({
        where: { organizationId },
        orderBy: { name: "asc" },
      }),

      // Active staff members for commission recipient dropdown
      prisma.user.findMany({
        where: { organizationId, isActive: true },
        select: { id: true, name: true, email: true, role: true },
        orderBy: { name: "asc" },
      }),
    ])

    return {
      success: true,
      data: {
        vehicles,
        customers,
        branches,
        staff,
      },
    }
  } catch (error) {
    console.error("getPOSInitialData error:", error)
    return {
      success: false,
      error: (error as Error).message,
      data: { vehicles: [], customers: [], branches: [], staff: [] },
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
        vehicle: {
          include: {
            vehicleModel: true,
          },
        },
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
        advancePayment: {
          select: { amount: true },
        },
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
        if (existingCust) {
          const promotedCustomer = await tx.customer.update({
            where: { id: existingCust.id },
            data: {
              customerType: CustomerType.SALE,
              category: "DIRECT",
            },
          })
          customerId = promotedCustomer.id
        } else {
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
              customerType: CustomerType.SALE,
              category: "DIRECT",
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
              customerType: CustomerType.SALE,
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

      if (vehicle.status !== VehicleStatus.AVAILABLE && vehicle.status !== VehicleStatus.InStock) {
        throw new Error(
          `Vehicle (${vehicle.chassisNumber}) cannot be sold. Current status is ${vehicle.status}.`
        )
      }

      // Dynamic financial calculation: (Vehicle Price + Additional Charges) - Discount
      const discount = Math.max(0, Number(input.discount) || 0)
      const additionalCharges = Math.max(0, Number(input.additionalCharges) || 0)
      const calculatedTotal = Math.max(0, (input.salePrice + additionalCharges) - discount)
      const invoiceNumber = `INV-${Date.now()}-${randomUUID().slice(0, 8).toUpperCase()}`

      // Step C: Create Sale record
      const sale = await tx.sale.create({
        data: {
          organizationId,
          branchId: vehicle.branchId,
          customerId,
          userId,
          invoiceNumber,
          vehicleId: vehicle.id,
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
    revalidatePath("/dashboard/grn/stock")
    revalidatePath("/dashboard")
    revalidatePath("/dashboard/customers")
    revalidatePath("/dashboard/customers/crm")
    revalidatePath("/dashboard/customers/sales")

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
  registrationNumber?: string
  isBookOk?: boolean
  isNumberPlateOk?: boolean
  isInsuranceOk?: boolean
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
      include: {
        items: {
          select: { vehicleId: true },
        },
      },
    })

    if (!sale) {
      throw new Error("Sale not found in your dealership records.")
    }

    const regNo =
      input.registrationNumber !== undefined
        ? input.registrationNumber
        : input.registeredNumber
    const formattedRegNo =
      regNo !== undefined
        ? regNo.trim()
          ? regNo.trim().toUpperCase()
          : null
        : undefined

    const dmt = await prisma.dMTRegistration.upsert({
      where: { saleId: input.saleId },
      update: {
        ...(input.status !== undefined && { status: input.status }),
        ...(input.hasMTA2 !== undefined && { hasMTA2: input.hasMTA2 }),
        ...(input.hasNIC !== undefined && { hasNIC: input.hasNIC }),
        ...(input.hasPhotos !== undefined && { hasPhotos: input.hasPhotos }),
        ...(input.hasTIN !== undefined && { hasTIN: input.hasTIN }),
        ...(formattedRegNo !== undefined && {
          registeredNumber: formattedRegNo,
          registrationNumber: formattedRegNo,
        }),
        ...(input.isBookOk !== undefined && { isBookOk: input.isBookOk }),
        ...(input.isNumberPlateOk !== undefined && { isNumberPlateOk: input.isNumberPlateOk }),
        ...(input.isInsuranceOk !== undefined && { isInsuranceOk: input.isInsuranceOk }),
      },
      create: {
        saleId: input.saleId,
        status: input.status || DMTStatus.Pending,
        hasMTA2: input.hasMTA2 ?? false,
        hasNIC: input.hasNIC ?? false,
        hasPhotos: input.hasPhotos ?? false,
        hasTIN: input.hasTIN ?? false,
        registeredNumber: formattedRegNo ?? null,
        registrationNumber: formattedRegNo ?? null,
        isBookOk: input.isBookOk ?? false,
        isNumberPlateOk: input.isNumberPlateOk ?? false,
        isInsuranceOk: input.isInsuranceOk ?? false,
      },
    })

    if (formattedRegNo !== undefined && sale.items.length > 0) {
      await prisma.vehicle.updateMany({
        where: { id: { in: sale.items.map((i) => i.vehicleId) } },
        data: { registrationNumber: formattedRegNo },
      })
    }

    revalidatePath(`/dashboard/customers/${sale.customerId}`)
    revalidatePath("/dashboard/customers")
    revalidatePath("/dashboard/customers/rmv")
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

export interface UpdateVehicleDocumentStatusInput {
  saleId: string
  isBookOk?: boolean
  isNumberPlateOk?: boolean
  isInsuranceOk?: boolean
  registrationNumber?: string
}

/**
 * Fast-update action for the three key RMV documents and plate number
 */
export async function updateVehicleDocumentStatus(input: UpdateVehicleDocumentStatusInput) {
  try {
    const { organizationId } = await requireAuthOrg()

    if (!input.saleId) {
      throw new Error("Sale ID is required.")
    }

    const sale = await prisma.sale.findFirst({
      where: { id: input.saleId, organizationId },
      include: {
        items: {
          select: { vehicleId: true },
        },
      },
    })

    if (!sale) {
      throw new Error("Sale not found in your dealership records.")
    }

    const regNo =
      input.registrationNumber !== undefined
        ? input.registrationNumber.trim()
          ? input.registrationNumber.trim().toUpperCase()
          : null
        : undefined

    const dmt = await prisma.dMTRegistration.upsert({
      where: { saleId: input.saleId },
      update: {
        ...(input.isBookOk !== undefined && { isBookOk: input.isBookOk }),
        ...(input.isNumberPlateOk !== undefined && { isNumberPlateOk: input.isNumberPlateOk }),
        ...(input.isInsuranceOk !== undefined && { isInsuranceOk: input.isInsuranceOk }),
        ...(regNo !== undefined && {
          registrationNumber: regNo,
          registeredNumber: regNo,
        }),
      },
      create: {
        saleId: input.saleId,
        isBookOk: input.isBookOk ?? false,
        isNumberPlateOk: input.isNumberPlateOk ?? false,
        isInsuranceOk: input.isInsuranceOk ?? false,
        registrationNumber: regNo ?? null,
        registeredNumber: regNo ?? null,
      },
    })

    if (regNo !== undefined && sale.items.length > 0) {
      await prisma.vehicle.updateMany({
        where: { id: { in: sale.items.map((i) => i.vehicleId) } },
        data: { registrationNumber: regNo },
      })
    }

    revalidatePath(`/dashboard/customers/${sale.customerId}`)
    revalidatePath("/dashboard/customers")
    revalidatePath("/dashboard/customers/rmv")
    revalidatePath(`/dashboard/sales/${input.saleId}`)
    revalidatePath("/dashboard/sales")

    return {
      success: true,
      message: "Vehicle document tracking status updated successfully!",
      data: dmt,
    }
  } catch (error) {
    console.error("updateVehicleDocumentStatus error:", error)
    return {
      success: false,
      error: (error as Error).message || "Failed to update vehicle document status.",
    }
  }
}

/**
 * Logs customer SMS / WhatsApp notification timestamp
 */
export async function logCustomerNotification({ saleId }: { saleId: string }) {
  try {
    const { organizationId } = await requireAuthOrg()

    if (!saleId) {
      throw new Error("Sale ID is required.")
    }

    const sale = await prisma.sale.findFirst({
      where: { id: saleId, organizationId },
      select: { id: true, customerId: true },
    })

    if (!sale) {
      throw new Error("Sale not found in your dealership records.")
    }

    const now = new Date()

    const dmt = await prisma.dMTRegistration.upsert({
      where: { saleId },
      update: {
        lastNotifiedAt: now,
      },
      create: {
        saleId,
        lastNotifiedAt: now,
      },
    })

    revalidatePath(`/dashboard/customers/${sale.customerId}`)
    revalidatePath("/dashboard/customers")
    revalidatePath("/dashboard/customers/rmv")
    revalidatePath(`/dashboard/sales/${saleId}`)

    return {
      success: true,
      message: "Customer notification logged successfully!",
      lastNotifiedAt: now,
      data: dmt,
    }
  } catch (error) {
    console.error("logCustomerNotification error:", error)
    return {
      success: false,
      error: (error as Error).message || "Failed to log notification.",
    }
  }
}

/**
 * Retrieves all sales with DMT / RMV registration tracking records for the organization
 */
export async function getRMVRegistry() {
  try {
    const { organizationId } = await requireAuthOrg()

    const sales = await prisma.sale.findMany({
      where: { organizationId },
      orderBy: { saleDate: "desc" },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            phone: true,
            nic: true,
            address: true,
          },
        },
        branch: {
          select: {
            id: true,
            name: true,
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
        dmtRegistration: true,
      },
    })

    return {
      success: true,
      data: sales,
    }
  } catch (error) {
    console.error("getRMVRegistry error:", error)
    return {
      success: false,
      error: (error as Error).message || "Failed to load RMV registry records.",
      data: [],
    }
  }
}
