"use server"

/**
 * Received documents: Delivery Orders (finance sales) and RMV document hand-over.
 *
 * Reading needs one of the sales / customers / finance-receivable / documents permissions; every change needs
 * MANAGE_DOCUMENTS (checked here, on the server) and writes an audit entry. Everything is branch-scoped like the rest
 * of the app. Delivering a finance sale before its Delivery Order is recorded needs the owner or OVERRIDE_DO_DELIVERY.
 */

import { revalidatePath } from "next/cache"
import { z } from "zod"
import type { Prisma } from "@prisma/client"
import { recordAudit } from "@/lib/audit"
import { getAuthSession, type AuthSessionUser } from "@/lib/auth"
import { requireAnyPermission, requirePermission, type AuthorizedUser } from "@/lib/authorize"
import { parseDateKey } from "@/lib/dates"
import { applyDmtPatch } from "@/lib/dmt-server"
import {
  CLAIM_CHECKLIST,
  canOverrideDoDelivery,
  canSeeDoAmounts,
  canViewDocuments,
  daysSince,
  doWarnings,
  effectiveDoStage,
  parseChecklist,
  type ClaimChecklist,
  type DoStage,
  type HandoverTarget,
} from "@/lib/documents"
import { branchFilter, hasPermission } from "@/lib/permissions"
import { buildRmvInfo, type RmvDocumentsInfo } from "@/lib/rmv-info"
import {
  PRIVATE_BUCKET,
  assertOwnPath,
  buildObjectPath,
  createSignedViewUrl,
  createUploadTarget,
  removeObject,
  verifyUploadedObject,
} from "@/lib/storage"
import { DO_SCAN_TYPE, validateUpload } from "@/lib/upload-rules"
import { prisma } from "@/lib/prisma"
import { activeSale } from "@/lib/sale-status"

type Client = Prisma.TransactionClient | typeof prisma
type Result<T = object> = ({ success: true; message?: string } & T) | { success: false; error: string; duplicate?: boolean }

/** The finance company's DO number is already used on another sale of the same company (a warning the user can confirm). */
class DuplicateDoNumberError extends Error {}

const iso = (date: Date | null | undefined) => (date ? date.toISOString() : null)
const day = (date: Date | null | undefined) => (date ? date.toISOString().slice(0, 10) : null)
const money = (n: number) => `Rs. ${new Intl.NumberFormat("en-LK").format(n)}`

function fail(error: unknown, fallback: string): { success: false; error: string } {
  if (error instanceof z.ZodError) return { success: false, error: error.issues[0]?.message ?? fallback }
  return { success: false, error: error instanceof Error ? error.message : fallback }
}

/** "YYYY-MM-DD" -> noon UTC of that day (the same calendar day in UTC and in Sri Lanka). Rejects future dates. */
function parseDay(value: string | undefined | null, label: string, allowFuture = false): Date {
  const parts = parseDateKey(value)
  if (!parts) throw new Error(`Enter a valid ${label}.`)
  const date = new Date(Date.UTC(parts.year, parts.month, parts.day, 12))
  if (!allowFuture && date.getTime() > Date.now() + 36 * 3_600_000) throw new Error(`The ${label} cannot be in the future.`)
  return date
}

function actorOf(user: AuthorizedUser) {
  return { id: user.id, name: user.name, organizationId: user.organizationId, branchId: user.branchId }
}

function revalidateDocs(saleId: string) {
  for (const path of [
    "/dashboard",
    "/dashboard/documents/delivery-orders",
    "/dashboard/documents/rmv",
    "/dashboard/finance/receivables",
    `/dashboard/sales/${saleId}`,
  ]) {
    revalidatePath(path)
  }
}

const SALE_INCLUDE = {
  customer: { select: { id: true, name: true, phone: true, nic: true } },
  branch: { select: { id: true, name: true } },
  financeCompany: { select: { id: true, name: true } },
  financeDetail: { select: { status: true, receivedAt: true, financeCompany: true, totalFinanceAmount: true } },
  deliveryOrder: true,
  dmtRegistration: { include: { ownerCustomer: { select: { id: true, name: true, phone: true, nic: true } } } },
  items: {
    select: {
      vehicle: {
        select: {
          id: true,
          chassisNumber: true,
          motorNumber: true,
          batterySerialNumber: true,
          registrationNumber: true,
          vehicleModel: { select: { brand: true, modelName: true } },
        },
      },
    },
  },
} satisfies Prisma.SaleInclude

type SaleRecord = Prisma.SaleGetPayload<{ include: typeof SALE_INCLUDE }>

async function loadSale(client: Client, user: AuthorizedUser, saleId: string): Promise<SaleRecord> {
  const sale = await client.sale.findFirst({
    where: { id: saleId, organizationId: user.organizationId, ...branchFilter(user) },
    include: SALE_INCLUDE,
  })
  if (!sale) throw new Error("Sale not found in your dealership records.")
  if (sale.status === "CANCELLED") throw new Error("This sale is cancelled.")
  return sale
}

// ---------------------------------------------------------------------------------------------
// Delivery Orders
// ---------------------------------------------------------------------------------------------

export interface DeliveryOrderRow {
  saleId: string
  invoiceNumber: string
  saleDate: string
  branchName: string
  customerName: string
  customerPhone: string
  vehicle: string
  chassisNumber: string
  financeCompany: string
  financeOffice: string | null
  /** Hidden (null) for people who may not see finance figures. */
  financeAmount: number | null
  stage: DoStage
  /** Start of the current stage and the days spent in it. */
  stageSince: string | null
  agingDays: number
  doNumber: string | null
  /** True when doNumber is an internal reference (DO-0001), not the finance company's number. */
  doNumberInternal: boolean
  doDate: string | null
  doAmount: number | null
  expiryDate: string | null
  notes: string | null
  /** Name of the uploaded scan (null: none, or this user may not see DO documents). */
  scanName: string | null
  deliveredAt: string | null
  deliveredByName: string | null
  overrideReason: string | null
  claim: { submittedAt: string; reference: string | null; checklist: ClaimChecklist; byName: string | null } | null
  paidAt: string | null
  warnings: string[]
}

