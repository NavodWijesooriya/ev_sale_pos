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
import { recordAudit } from "@/lib/audit"
import { applyDmtPatch, dmtRevalidationPaths } from "@/lib/dmt-server"
import { loadFullInsuranceCommission } from "@/lib/commission-settings"
import { initialFinanceTracking } from "@/lib/finance-receivables"
import { loadSaleChargeSettings } from "@/lib/sale-charges"
import { normalizeTin } from "@/lib/validations/tin"
import { findNicConflict, isNicUniqueViolation, nicConflictMessage, NIC_RACE_MESSAGE, normalizeNic } from "@/lib/nic"
import { branchFilter, hasPermission } from "@/lib/permissions"
import { redactForUser } from "@/lib/redact"
import {
  createNewSaleSchema,
  extendedWarrantyPrice,
  insuranceCommissionFor,
  rmvChargeFor,
  saleWarrantyOptions,
  type CreateNewSaleInput,
} from "@/lib/validations/new-sale"

type AuthorizedSaleUser = Parameters<typeof applyDmtPatch>[0]

/** Only the dealership owner / platform admin may see or set commissions. */
const COMMISSION_ROLES = ["OrgAdmin", "SuperAdmin"]
const canManageCommissions = (role: string) => COMMISSION_ROLES.includes(role)

/**
 * Enforces session authentication and extracts the user's organizationId and userId
 */
async function requireAuthOrg() {
  const session = await getAuthSession()
  if (!session?.user?.organizationId) {
    throw new Error("Unauthorized. Please log in to your dealership portal.")
  }
  // Every sales action (POS, history, invoices, DMT paperwork) needs the Create sales permission.
  if (!hasPermission(session.user, "CREATE_SALE")) {
    throw new Error("You do not have permission to create or manage sales.")
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
  tinNumber: string | null
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
    select: { id: true, amount: true, tinNumber: true },
    orderBy: [{ advanceDate: "desc" }, { id: "desc" }],
  })

  return advance
}