function buildDoRow(sale: SaleRecord, user: AuthSessionUser): DeliveryOrderRow {
  const dOrder = sale.deliveryOrder
  const showAmounts = canSeeDoAmounts(user)
  const stage = effectiveDoStage(dOrder?.status, sale.financeDetail?.status === "Received")
  const since: Record<DoStage, Date | null> = {
    AWAITING_DO: sale.saleDate,
    DO_RECEIVED: dOrder?.stageChangedAt ?? dOrder?.doDate ?? null,
    DELIVERED: sale.deliveredAt ?? dOrder?.stageChangedAt ?? null,
    CLAIM_SUBMITTED: dOrder?.claimSubmittedAt ?? null,
    PAID: sale.financeDetail?.receivedAt ?? null,
  }
  const stageSince = since[stage]
  const vehicle = sale.items[0]?.vehicle
  const model = vehicle ? `${vehicle.vehicleModel.brand} ${vehicle.vehicleModel.modelName}` : "-"
  return {
    saleId: sale.id,
    invoiceNumber: sale.invoiceNumber,
    saleDate: sale.saleDate.toISOString(),
    branchName: sale.branch.name,
    customerName: sale.customer.name,
    customerPhone: sale.customer.phone,
    vehicle: model,
    chassisNumber: vehicle?.chassisNumber ?? "-",
    financeCompany: dOrder?.financeCompanyName ?? sale.financeCompany?.name ?? sale.financeDetail?.financeCompany ?? "Finance company",
    financeOffice: dOrder?.financeOfficeName ?? sale.financeOfficeName ?? null,
    financeAmount: showAmounts ? sale.financeAmount : null,
    stage,
    stageSince: iso(stageSince),
    agingDays: stage === "PAID" ? 0 : daysSince(stageSince),
    doNumber: dOrder?.doNumber ?? null,
    doNumberInternal: dOrder?.doNumberInternal ?? false,
    doDate: day(dOrder?.doDate),
    doAmount: showAmounts ? (dOrder?.doAmount ?? null) : null,
    expiryDate: day(dOrder?.expiryDate),
    notes: dOrder?.notes ?? null,
    scanName: showAmounts ? (dOrder?.scanUrl ? (dOrder.scanName ?? "Scan") : null) : null,
    deliveredAt: day(sale.deliveredAt),
    deliveredByName: sale.deliveredByName,
    overrideReason: dOrder?.deliveryOverrideReason ?? null,
    claim: dOrder?.claimSubmittedAt
      ? {
          submittedAt: day(dOrder.claimSubmittedAt)!,
          reference: dOrder.claimReference,
          checklist: parseChecklist(dOrder.claimChecklist),
          byName: dOrder.claimSubmittedByName,
        }
      : null,
    paidAt: day(sale.financeDetail?.receivedAt),
    warnings: [
      ...(dOrder
        ? doWarnings({ doAmount: dOrder.doAmount, financeAmount: sale.financeAmount, expiryDate: dOrder.expiryDate, deliveredAt: sale.deliveredAt, showAmounts })
        : []),
      ...(stage === "AWAITING_DO" && sale.deliveredAt ? ["Delivered without a Delivery Order (override). Record the DO when it arrives."] : []),
    ],
  }
}

export interface DeliveryOrdersData {
  rows: DeliveryOrderRow[]
  canManage: boolean
  canOverride: boolean
  canSeeAmounts: boolean
}

async function requireView(): Promise<AuthorizedUser> {
  const user = await requireAnyPermission("MANAGE_DOCUMENTS", "CREATE_SALE", "MANAGE_CUSTOMERS", "MANAGE_FINANCE_RECEIVABLES")
  if (!canViewDocuments(user)) throw new Error("You do not have access to received documents.")
  return user
}

/** Every finance sale of the user's branch(es) with its Delivery Order stage. */
export async function getDeliveryOrders(): Promise<Result<{ data: DeliveryOrdersData }>> {
  try {
    const user = await requireView()
    const sales = await prisma.sale.findMany({
      where: { organizationId: user.organizationId, ...branchFilter(user), ...activeSale, paymentType: "FINANCE" },
      include: SALE_INCLUDE,
      orderBy: { saleDate: "desc" },
    })
    return {
      success: true,
      data: {
        rows: sales.map((sale) => buildDoRow(sale, user)),
        canManage: hasPermission(user, "MANAGE_DOCUMENTS"),
        canOverride: canOverrideDoDelivery(user),
        canSeeAmounts: canSeeDoAmounts(user),
      },
    }
  } catch (error) {
    console.error("getDeliveryOrders error:", error)
    return fail(error, "Could not load Delivery Orders.")
  }
}

const doSchema = z.object({
  saleId: z.string().trim().min(1),
  /** The finance company's DO number. Optional: left empty, an internal reference (DO-0001) is generated. */
  doNumber: z.string().trim().max(60, "The DO number is too long.").optional().or(z.literal("")),
  /** Save even though the same number exists on another sale of this finance company. */
  confirmDuplicate: z.boolean().optional(),
  doDate: z.string().trim().min(1, "Enter the DO date."),
  doAmount: z.number().finite("Enter the DO amount.").min(0, "The DO amount cannot be negative."),
  expiryDate: z.string().trim().optional().or(z.literal("")),
  financeOfficeName: z.string().trim().max(120).optional().or(z.literal("")),
  notes: z.string().trim().max(500, "The notes are too long.").optional().or(z.literal("")),
})
export type DeliveryOrderInput = z.infer<typeof doSchema>

/** Records (or corrects) the Delivery Order the finance company issued for a finance sale. */
export async function recordDeliveryOrder(input: DeliveryOrderInput): Promise<Result> {
  try {
    const user = await requirePermission("MANAGE_DOCUMENTS")
    const data = doSchema.parse(input)
    const doDate = parseDay(data.doDate, "DO date")
    const expiry = data.expiryDate ? parseDay(data.expiryDate, "expiry date", true) : null
    if (expiry && expiry < doDate) return { success: false, error: "The expiry date cannot be before the DO date." }

    await prisma.$transaction(async (tx) => {
      const sale = await loadSale(tx, user, data.saleId)
      if (sale.paymentType !== "FINANCE") throw new Error("Delivery Orders apply to finance sales only.")
      const company = sale.financeCompany?.name ?? sale.financeDetail?.financeCompany ?? "Finance company"
      const existing = sale.deliveryOrder
      const nextStatus = !existing || existing.status === "AWAITING_DO" ? (sale.deliveredAt ? "DELIVERED" : "DO_RECEIVED") : existing.status

      // DO number: the finance company's number when typed; otherwise keep the one already there; otherwise an internal
      // reference (DO-0001, sequential per dealership, flagged "internal").
      const typed = data.doNumber?.trim() ?? ""
      let number: string
      let internal: boolean
      if (typed) {
        number = typed
        internal = typed === existing?.doNumber ? existing.doNumberInternal : false
      } else if (existing?.doNumber) {
        number = existing.doNumber
        internal = existing.doNumberInternal
      } else {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${user.organizationId}))`
        const used = await tx.deliveryOrder.findMany({
          where: { organizationId: user.organizationId, doNumberInternal: true },
          select: { doNumber: true },
        })
        const highest = used.reduce((max, row) => {
          const match = /^DO-(\d+)$/.exec(row.doNumber ?? "")
          return match ? Math.max(max, Number(match[1])) : max
        }, 0)
        number = `DO-${String(highest + 1).padStart(4, "0")}`
        internal = true
      }

      // A finance company's own number should be used once: warn (and let the user confirm) when it already exists.
      let duplicateOf: string | null = null
      if (!internal) {
        const financeCompanyId = sale.financeCompany?.id ?? sale.financeCompanyId ?? null
        const clash = await tx.deliveryOrder.findFirst({
          where: {
            organizationId: user.organizationId,
            saleId: { not: sale.id },
            doNumberInternal: false,
            doNumber: { equals: number, mode: "insensitive" },
            status: { not: "CANCELLED" },
            ...(financeCompanyId ? { financeCompanyId } : { financeCompanyName: company }),
          },
          select: { sale: { select: { invoiceNumber: true } } },
        })
        if (clash) {
          duplicateOf = clash.sale.invoiceNumber
          if (!data.confirmDuplicate) {
            throw new DuplicateDoNumberError(`DO number ${number} is already recorded for ${company} on sale ${clash.sale.invoiceNumber}. A finance company's DO number should be used only once.`)
          }
        }
      }

      const fields = {
        doNumber: number,
        doNumberInternal: internal,
        doDate,
        doAmount: data.doAmount,
        expiryDate: expiry,
        notes: data.notes || null,
        financeOfficeName: data.financeOfficeName || sale.financeOfficeName || null,
      }
      const saved = existing
        ? await tx.deliveryOrder.update({
            where: { id: existing.id },
            data: { ...fields, status: nextStatus, ...(nextStatus !== existing.status ? { stageChangedAt: nextStatus === "DELIVERED" ? sale.deliveredAt ?? new Date() : new Date() } : {}) },
          })
        : await tx.deliveryOrder.create({
            data: {
              organizationId: user.organizationId,
              saleId: sale.id,
              financeCompanyId: sale.financeCompany?.id ?? sale.financeCompanyId ?? null,
              financeCompanyName: company,
              status: nextStatus,
              ...fields,
            },
          })
      const warnings = doWarnings({ doAmount: data.doAmount, financeAmount: sale.financeAmount, expiryDate: expiry, deliveredAt: sale.deliveredAt, showAmounts: true })
      await recordAudit(tx, actorOf(user), {
        action: "DELIVERY_ORDER_RECORDED",
        entityType: "DeliveryOrder",
        entityId: saved.id,
        branchId: sale.branchId,
        description: `${sale.invoiceNumber}: ${
          existing?.doNumber && existing.doNumber !== number
            ? `DO number changed from ${existing.doNumber}${existing.doNumberInternal ? " (internal)" : ""} to ${number}${internal ? " (internal)" : ""}`
            : `DO ${number}${internal ? " (internal reference)" : ""} ${existing?.doNumber ? "updated" : "recorded"}`
        } (${money(data.doAmount)}), ${company}${duplicateOf ? `. Duplicate of the DO on ${duplicateOf} confirmed` : ""}${warnings.length ? `. Warning: ${warnings.join(" ")}` : ""}`,
      })
    })
    revalidateDocs(data.saleId)
    return { success: true, message: "Delivery Order saved." }
  } catch (error) {
    if (error instanceof DuplicateDoNumberError) return { success: false, error: error.message, duplicate: true }
    console.error("recordDeliveryOrder error:", error)
    return fail(error, "Could not save the Delivery Order.")
  }
}