export async function createNewSale(
  input: CreateNewSaleInput,
): Promise<{ success: true; saleId: string; invoiceNumber: string } | { success: false; error: string }> {
  try {
    const { organizationId, userId, user } = await requireAuthOrg()
    const actor = { id: user.id, name: user.name, organizationId, branchId: user.branchId }
    const commissionsAllowed = canManageCommissions(user.role)
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
    // Non-owner/admin users can never set commissions: anything sent by the client is ignored.
    const commissionRecipientId = commissionsAllowed ? data.commissionRecipientId?.trim() || null : null
    // All read-only lookups happen BEFORE the transaction so it only holds the writes (a slow database
    // used to push the whole checkout past the interactive-transaction timeout). The vehicle and advance
    // guards below are compare-and-set updates inside the transaction, so a stale read here can never
    // sell a bike twice or use an advance twice.
    const [customer, vehicle, financeCompany, insuranceCompany, pendingAdvance, fullInsuranceAmount, chargeSettings] = await Promise.all([
      prisma.customer.findFirst({
        where: { id: data.customerId, organizationId },
        select: { id: true },
      }),
      prisma.vehicle.findFirst({
        where: {
          id: data.vehicleId,
          organizationId,
          // Branch-assigned staff can only sell bikes from their own branch
          ...branchFilter(user),
          status: VehicleStatus.AVAILABLE,
        },
        include: { vehicleModel: true },
      }),
      financeCompanyId
        ? prisma.financeCompany.findFirst({
            where: { id: financeCompanyId, organizationId },
            select: { id: true, name: true, defaultCommissionRate: true },
          })
        : Promise.resolve(null),
      insuranceCompanyId
        ? prisma.insuranceCompany.findFirst({
            where: { id: insuranceCompanyId, organizationId },
            select: { id: true },
          })
        : Promise.resolve(null),
      advancePaymentId
        ? prisma.advancePayment.findFirst({
            where: {
              id: advancePaymentId,
              customerId: data.customerId,
              organizationId,
              status: AdvancePaymentStatus.PENDING,
            },
            select: { id: true, amount: true, tinNumber: true, vehicleId: true },
          })
        : Promise.resolve(null),
      commissionsAllowed ? loadFullInsuranceCommission(prisma, organizationId) : Promise.resolve(0),
      loadSaleChargeSettings(prisma, organizationId),
    ])

    if (!customer) throw new Error("The selected customer was not found.")
    if (!vehicle) throw new Error("This vehicle is no longer available. Refresh stock and choose another vehicle.")
    if (financeCompanyId && !financeCompany) {
      throw new Error("The selected finance company was not found.")
    }
    if (insuranceCompanyId && !insuranceCompany) {
      throw new Error("The selected insurance company was not found.")
    }
    if (advancePaymentId && !pendingAdvance) throw new Error("The selected customer advance is no longer pending.")

    const subtotal = vehicle.vehicleModel.defaultPrice
    const advanceAmount = pendingAdvance?.amount ?? 0
    const result = await prisma.$transaction(async (tx) => {
      if (pendingAdvance) {
        const advance = pendingAdvance
        const updatedAdvance = await tx.advancePayment.updateMany({
          where: {
            id: advance.id,
            customerId: customer.id,
            organizationId,
            status: AdvancePaymentStatus.PENDING,
          },
          // An advance that booked only a bike model (nothing in stock then) is linked to the bike actually sold.
          data: {
            status: AdvancePaymentStatus.USED,
            ...(advance.vehicleId ? {} : { vehicleId: vehicle.id, vehicleModelId: vehicle.vehicleModelId }),
          },
        })
        if (updatedAdvance.count !== 1) {
          throw new Error("The selected advance was already used by another sale.")
        }
      }

      const reservedVehicle = await tx.vehicle.updateMany({
        where: {
          id: vehicle.id,
          organizationId,
          status: VehicleStatus.AVAILABLE,
        },
        data: { status: VehicleStatus.Sold },
      })
      if (reservedVehicle.count !== 1) {
        throw new Error("This vehicle was just sold or reserved. Refresh stock and try again.")
      }

      const invoiceNumber = `INV-${Date.now()}-${randomUUID().slice(0, 8).toUpperCase()}`
      const warrantyCharge =
        data.warrantyOption === saleWarrantyOptions[1] ? extendedWarrantyPrice : 0
      const isFinance = data.paymentType === "FINANCE" || Boolean(financeCompanyId)
      // Customer-paid charges are decided here from the owner's settings (never taken from the client) and saved
      // on the sale, so a later settings change does not touch this sale. They are not part of the commission basis
      // or of the finance amount: the finance loan (and the receivable) cover the bike price only.
      const rmvCharge = rmvChargeFor(chargeSettings, isFinance)
      const thirdPartyInsurance = data.thirdPartyInsurance ? chargeSettings.thirdPartyInsurance : 0
      const financeAmt = isFinance ? (data.financeAmount ?? 0) : 0
      const downPmt = isFinance ? (data.downPayment ?? 0) : 0
      const financeCommissionApplies = isFinance && commissionsAllowed
      const commBasis = financeCommissionApplies ? (data.commissionBasis ?? "FINANCE_AMOUNT") : "FINANCE_AMOUNT"
      // Finance commission is auto-calculated from the owner's configured rate for the
      // finance company; an owner may still override the amount in the form.
      const configuredRate = financeCompany?.defaultCommissionRate ?? 0
      const commRate = financeCommissionApplies ? (data.commissionRate ?? configuredRate) : 0
      const autoFinanceCommission = Math.round((financeAmt * configuredRate) / 100)
      const finalCommissionAmt = financeCommissionApplies
        ? (data.commissionAmount ?? data.financeCommission ?? autoFinanceCommission)
        : 0
      // Insurance commission is computed here, never taken from the client:
      // Rs. 2,000 for Full Insurance on a cash sale, otherwise 0.
      const insuranceType = data.insuranceType
      const insuranceCommissionAmt = commissionsAllowed
        ? insuranceCommissionFor(insuranceType, isFinance, fullInsuranceAmount)
        : 0
      const effectiveInsuranceCompanyId = insuranceType === "FULL_DEALER" ? insuranceCompanyId : null

      const sale = await tx.sale.create({
        data: {
          organizationId,
          branchId: vehicle.branchId,
          customerId: customer.id,
          userId,
          vehicleId: vehicle.id,
          invoiceNumber,
          totalAmount: Math.max(0, subtotal + warrantyCharge + rmvCharge + thirdPartyInsurance - advanceAmount),
          rmvCharge,
          thirdPartyInsurance,
          // The TIN typed on the sale wins; otherwise the one captured with the advance being used.
          tinNumber: normalizeTin(data.tinNumber) ?? normalizeTin(pendingAdvance?.tinNumber),
          paymentMethod: isFinance ? (data.paymentMethod === "Cash" ? "Leasing" : data.paymentMethod) : data.paymentMethod,
          paymentType: isFinance ? "FINANCE" : "CASH",
          financeAmount: financeAmt,
          downPayment: downPmt,
          commissionBasis: commBasis,
          commissionRate: commRate,
          commissionAmount: finalCommissionAmt,
          warrantyOption: data.warrantyOption,
          saleDate: new Date(),
          status: "Completed",
          freeItems: data.freeItems,
          freeServices: data.freeServices,
          advancePaymentId,
          financeCompanyId: isFinance ? financeCompanyId : null,
          insuranceCompanyId: effectiveInsuranceCompanyId,
          insuranceType,
          advanceDeducted: advanceAmount,
          financeCommission: isFinance ? finalCommissionAmt : null,
          insuranceCommission: insuranceCommissionAmt,
          commissionRecipientId,
          items: {
            create: {
              vehicleId: vehicle.id,
              price: subtotal,
            },
          },
          ...(isFinance && financeCompanyId ? {
            financeDetail: {
              create: {
                financeCompany: financeCompany?.name || "Finance Company",
                totalFinanceAmount: financeAmt,
                downPaymentPaid: downPmt,
                dealerCommission: finalCommissionAmt || null,
                // The finance company now owes the dealership the finance amount (tracked as a receivable)
                financeCompanyId,
                ...initialFinanceTracking(financeAmt),
              },
            },
          } : {}),
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

      await recordAudit(tx, actor, {
        action: "SALE_CREATED",
        entityType: "Sale",
        entityId: sale.id,
        branchId: vehicle.branchId,
        description: `Invoice ${sale.invoiceNumber}: ${vehicle.vehicleModel.brand} ${vehicle.vehicleModel.modelName} (${vehicle.chassisNumber}), ${isFinance ? "finance" : "cash"} sale (RMV ${rmvCharge}, third-party insurance ${thirdPartyInsurance})`,
      })

      await tx.customer.update({
        where: { id: customer.id },
        data: { customerType: CustomerType.SALE, category: "DIRECT" },
      })

      return { saleId: sale.id, invoiceNumber: sale.invoiceNumber }
    }, { maxWait: 10000, timeout: 30000 })

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
    const { organizationId, user } = await requireAuthOrg()

    const [vehicles, customers, branches, staff] = await Promise.all([
      // Only AVAILABLE (in stock) vehicles for this organization (and the user's branch, if assigned)
      prisma.vehicle.findMany({
        where: {
          organizationId,
          ...branchFilter(user),
          status: VehicleStatus.AVAILABLE,
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
        where: { organizationId, ...(branchFilter(user).branchId ? { id: branchFilter(user).branchId } : {}) },
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
        vehicles: redactForUser(vehicles, user),
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
    const { organizationId, user } = await requireAuthOrg()

    const sales = await prisma.sale.findMany({
      where: { organizationId, ...branchFilter(user) },
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
        financeCompany: {
          select: { id: true, name: true },
        },
        dmtRegistration: true,
        advancePayment: {
          select: { amount: true },
        },
      },
    })

    return {
      success: true,
      data: redactForUser(sales, user),
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
 * 2. Verify selected Vehicle is currently AVAILABLE (in stock)
 * 3. Create Sale record
 * 4. Create SaleItem record
 * 5. Update Vehicle status to Sold
 * 6. Create FinanceDetail if Finance or SplitPayment
 */
export async function processSale(input: ProcessSaleInput) {
  try {
    const { organizationId, userId, user } = await requireAuthOrg()
    // Commissions are owner/admin only; ignore any dealerCommission sent by other roles.
    const dealerCommission = canManageCommissions(user.role) ? input.dealerCommission : undefined
    // A discount may only be given by someone allowed to approve discounts.
    if ((Number(input.discount) || 0) > 0 && !hasPermission(user, "APPROVE_DISCOUNTS")) {
      throw new Error("You do not have permission to approve discounts.")
    }

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

    const inputNic = normalizeNic(input.customerNic)

    // 2. Read-only lookups BEFORE the transaction, so it only holds the writes (see createNewSale).
    // The vehicle claim below is a compare-and-set update, so a stale read here cannot double-sell a bike.
    const existingCust = input.customerId
      ? await prisma.customer.findFirst({ where: { id: input.customerId, organizationId } })
      : null
    const matchingCust = existingCust
      ? null
      : await prisma.customer.findFirst({
          where: {
            organizationId,
            OR: [
              { phone: input.customerPhone.trim() },
              ...(inputNic ? [{ nic: inputNic }] : []),
            ],
          },
        })
    // The NIC may already belong to a different customer than the one matched by phone.
    if (matchingCust && inputNic && inputNic !== matchingCust.nic) {
      const clash = await findNicConflict(prisma, organizationId, inputNic, matchingCust.id)
      if (clash) throw new Error(nicConflictMessage(clash))
    }

    // Step B: Verify vehicle is AVAILABLE (in stock) and belongs to this organization
    const vehicle = await prisma.vehicle.findFirst({
      where: { id: input.vehicleId, organizationId },
      include: { vehicleModel: true },
    })
    if (!vehicle) {
      throw new Error("Vehicle not found in your dealership inventory.")
    }
    if (vehicle.status !== VehicleStatus.AVAILABLE) {
      throw new Error(`Vehicle (${vehicle.chassisNumber}) cannot be sold. Current status is ${vehicle.status}.`)
    }

    // Link the receivable to the registered finance company when the name matches one
    const financeCompanyName = isFinance ? input.financeCompany!.trim() : ""
    const matchedCompany = isFinance
      ? await prisma.financeCompany.findFirst({
          where: { organizationId, name: { equals: financeCompanyName, mode: "insensitive" } },
          select: { id: true },
        })
      : null

    // 3. Atomic Prisma Transaction: writes only
    const result = await prisma.$transaction(async (tx) => {
      // Step A: Customer resolution
      let customerId: string | undefined

      if (existingCust) {
        const promotedCustomer = await tx.customer.update({
          where: { id: existingCust.id },
          data: {
            customerType: CustomerType.SALE,
            category: "DIRECT",
          },
        })
        customerId = promotedCustomer.id
      }

      if (!customerId) {
        if (matchingCust) {
          // Update customer information
          const updatedCust = await tx.customer.update({
            where: { id: matchingCust.id },
            data: {
              name: input.customerName.trim(),
              email: input.customerEmail?.trim() || matchingCust.email,
              address: input.customerAddress?.trim() || matchingCust.address,
              nic: inputNic ?? matchingCust.nic,
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
              nic: inputNic,
              address: input.customerAddress?.trim() || null,
              crn,
            },
          })
          customerId = newCust.id
        }
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
          paymentType: isFinance ? "FINANCE" : "CASH",
          financeAmount: isFinance ? (Number(input.totalFinanceAmount) || 0) : 0,
          downPayment: isFinance ? (Number(input.downPaymentPaid) || 0) : 0,
          commissionAmount: isFinance && dealerCommission ? Number(dealerCommission) : 0,
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

      // Step E: Atomically claim the vehicle. The status filter makes concurrent
      // sales of the same bike fail instead of both succeeding.
      const claimed = await tx.vehicle.updateMany({
        where: {
          id: vehicle.id,
          organizationId,
          status: VehicleStatus.AVAILABLE,
        },
        data: { status: VehicleStatus.Sold },
      })
      if (claimed.count !== 1) {
        throw new Error("This vehicle was just sold or reserved. Refresh stock and try again.")
      }

      // Step F: Create FinanceDetail record if applicable
      let financeRecord = null
      if (isFinance) {
        const companyName = financeCompanyName
        const loanAmount = Number(input.totalFinanceAmount) || 0
        financeRecord = await tx.financeDetail.create({
          data: {
            saleId: sale.id,
            financeCompany: companyName,
            totalFinanceAmount: loanAmount,
            downPaymentPaid: Number(input.downPaymentPaid) || 0,
            dealerCommission: dealerCommission !== undefined ? Number(dealerCommission) : null,
            financeCompanyId: matchedCompany?.id ?? null,
            ...initialFinanceTracking(loanAmount),
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
    }, { maxWait: 10000, timeout: 30000 })

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
    if (isNicUniqueViolation(error)) return { success: false, error: NIC_RACE_MESSAGE }
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
    const { organizationId, user } = await requireAuthOrg()

    const sale = await prisma.sale.findFirst({
      where: { id: saleId, organizationId, ...branchFilter(user) },
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
        financeCompany: {
          select: { id: true, name: true },
        },
        dmtRegistration: true,
      },
    })

    if (!sale) {
      return { success: false, error: "Sale not found in your dealership records.", data: null }
    }

    return { success: true, data: redactForUser(sale, user) }
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
    const { user } = await requireAuthOrg()
    if (!input.saleId) throw new Error("Sale ID is required.")

    // The DMT workflow rules (and the derived status) live in lib/dmt-server.ts.
    const { dmt, customerId, vehicleIds } = await applyDmtPatch(user as AuthorizedSaleUser, input.saleId, {
      status: input.status,
      hasMTA2: input.hasMTA2,
      hasNIC: input.hasNIC,
      hasPhotos: input.hasPhotos,
      hasTIN: input.hasTIN,
      registrationNumber: input.registrationNumber ?? input.registeredNumber,
      isBookOk: input.isBookOk,
      isNumberPlateOk: input.isNumberPlateOk,
      isInsuranceOk: input.isInsuranceOk,
    })
    for (const path of dmtRevalidationPaths(input.saleId, customerId, vehicleIds)) revalidatePath(path)

    return { success: true, message: "DMT registration status updated successfully!", data: dmt }
  } catch (error) {
    console.error("updateDMTRegistration error:", error)
    return { success: false, error: (error as Error).message || "Failed to update DMT registration." }
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
    const { user } = await requireAuthOrg()
    if (!input.saleId) throw new Error("Sale ID is required.")

    const { dmt, customerId, vehicleIds } = await applyDmtPatch(user as AuthorizedSaleUser, input.saleId, {
      isBookOk: input.isBookOk,
      isNumberPlateOk: input.isNumberPlateOk,
      isInsuranceOk: input.isInsuranceOk,
      registrationNumber: input.registrationNumber,
    })
    for (const path of dmtRevalidationPaths(input.saleId, customerId, vehicleIds)) revalidatePath(path)

    return { success: true, message: "Vehicle document tracking status updated successfully!", data: dmt }
  } catch (error) {
    console.error("updateVehicleDocumentStatus error:", error)
    return { success: false, error: (error as Error).message || "Failed to update vehicle document status." }
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
    const { organizationId, user } = await requireAuthOrg()

    const sales = await prisma.sale.findMany({
      where: { organizationId, ...branchFilter(user) },
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