const deliveredSchema = z.object({
  saleId: z.string().trim().min(1),
  deliveredAt: z.string().trim().min(1, "Enter the delivery date."),
  overrideReason: z.string().trim().max(300).optional().or(z.literal("")),
})
export type MarkDeliveredInput = z.infer<typeof deliveredSchema>

/**
 * Marks the bike as handed to the customer. Cash sales: just a date. Finance sales: the Delivery Order must be
 * recorded first, unless the owner (or OVERRIDE_DO_DELIVERY) overrides with a reason.
 */
export async function markDelivered(input: MarkDeliveredInput): Promise<Result> {
  try {
    const user = await requirePermission("MANAGE_DOCUMENTS")
    const data = deliveredSchema.parse(input)
    const deliveredAt = parseDay(data.deliveredAt, "delivery date")

    const message = await prisma.$transaction(async (tx) => {
      const sale = await loadSale(tx, user, data.saleId)
      if (deliveredAt < new Date(sale.saleDate.getTime() - 86_400_000)) throw new Error("The delivery date cannot be before the sale date.")
      const actor = actorOf(user)

      if (sale.paymentType !== "FINANCE") {
        await tx.sale.update({ where: { id: sale.id }, data: { deliveredAt, deliveredByName: user.name } })
        await recordAudit(tx, actor, {
          action: "SALE_DELIVERED",
          entityType: "Sale",
          entityId: sale.id,
          branchId: sale.branchId,
          description: `${sale.invoiceNumber}: bike delivered on ${day(deliveredAt)}`,
        })
        return "Marked as delivered."
      }

      const dOrder = sale.deliveryOrder
      if (dOrder?.status === "CLAIM_SUBMITTED") throw new Error("The claim is already submitted. Withdraw the claim before changing the delivery.")
      const hasDo = Boolean(dOrder?.doNumber)

      if (!hasDo) {
        if (!(canOverrideDoDelivery(user))) {
          throw new Error("Record the Delivery Order before marking this finance sale delivered. Only the owner (or someone allowed to override) can deliver without it.")
        }
        const reason = data.overrideReason?.trim() ?? ""
        if (reason.length < 3) throw new Error("Enter the reason for delivering before the Delivery Order was recorded.")
        const company = sale.financeCompany?.name ?? sale.financeDetail?.financeCompany ?? "Finance company"
        await tx.deliveryOrder.upsert({
          where: { saleId: sale.id },
          create: {
            organizationId: user.organizationId,
            saleId: sale.id,
            financeCompanyId: sale.financeCompany?.id ?? sale.financeCompanyId ?? null,
            financeCompanyName: company,
            financeOfficeName: sale.financeOfficeName ?? null,
            status: "AWAITING_DO",
            deliveryOverrideReason: reason,
            deliveryOverriddenByName: user.name,
          },
          update: { deliveryOverrideReason: reason, deliveryOverriddenByName: user.name },
        })
        await tx.sale.update({ where: { id: sale.id }, data: { deliveredAt, deliveredByName: user.name } })
        await recordAudit(tx, actor, {
          action: "DELIVERY_OVERRIDDEN",
          entityType: "Sale",
          entityId: sale.id,
          branchId: sale.branchId,
          description: `${sale.invoiceNumber}: delivered on ${day(deliveredAt)} BEFORE the Delivery Order was recorded. Reason: ${reason}`,
        })
        return "Marked delivered without a Delivery Order (override recorded). Record the DO when it arrives."
      }

      await tx.deliveryOrder.update({ where: { id: dOrder!.id }, data: { status: "DELIVERED", stageChangedAt: deliveredAt } })
      await tx.sale.update({ where: { id: sale.id }, data: { deliveredAt, deliveredByName: user.name } })
      await recordAudit(tx, actor, {
        action: "SALE_DELIVERED",
        entityType: "Sale",
        entityId: sale.id,
        branchId: sale.branchId,
        description: `${sale.invoiceNumber}: bike delivered on ${day(deliveredAt)} against DO ${dOrder!.doNumber}`,
      })
      return "Marked as delivered."
    })
    revalidateDocs(data.saleId)
    return { success: true, message }
  } catch (error) {
    console.error("markDelivered error:", error)
    return fail(error, "Could not mark the bike as delivered.")
  }
}

// ---------------------------------------------------------------------------------------------
// Delivery Order scan (private storage: image or PDF, viewed only through short-lived signed links)
// ---------------------------------------------------------------------------------------------

const scanPrepareSchema = z.object({
  saleId: z.string().trim().min(1),
  mimeType: z.string().max(100),
  size: z.number().int(),
})

/** Step 1 of a scan upload: checks permission, branch, file type and size, and returns a one-time upload token. */
export async function prepareDoScanUpload(input: z.infer<typeof scanPrepareSchema>): Promise<Result<{ bucket: string; path: string; token: string }>> {
  try {
    const user = await requirePermission("MANAGE_DOCUMENTS")
    const data = scanPrepareSchema.parse(input)
    const problem = validateUpload("do-scan", { mimeType: data.mimeType, size: data.size })
    if (problem) return { success: false, error: problem }
    const sale = await loadSale(prisma, user, data.saleId)
    if (sale.paymentType !== "FINANCE" || !sale.deliveryOrder?.doNumber) throw new Error("Record the Delivery Order before uploading its scan.")
    const path = buildObjectPath("do-scan", user.organizationId, DO_SCAN_TYPE, sale.id, data.mimeType)
    return { success: true, ...(await createUploadTarget(PRIVATE_BUCKET, path)) }
  } catch (error) {
    console.error("prepareDoScanUpload error:", error)
    return fail(error, "Could not prepare the upload.")
  }
}

const scanAttachSchema = z.object({
  saleId: z.string().trim().min(1),
  path: z.string().trim().min(1),
  fileName: z.string().trim().max(200),
})

/** Step 3: re-checks the stored file, attaches it to the Delivery Order (replacing any earlier scan) and audits it. */
export async function attachDoScan(input: z.infer<typeof scanAttachSchema>): Promise<Result> {
  let uploadedPath: string | null = null
  try {
    const user = await requirePermission("MANAGE_DOCUMENTS")
    const data = scanAttachSchema.parse(input)
    const sale = await loadSale(prisma, user, data.saleId)
    const dOrder = sale.deliveryOrder
    if (sale.paymentType !== "FINANCE" || !dOrder?.doNumber) throw new Error("Record the Delivery Order before uploading its scan.")
    assertOwnPath(user.organizationId, data.path, DO_SCAN_TYPE)
    if (data.path.split("/")[2] !== sale.id) throw new Error("That file belongs to a different sale.")
    uploadedPath = data.path
    await verifyUploadedObject("do-scan", data.path)

    const previous = dOrder.scanUrl
    const name = data.fileName.replace(/[^\w .()-]+/g, "_").slice(0, 120) || "Scan"
    await prisma.$transaction(async (tx) => {
      await tx.deliveryOrder.update({ where: { id: dOrder.id }, data: { scanUrl: data.path, scanName: name } })
      await recordAudit(tx, actorOf(user), {
        action: "DELIVERY_ORDER_SCAN_CHANGED",
        entityType: "DeliveryOrder",
        entityId: dOrder.id,
        branchId: sale.branchId,
        description: `${sale.invoiceNumber}: DO ${dOrder.doNumber} scan ${previous ? "replaced" : "uploaded"} (${name})`,
      })
    })
    if (previous && previous !== data.path) await removeObject(PRIVATE_BUCKET, previous)
    revalidateDocs(sale.id)
    return { success: true, message: previous ? "Scan replaced." : "Scan uploaded." }
  } catch (error) {
    // The upload is unusable: do not leave it behind (verifyUploadedObject already deletes files that fail its checks).
    if (uploadedPath) await removeObject(PRIVATE_BUCKET, uploadedPath)
    console.error("attachDoScan error:", error)
    return fail(error, "Could not save the scan.")
  }
}

/**
 * Short-lived (60 second) links to view or download the scan, created only after the usual permission and branch checks.
 * Needs the same access as DO amounts: the owner, or staff with Received documents / Finance receivables.
 */
export async function getDoScanUrl(saleId: string): Promise<Result<{ viewUrl: string; downloadUrl: string; name: string }>> {
  try {
    const user = await requireView()
    if (!canSeeDoAmounts(user)) throw new Error("You do not have access to Delivery Order scans.")
    const sale = await prisma.sale.findFirst({
      where: { id: saleId, organizationId: user.organizationId, ...branchFilter(user) },
      select: { deliveryOrder: { select: { scanUrl: true, scanName: true } } },
    })
    const scan = sale?.deliveryOrder
    if (!sale || !scan?.scanUrl) throw new Error("There is no scan for this Delivery Order.")
    assertOwnPath(user.organizationId, scan.scanUrl, DO_SCAN_TYPE)
    const name = scan.scanName ?? "delivery-order-scan"
    const [viewUrl, downloadUrl] = await Promise.all([createSignedViewUrl(scan.scanUrl, 60), createSignedViewUrl(scan.scanUrl, 60, name)])
    return { success: true, viewUrl, downloadUrl, name }
  } catch (error) {
    console.error("getDoScanUrl error:", error)
    return fail(error, "Could not open the scan.")
  }
}

/** Deletes the scan from storage and the Delivery Order (audited). */
export async function removeDoScan(input: { saleId: string }): Promise<Result> {
  try {
    const user = await requirePermission("MANAGE_DOCUMENTS")
    const sale = await loadSale(prisma, user, input.saleId)
    const dOrder = sale.deliveryOrder
    if (!dOrder?.scanUrl) throw new Error("There is no scan to remove.")
    const path = dOrder.scanUrl
    await prisma.$transaction(async (tx) => {
      await tx.deliveryOrder.update({ where: { id: dOrder.id }, data: { scanUrl: null, scanName: null } })
      await recordAudit(tx, actorOf(user), {
        action: "DELIVERY_ORDER_SCAN_CHANGED",
        entityType: "DeliveryOrder",
        entityId: dOrder.id,
        branchId: sale.branchId,
        description: `${sale.invoiceNumber}: DO ${dOrder.doNumber ?? ""} scan removed (${dOrder.scanName ?? "scan"})`,
      })
    })
    await removeObject(PRIVATE_BUCKET, path)
    revalidateDocs(sale.id)
    return { success: true, message: "Scan removed." }
  } catch (error) {
    console.error("removeDoScan error:", error)
    return fail(error, "Could not remove the scan.")
  }
}

const claimSchema = z.object({
  saleId: z.string().trim().min(1),
  submittedAt: z.string().trim().min(1, "Enter the date the claim was submitted."),
  reference: z.string().trim().max(120).optional().or(z.literal("")),
  checklist: z.object({
    deliveryOrder: z.boolean(),
    invoice: z.boolean(),
    customerNic: z.boolean(),
    mtaForms: z.boolean(),
    registrationDocuments: z.boolean(),
  }),
})
export type SubmitClaimInput = z.infer<typeof claimSchema>

/** Records that the DO, invoice and documents were submitted to the finance company (stage: Claim submitted). */
export async function submitClaim(input: SubmitClaimInput): Promise<Result> {
  try {
    const user = await requirePermission("MANAGE_DOCUMENTS")
    const data = claimSchema.parse(input)
    const submittedAt = parseDay(data.submittedAt, "claim date")
    await prisma.$transaction(async (tx) => {
      const sale = await loadSale(tx, user, data.saleId)
      const dOrder = sale.deliveryOrder
      if (sale.paymentType !== "FINANCE" || !dOrder) throw new Error("There is no Delivery Order for this sale.")
      if (effectiveDoStage(dOrder.status, sale.financeDetail?.status === "Received") === "PAID") throw new Error("The finance company has already paid this sale.")
      if (dOrder.status !== "DELIVERED") {
        throw new Error(dOrder.status === "CLAIM_SUBMITTED" ? "The claim is already submitted." : "The bike must be delivered (against the Delivery Order) before the claim is submitted.")
      }
      const missing = CLAIM_CHECKLIST.filter(({ key }) => !data.checklist[key]).map(({ label }) => label)
      await tx.deliveryOrder.update({
        where: { id: dOrder.id },
        data: {
          status: "CLAIM_SUBMITTED",
          stageChangedAt: submittedAt,
          claimSubmittedAt: submittedAt,
          claimReference: data.reference || null,
          claimChecklist: data.checklist as Prisma.InputJsonValue,
          claimSubmittedByName: user.name,
        },
      })
      await recordAudit(tx, actorOf(user), {
        action: "DELIVERY_CLAIM_CHANGED",
        entityType: "DeliveryOrder",
        entityId: dOrder.id,
        branchId: sale.branchId,
        description: `${sale.invoiceNumber}: claim submitted to ${dOrder.financeCompanyName} on ${day(submittedAt)}${data.reference ? ` (ref ${data.reference})` : ""}${missing.length ? `. Not included: ${missing.join(", ")}` : ""}`,
      })
    })
    revalidateDocs(data.saleId)
    return { success: true, message: "Claim recorded as submitted." }
  } catch (error) {
    console.error("submitClaim error:", error)
    return fail(error, "Could not record the claim.")
  }
}

/** Takes a submitted claim back (stage returns to Delivered). A sale with a submitted claim must do this before it can be cancelled. */
export async function withdrawClaim(input: { saleId: string; reason: string }): Promise<Result> {
  try {
    const user = await requirePermission("MANAGE_DOCUMENTS")
    const reason = z.string().trim().min(3, "Enter the reason for withdrawing the claim.").max(300).parse(input.reason)
    await prisma.$transaction(async (tx) => {
      const sale = await loadSale(tx, user, input.saleId)
      const dOrder = sale.deliveryOrder
      if (!dOrder || dOrder.status !== "CLAIM_SUBMITTED") throw new Error("There is no submitted claim to withdraw.")
      if (sale.financeDetail?.status === "Received") throw new Error("The finance company has already paid in full. Reverse the receipt in Finance receivables first.")
      await tx.deliveryOrder.update({
        where: { id: dOrder.id },
        data: { status: "DELIVERED", stageChangedAt: sale.deliveredAt ?? new Date(), claimSubmittedAt: null, claimReference: null, claimSubmittedByName: null },
      })
      await recordAudit(tx, actorOf(user), {
        action: "DELIVERY_CLAIM_CHANGED",
        entityType: "DeliveryOrder",
        entityId: dOrder.id,
        branchId: sale.branchId,
        description: `${sale.invoiceNumber}: claim to ${dOrder.financeCompanyName} withdrawn. Reason: ${reason}`,
      })
    })
    revalidateDocs(input.saleId)
    return { success: true, message: "Claim withdrawn." }
  } catch (error) {
    console.error("withdrawClaim error:", error)
    return fail(error, "Could not withdraw the claim.")
  }
}

// ---------------------------------------------------------------------------------------------
// RMV documents: received / handed over
// ---------------------------------------------------------------------------------------------

export interface SaleDocuments {
  saleId: string
  invoiceNumber: string
  isFinance: boolean
  deliveredAt: string | null
  deliveredByName: string | null
  deliveryOrder: DeliveryOrderRow | null
  rmv: RmvDocumentsInfo | null
  canManage: boolean
  canOverride: boolean
  canSeeAmounts: boolean
}

/** Everything the "Documents" card on the sale page shows. */
export async function getSaleDocuments(saleId: string): Promise<Result<{ data: SaleDocuments }>> {
  try {
    const user = await requireView()
    const sale = await prisma.sale.findFirst({
      where: { id: saleId, organizationId: user.organizationId, ...branchFilter(user) },
      include: SALE_INCLUDE,
    })
    if (!sale) throw new Error("Sale not found in your dealership records.")
    const isFinance = sale.paymentType === "FINANCE"
    return {
      success: true,
      data: {
        saleId: sale.id,
        invoiceNumber: sale.invoiceNumber,
        isFinance,
        deliveredAt: day(sale.deliveredAt),
        deliveredByName: sale.deliveredByName,
        deliveryOrder: isFinance ? buildDoRow(sale, user) : null,
        rmv: buildRmvInfo(sale),
        canManage: hasPermission(user, "MANAGE_DOCUMENTS") && sale.status !== "CANCELLED",
        canOverride: canOverrideDoDelivery(user),
        canSeeAmounts: canSeeDoAmounts(user),
      },
    }
  } catch (error) {
    return fail(error, "Could not load the documents.")
  }
}

const receivedSchema = z.object({
  saleId: z.string().trim().min(1),
  document: z.enum(["CR", "PLATE"]),
  receivedAt: z.string().trim().min(1, "Enter the date received."),
  registrationNumber: z.string().trim().max(30).optional().or(z.literal("")),
})
export type RmvReceivedInput = z.infer<typeof receivedSchema>

/**
 * Records that the registration certificate (CR) or the number plate came back from RMV, with its date.
 * It goes through the existing DMT workflow rules, so it is refused until the documents were submitted to RMV.
 */
export async function recordRmvReceived(input: RmvReceivedInput): Promise<Result> {
  try {
    const user = await requirePermission("MANAGE_DOCUMENTS")
    const data = receivedSchema.parse(input)
    const receivedAt = parseDay(data.receivedAt, "received date")
    const sale = await loadSale(prisma, user, data.saleId)
    const regNo = data.registrationNumber?.trim() || sale.dmtRegistration?.registrationNumber || sale.dmtRegistration?.registeredNumber || null
    if (!regNo) throw new Error("Enter the registration number first.")

    await applyDmtPatch(user as AuthSessionUser & { organizationId: string }, sale.id, {
      registrationNumber: regNo,
      ...(data.document === "CR"
        ? { isBookOk: true, crReceivedAt: receivedAt }
        : { numberPlateStatus: "ISSUED" as const, plateReceivedAt: receivedAt }),
    })
    await recordAudit(prisma, actorOf(user), {
      action: "RMV_DOCUMENT_CHANGED",
      entityType: "Sale",
      entityId: sale.id,
      branchId: sale.branchId,
      description: `${sale.invoiceNumber}: ${data.document === "CR" ? "registration certificate (CR)" : "number plate"} received from RMV on ${day(receivedAt)} (reg. no. ${regNo})`,
    })
    revalidateDocs(sale.id)
    return { success: true, message: data.document === "CR" ? "Registration certificate recorded as received." : "Number plate recorded as received." }
  } catch (error) {
    console.error("recordRmvReceived error:", error)
    return fail(error, "Could not record the document.")
  }
}

const handoverSchema = z.object({
  saleId: z.string().trim().min(1),
  document: z.enum(["CR", "PLATE"]),
  handedOverAt: z.string().trim().min(1, "Enter the hand-over date."),
  target: z.enum(["CUSTOMER", "FINANCE_COMPANY"]).optional(),
  toName: z.string().trim().min(2, "Enter who received it.").max(120),
  toNic: z.string().trim().max(30).optional().or(z.literal("")),
  reference: z.string().trim().max(120).optional().or(z.literal("")),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
})
export type RmvHandoverInput = z.infer<typeof handoverSchema>

/** Records handing over the CR (to the customer, or for finance sales to the finance company) or the number plate. */
export async function handOverRmvDocument(input: RmvHandoverInput): Promise<Result> {
  try {
    const user = await requirePermission("MANAGE_DOCUMENTS")
    const data = handoverSchema.parse(input)
    const handedOverAt = parseDay(data.handedOverAt, "hand-over date")
    await prisma.$transaction(async (tx) => {
      const sale = await loadSale(tx, user, data.saleId)
      const dmt = sale.dmtRegistration
      if (!dmt) throw new Error("This sale has no RMV record.")
      if (data.document === "CR") {
        if (!dmt.isBookOk) throw new Error("Record the registration certificate as received before handing it over.")
        if (dmt.crHandedOverAt) throw new Error("The registration certificate was already handed over.")
        const target: HandoverTarget = data.target ?? "CUSTOMER"
        if (target === "FINANCE_COMPANY" && sale.paymentType !== "FINANCE") throw new Error("Only a finance sale's certificate can be sent to a finance company.")
        await tx.dMTRegistration.update({
          where: { id: dmt.id },
          data: {
            crHandedOverAt: handedOverAt,
            crHandoverTarget: target,
            crHandedToName: data.toName,
            crHandedToNic: data.toNic || null,
            crHandoverReference: data.reference || null,
            crHandoverNotes: data.notes || null,
          },
        })
      } else {
        if (dmt.numberPlateStatus !== "ISSUED") throw new Error("Record the number plate as received before handing it over.")
        if (dmt.plateHandedOverAt) throw new Error("The number plate was already handed over.")
        await tx.dMTRegistration.update({
          where: { id: dmt.id },
          data: { plateHandedOverAt: handedOverAt, plateHandedToName: data.toName, plateHandoverNotes: data.notes || null },
        })
      }
      await recordAudit(tx, actorOf(user), {
        action: "RMV_DOCUMENT_CHANGED",
        entityType: "Sale",
        entityId: sale.id,
        branchId: sale.branchId,
        description: `${sale.invoiceNumber}: ${data.document === "CR" ? `registration certificate handed over (${data.target === "FINANCE_COMPANY" ? "to the finance company" : "to the owner"})` : "number plate handed over"} on ${day(handedOverAt)} to ${data.toName}${data.toNic ? ` (${data.toNic})` : ""}`,
      })
    })
    revalidateDocs(data.saleId)
    return { success: true, message: "Hand-over recorded." }
  } catch (error) {
    console.error("handOverRmvDocument error:", error)
    return fail(error, "Could not record the hand-over.")
  }
}

/** Clears a hand-over entered by mistake. */
export async function undoRmvHandover(input: { saleId: string; document: "CR" | "PLATE" }): Promise<Result> {
  try {
    const user = await requirePermission("MANAGE_DOCUMENTS")
    await prisma.$transaction(async (tx) => {
      const sale = await loadSale(tx, user, input.saleId)
      const dmt = sale.dmtRegistration
      if (!dmt) throw new Error("This sale has no RMV record.")
      if (input.document === "CR") {
        if (!dmt.crHandedOverAt) throw new Error("The certificate has not been handed over.")
        await tx.dMTRegistration.update({
          where: { id: dmt.id },
          data: { crHandedOverAt: null, crHandoverTarget: null, crHandedToName: null, crHandedToNic: null, crHandoverReference: null, crHandoverNotes: null },
        })
      } else {
        if (!dmt.plateHandedOverAt) throw new Error("The number plate has not been handed over.")
        await tx.dMTRegistration.update({ where: { id: dmt.id }, data: { plateHandedOverAt: null, plateHandedToName: null, plateHandoverNotes: null } })
      }
      await recordAudit(tx, actorOf(user), {
        action: "RMV_DOCUMENT_CHANGED",
        entityType: "Sale",
        entityId: sale.id,
        branchId: sale.branchId,
        description: `${sale.invoiceNumber}: ${input.document === "CR" ? "registration certificate" : "number plate"} hand-over undone`,
      })
    })
    revalidateDocs(input.saleId)
    return { success: true, message: "Hand-over cleared." }
  } catch (error) {
    console.error("undoRmvHandover error:", error)
    return fail(error, "Could not undo the hand-over.")
  }
}

export interface HandoverSlipData {
  organization: { businessName: string; phone: string | null }
  invoiceNumber: string
  slipDate: string
  vehicle: { model: string; chassisNumber: string; motorNumber: string | null; registrationNumber: string | null }
  owner: { name: string; nic: string | null; phone: string }
  cr: { handedOverAt: string; target: HandoverTarget | null; toName: string | null; toNic: string | null; reference: string | null; notes: string | null } | null
  plate: { handedOverAt: string; toName: string | null; notes: string | null } | null
  financeCompany: string | null
  staffName: string
}

/** Data for the printable hand-over acknowledgement slip. */
export async function getHandoverSlip(saleId: string): Promise<Result<{ data: HandoverSlipData }>> {
  try {
    const user = await requireView()
    const sale = await prisma.sale.findFirst({
      where: { id: saleId, organizationId: user.organizationId, ...branchFilter(user) },
      include: { ...SALE_INCLUDE, organization: { select: { businessName: true, phone: true } } },
    })
    if (!sale) throw new Error("Sale not found in your dealership records.")
    const rmv = buildRmvInfo(sale)
    const dmt = sale.dmtRegistration
    if (!rmv || !dmt || (!dmt.crHandedOverAt && !dmt.plateHandedOverAt)) throw new Error("Nothing has been handed over yet for this sale.")
    const vehicle = sale.items[0]?.vehicle
    const latest = [dmt.crHandedOverAt, dmt.plateHandedOverAt].filter((d): d is Date => Boolean(d)).sort((a, b) => b.getTime() - a.getTime())[0]
    return {
      success: true,
      data: {
        organization: sale.organization,
        invoiceNumber: sale.invoiceNumber,
        slipDate: day(latest)!,
        vehicle: {
          model: vehicle ? `${vehicle.vehicleModel.brand} ${vehicle.vehicleModel.modelName}` : "-",
          chassisNumber: vehicle?.chassisNumber ?? "-",
          motorNumber: vehicle?.motorNumber ?? null,
          registrationNumber: rmv.registrationNumber,
        },
        owner: rmv.currentOwner,
        cr: dmt.crHandedOverAt
          ? {
              handedOverAt: day(dmt.crHandedOverAt)!,
              target: (dmt.crHandoverTarget as HandoverTarget | null) ?? null,
              toName: dmt.crHandedToName,
              toNic: dmt.crHandedToNic,
              reference: dmt.crHandoverReference,
              notes: dmt.crHandoverNotes,
            }
          : null,
        plate: dmt.plateHandedOverAt ? { handedOverAt: day(dmt.plateHandedOverAt)!, toName: dmt.plateHandedToName, notes: dmt.plateHandoverNotes } : null,
        financeCompany: rmv.financeCompany,
        staffName: user.name,
      },
    }
  } catch (error) {
    return fail(error, "Could not load the slip.")
  }
}

// ---------------------------------------------------------------------------------------------
// Dashboard cards
// ---------------------------------------------------------------------------------------------

export interface DocumentsDashboardCounts {
  awaitingDo: number
  claimsToSubmit: number
  rmvToHandOver: number
}

/** Counts for the three dashboard cards (zeros when the user cannot see these pages). */
export async function getDocumentsDashboardCounts(): Promise<DocumentsDashboardCounts> {
  const zero = { awaitingDo: 0, claimsToSubmit: 0, rmvToHandOver: 0 }
  try {
    const session = await getAuthSession()
    const user = session?.user
    if (!user?.organizationId || !canViewDocuments(user)) return zero
    const scope = { organizationId: user.organizationId, ...branchFilter(user), ...activeSale }
    const [awaitingDo, claimsToSubmit, rmvToHandOver] = await Promise.all([
      prisma.sale.count({
        where: {
          ...scope,
          paymentType: "FINANCE",
          OR: [{ financeDetail: null }, { financeDetail: { status: { not: "Received" } } }],
          AND: [{ OR: [{ deliveryOrder: null }, { deliveryOrder: { status: "AWAITING_DO" } }] }],
        },
      }),
      prisma.sale.count({
        where: { ...scope, paymentType: "FINANCE", deliveryOrder: { status: "DELIVERED" }, OR: [{ financeDetail: null }, { financeDetail: { status: { not: "Received" } } }] },
      }),
      prisma.sale.count({
        where: {
          ...scope,
          dmtRegistration: {
            OR: [
              { isBookOk: true, crHandedOverAt: null },
              { numberPlateStatus: "ISSUED", plateHandedOverAt: null },
            ],
          },
        },
      }),
    ])
    return { awaitingDo, claimsToSubmit, rmvToHandOver }
  } catch (error) {
    console.error("getDocumentsDashboardCounts error:", error)
    return zero
  }
}
