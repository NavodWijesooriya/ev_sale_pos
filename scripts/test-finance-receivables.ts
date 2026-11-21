/**
 * End-to-end test of the finance receivables feature, using the REAL server actions.
 *
 * Run once from the project root:
 *   node --experimental-strip-types scripts/test-finance-receivables.ts
 *
 * It builds two throw-away dealerships ("ZZTEST ..."), exercises full / partial / multi-sale receipts,
 * over-allocation rejection, cheque clear, cheque bounce (before and after clearing), voiding, permissions,
 * branch scoping and audit logging, then deletes everything it created. Existing data is only read.
 * (The session and Next.js cache are stubbed by scripts/support, so no login is needed.)
 */
import { register } from "node:module"
import { pathToFileURL } from "node:url"
import path from "node:path"

process.env.PROJECT_ROOT ??= process.cwd()
register(pathToFileURL(path.resolve("scripts/support/loader.mjs")))

const root = pathToFileURL(process.env.PROJECT_ROOT + "/").href
const load = (file: string) => import(new URL(file, root).href)
const { prisma } = await import(pathToFileURL(path.resolve("scripts/support/stub-prisma.mjs")).href)
const receivables = await load("app/actions/finance-receivables.ts")
const salesActions = await load("app/actions/sales.ts")
const financeActions = await load("app/actions/finance.ts")

let pass = 0
const failures: string[] = []
function check(name: string, ok: unknown, detail = "") {
  if (ok) pass++
  else {
    failures.push(name + (detail ? `  [${detail}]` : ""))
    console.log("  FAIL:", name, detail)
  }
}
const near = (a: number, b: number) => Math.abs(a - b) < 0.0051
const stamp = Date.now().toString(36)
const orgIds: string[] = []
const users: Record<string, string> = {}
const DAY = 24 * 60 * 60 * 1000

async function asUser(key: string) {
  const u = await prisma.user.findUnique({ where: { id: users[key] } })
  ;(globalThis as Record<string, unknown>).__TEST_SESSION__ = {
    user: {
      id: u.id, name: u.name, email: u.email, role: u.role,
      organizationId: u.organizationId, branchId: u.branchId, permissions: u.permissions,
    },
  }
}
const blocked = async (fn: () => Promise<unknown>) => {
  try {
    const r = (await fn()) as { success?: boolean } | undefined
    return !!r && r.success === false
  } catch {
    return true
  }
}

async function cleanup() {
  for (const org of orgIds) {
    const w = { organizationId: org }
    const step = async (label: string, fn: () => Promise<unknown>) => {
      try { await fn() } catch (e) { console.log("  cleanup note:", label, String((e as Error).message).split("\n").slice(-1)[0].slice(0, 110)) }
    }
    await step("audit", () => prisma.auditLog.deleteMany({ where: w }))
    await step("incomingCheque", () => prisma.incomingCheque.deleteMany({ where: w }))
    await step("allocation", () => prisma.financeReceiptAllocation.deleteMany({ where: { receipt: w } }))
    await step("receipt", () => prisma.financeReceipt.deleteMany({ where: w }))
    await step("dmt", () => prisma.dMTRegistration.deleteMany({ where: { sale: w } }))
    await step("financeDetail", () => prisma.financeDetail.deleteMany({ where: { sale: w } }))
    await step("saleItem", () => prisma.saleItem.deleteMany({ where: { sale: w } }))
    await step("sale", () => prisma.sale.deleteMany({ where: w }))
    await step("vehicle", () => prisma.vehicle.deleteMany({ where: w }))
    await step("vehicleModel", () => prisma.vehicleModel.deleteMany({ where: w }))
    await step("customer", () => prisma.customer.deleteMany({ where: w }))
    await step("financeCompany", () => prisma.financeCompany.deleteMany({ where: w }))
    await step("user", () => prisma.user.deleteMany({ where: w }))
    await step("branch", () => prisma.branch.deleteMany({ where: w }))
    await step("org", () => prisma.organization.delete({ where: { id: org } }))
  }
  const left = await prisma.organization.count({ where: { businessName: { startsWith: "ZZTEST" } } })
  console.log(left === 0 ? "CLEANUP: temporary organizations fully removed" : `CLEANUP INCOMPLETE: ${left} test organization(s) remain`)
}

// Read-only snapshot of the real finance records, to prove the test leaves them alone.
const realSnapshot = async () =>
  JSON.stringify(
    await prisma.financeDetail.findMany({
      where: { sale: { organization: { businessName: { not: { startsWith: "ZZTEST" } } } } },
      select: { id: true, receivedAmount: true, balanceAmount: true, status: true, financeCompanyId: true },
      orderBy: { id: "asc" },
    }),
  )

try {
  const before = await realSnapshot()

  // ------------------------------------------------------------------ setup
  const mkOrg = async (label: string) => {
    const org = await prisma.organization.create({ data: { businessName: `ZZTEST ${label} ${stamp}` } })
    orgIds.push(org.id)
    const branchA = await prisma.branch.create({ data: { organizationId: org.id, name: `ZZ ${label} A` } })
    const branchB = await prisma.branch.create({ data: { organizationId: org.id, name: `ZZ ${label} B` } })
    const model = await prisma.vehicleModel.create({ data: { organizationId: org.id, brand: "ZZ", modelName: label, defaultPrice: 400000 } })
    const customer = await prisma.customer.create({ data: { organizationId: org.id, name: `ZZ ${label} cust`, phone: "0700000000", category: "DIRECT", customerType: "SALE" } })
    const lb = await prisma.financeCompany.create({ data: { organizationId: org.id, name: "ZZ Lb Finance", contactNo: "0111", defaultCommissionRate: 3 } })
    const other = await prisma.financeCompany.create({ data: { organizationId: org.id, name: "ZZ Other Finance", contactNo: "0112" } })
    return { org, branchA, branchB, model, customer, lb, other }
  }
  const one = await mkOrg("one")
  const two = await mkOrg("two")
  const mkUser = async (key: string, orgId: string, role: string, permissions: string[], branchId: string | null = null) => {
    users[key] = (await prisma.user.create({
      data: { organizationId: orgId, name: `ZZ ${key}`, email: `zzfr-${stamp}-${key}@example.invalid`, passwordHash: "x", role, permissions, branchId },
    })).id
  }
  await mkUser("owner", one.org.id, "OrgAdmin", [])
  await mkUser("mgr", one.org.id, "BranchManager", ["MANAGE_FINANCE_RECEIVABLES"])
  await mkUser("staffA", one.org.id, "SalesRep", ["MANAGE_FINANCE_RECEIVABLES"], one.branchA.id)
  await mkUser("none", one.org.id, "Technician", [])
  await mkUser("owner2", two.org.id, "OrgAdmin", [])

  const mkBike = (ctx: typeof one, branchId: string, n: number) =>
    prisma.vehicle.create({
      data: { organizationId: ctx.org.id, branchId, vehicleModelId: ctx.model.id, chassisNumber: `ZZFR${stamp}${ctx.org.id.slice(0, 4)}${n}`, status: "AVAILABLE", purchasePrice: 300000 },
    })
  const sale = (ctx: typeof one, vehicleId: string, company: { id: string }, financeAmount: number) => ({
    customerId: ctx.customer.id, vehicleId, paymentType: "FINANCE", paymentMethod: "Leasing",
    warrantyOption: "5 Years or 60,000 km (Standard)", freeItems: [], freeServices: 3, advancePaymentId: "",
    financeCompanyId: company.id, financeAmount, downPayment: 400000 - financeAmount, commissionBasis: "FINANCE_AMOUNT",
    commissionRate: null, commissionAmount: null, insuranceType: "NONE", insuranceCompanyId: "",
    financeCommission: null, insuranceCommission: null, commissionRecipientId: "",
  })

  await asUser("owner")
  const make = async (ctx: typeof one, branchId: string, n: number, company: { id: string }, amount: number) => {
    const bike = await mkBike(ctx, branchId, n)
    const r = await salesActions.createNewSale(sale(ctx, bike.id, company, amount))
    if (!r.success) throw new Error("setup sale failed: " + r.error)
    return r.saleId as string
  }
  const s1 = await make(one, one.branchA.id, 1, one.lb, 200000)
  const s2 = await make(one, one.branchA.id, 2, one.lb, 100000)
  const s3 = await make(one, one.branchB.id, 3, one.lb, 50000)
  const s4 = await make(one, one.branchA.id, 4, one.other, 80000)
  const s5 = await make(one, one.branchA.id, 5, one.lb, 0) // no loan: nothing owed
  await asUser("owner2")
  const sForeign = await make(two, two.branchA.id, 6, two.lb, 60000)
  for (const [id, days] of [[s1, 100], [s2, 45], [s3, 10], [s4, 5]] as const) {
    await prisma.sale.update({ where: { id }, data: { saleDate: new Date(Date.now() - days * DAY) } })
  }
  const fd = (saleId: string) => prisma.financeDetail.findUnique({ where: { saleId } })
  const detailOf = async (saleId: string) => (await fd(saleId))!.id
  console.log("setup ok")

  // ================================================================ new sales
  console.log("\n[1] Finance sales create receivables")
  const d1 = await fd(s1)
  check("finance sale links the company and starts owing the finance amount", d1?.financeCompanyId === one.lb.id && near(d1.balanceAmount, 200000) && d1.receivedAmount === 0 && d1.status === "Pending", JSON.stringify(d1))
  const d5 = await fd(s5)
  check("a finance sale with no loan owes nothing (Received at once)", d5?.status === "Received" && d5.balanceAmount === 0 && d5.receivedAt !== null)

  // ================================================================ listing & aging
  console.log("\n[2] Pending list, aging, filters")
  await asUser("mgr")
  const pend = await receivables.getPendingFinanceReceivables()
  const group = (name: string) => pend.groups.find((g: { financeCompanyName: string }) => g.financeCompanyName === name)
  check("grouped by company with totals (Lb 350000, Other 80000)", near(group("ZZ Lb Finance")?.outstanding, 350000) && near(group("ZZ Other Finance")?.outstanding, 80000) && near(pend.totals.outstanding, 430000), JSON.stringify(pend.totals))
  check("fully settled / zero sales are not listed", !pend.groups.some((g: { items: { saleId: string }[] }) => g.items.some((i) => i.saleId === s5)))
  check("aging buckets: 90+ 200000, 30-59 100000, 0-29 130000", near(pend.totals.buckets["90+"], 200000) && near(pend.totals.buckets["30-59"], 100000) && near(pend.totals.buckets["0-29"], 130000) && near(pend.totals.buckets["60-89"], 0), JSON.stringify(pend.totals.buckets))
  check("filter by company", (await receivables.getPendingFinanceReceivables({ financeCompanyId: one.other.id })).groups.length === 1)
  check("filter by aging bucket", (await receivables.getPendingFinanceReceivables({ aging: "90+" })).totals.count === 1)
  check("filter by branch", (await receivables.getPendingFinanceReceivables({ branchId: one.branchB.id })).totals.count === 1)
  check("another dealership's receivable never appears", !pend.groups.some((g: { items: { saleId: string }[] }) => g.items.some((i) => i.saleId === sForeign)))

  const rec = (over: Record<string, unknown>) =>
    receivables.recordFinanceReceipt({ financeCompanyId: one.lb.id, method: "BankTransfer", receiptDate: new Date().toISOString().slice(0, 10), allocations: [], ...over })

  // ================================================================ receipts
  console.log("\n[3] Full, partial and multi-sale receipts")
  let r = await rec({ amount: 100000, allocations: [{ financeDetailId: await detailOf(s2), amount: 100000 }] })
  check("full payment of one sale", r.success && r.receiptNumber === "FR-00001", JSON.stringify(r))
  let d = await fd(s2)
  check("sale becomes Received with zero balance and a received date", d?.status === "Received" && d.balanceAmount === 0 && d.receivedAt !== null)
  r = await rec({ method: "Cash", amount: 50000.1, allocations: [{ financeDetailId: await detailOf(s1), amount: 50000.1 }] })
  check("partial payment", r.success, r.message)
  d = await fd(s1)
  check("partial: received 50000.10, balance 149999.90, Partial", d !== null && near(d.receivedAmount, 50000.1) && near(d.balanceAmount, 149999.9) && d.status === "Partial", JSON.stringify(d))
  const multi = await rec({ amount: 120000.1, allocations: [{ financeDetailId: await detailOf(s1), amount: 100000 }, { financeDetailId: await detailOf(s3), amount: 20000.1 }] })
  check("one payment across two sales", multi.success, multi.message)
  const afterMulti = [await fd(s1), await fd(s3)]
  check("multi-sale: balances 49999.90 and 29999.90, both Partial", near(afterMulti[0]!.balanceAmount, 49999.9) && near(afterMulti[1]!.balanceAmount, 29999.9) && afterMulti.every((x) => x!.status === "Partial"), JSON.stringify(afterMulti.map((x) => x!.balanceAmount)))

  // ================================================================ rejections
  console.log("\n[4] Over-allocation and wrong-owner rejections")
  const snap = async () => JSON.stringify([await fd(s1), await fd(s3), await fd(s4)])
  const stateBefore = await snap()
  const rejects = async (name: string, over: Record<string, unknown>) => {
    const res = await rec(over)
    check(name, res.success === false, res.message)
  }
  await rejects("over-allocating a sale is rejected", { amount: 49999.91, allocations: [{ financeDetailId: await detailOf(s1), amount: 49999.91 }] })
  await rejects("allocations that do not add up to the amount are rejected", { amount: 1000, allocations: [{ financeDetailId: await detailOf(s1), amount: 900 }] })
  await rejects("the same sale twice in one payment is rejected", { amount: 100, allocations: [{ financeDetailId: await detailOf(s1), amount: 50 }, { financeDetailId: await detailOf(s1), amount: 50 }] })
  await rejects("allocating to another finance company's sale is rejected", { amount: 100, allocations: [{ financeDetailId: await detailOf(s4), amount: 100 }] })
  await rejects("allocating to another dealership's sale is rejected", { amount: 100, allocations: [{ financeDetailId: await detailOf(sForeign), amount: 100 }] })
  await rejects("a settled sale cannot receive more", { amount: 1, allocations: [{ financeDetailId: await detailOf(s2), amount: 1 }] })
  await rejects("zero amount is rejected", { amount: 0, allocations: [{ financeDetailId: await detailOf(s1), amount: 1 }] })
  await rejects("future-dated payment is rejected", { amount: 1, receiptDate: "2099-01-01", allocations: [{ financeDetailId: await detailOf(s1), amount: 1 }] })
  await rejects("cheque details are required for a cheque", { method: "CHEQUE", amount: 1, allocations: [{ financeDetailId: await detailOf(s1), amount: 1 }] })
  check("rejected payments changed nothing", (await snap()) === stateBefore)
  const race = await Promise.all([
    rec({ amount: 49999.9, allocations: [{ financeDetailId: await detailOf(s1), amount: 49999.9 }] }),
    rec({ amount: 49999.9, allocations: [{ financeDetailId: await detailOf(s1), amount: 49999.9 }] }),
  ])
  check("two payments racing for the same balance: exactly one wins", race.filter((x: { success: boolean }) => x.success).length === 1, race.map((x: { success: boolean }) => x.success).join(","))
  d = await fd(s1)
  check("race: sale settled exactly once (received 200000, never over)", d !== null && near(d.receivedAmount, 200000) && d.balanceAmount === 0 && d.status === "Received", JSON.stringify(d))
  // put s1 back to a known partial state for the cheque tests: void the race winner's receipt
  const raceWinner = race.find((x: { success: boolean }) => x.success)
  const voided = await receivables.reverseFinanceReceipt({ receiptId: raceWinner.receiptId, reason: "test reset" })
  check("void a bank-transfer receipt", voided.success, voided.message)
  d = await fd(s1)
  check("void restored the balance and the Partial status", d !== null && near(d.balanceAmount, 49999.9) && d.status === "Partial" && d.receivedAt === null, JSON.stringify(d))
  check("a voided receipt cannot be voided again", (await receivables.reverseFinanceReceipt({ receiptId: raceWinner.receiptId })).success === false)

  // ================================================================ cheque: clear
  console.log("\n[5] Cheque receipt applies only when it clears")
  const chequeInput = (no: string, amount: number, saleId: string) => ({
    method: "CHEQUE", amount, allocations: [{ financeDetailId: saleId, amount }],
    cheque: { chequeNumber: no, bankName: "ZZ Bank", chequeDate: new Date().toISOString().slice(0, 10) },
  })
  const chequeIdOf = async (no: string) => (await prisma.incomingCheque.findFirst({ where: { organizationId: one.org.id, chequeNumber: no } }))!.id
  const s1Detail = await detailOf(s1)
  const s3Detail = await detailOf(s3)
  r = await rec(chequeInput("C1", 49999.9, s1Detail))
  check("cheque receipt recorded as PENDING", r.success, r.message)
  d = await fd(s1)
  check("balance is NOT reduced while the cheque is pending", d !== null && near(d.balanceAmount, 49999.9) && d.status === "Partial")
  const afterReserve = await receivables.getPendingFinanceReceivables()
  const s1Item = afterReserve.groups.flatMap((g: { items: { saleId: string; reservedAmount: number; availableAmount: number }[] }) => g.items).find((i: { saleId: string }) => i.saleId === s1)
  check("the cheque amount is reserved: nothing left to allocate", s1Item && near(s1Item.reservedAmount, 49999.9) && s1Item.availableAmount === 0, JSON.stringify(s1Item))
  await rejects("a second payment cannot claim the reserved amount", { method: "Cash", amount: 1, allocations: [{ financeDetailId: s1Detail, amount: 1 }] })
  const c1 = await chequeIdOf("C1")
  check("cannot clear a cheque that does not exist for this dealership", (await receivables.clearFinanceCheque({ chequeId: "00000000-0000-0000-0000-000000000000" })).success === false)
  r = await receivables.clearFinanceCheque({ chequeId: c1 })
  check("clearing the cheque", r.success, r.message)
  d = await fd(s1)
  check("clearing applied the money: Received, zero balance", d !== null && near(d.receivedAmount, 200000) && d.balanceAmount === 0 && d.status === "Received")
  const c1Receipt = await prisma.financeReceipt.findFirst({ where: { incomingCheque: { id: c1 } } })
  check("receipt is COMPLETED after clearing", c1Receipt?.status === "COMPLETED" && c1Receipt.appliedAt !== null)
  check("clearing twice is rejected", (await receivables.clearFinanceCheque({ chequeId: c1 })).success === false)
  const c1Events = (await prisma.incomingChequeEvent.findMany({ where: { chequeId: c1 }, orderBy: { createdAt: "asc" } })).map((e: { toStatus: string }) => e.toStatus)
  check("cheque history: RECEIVED then CLEARED", c1Events.join(",") === "RECEIVED,CLEARED", c1Events.join(","))

  // ================================================================ cheque: bounce before clearing
  console.log("\n[6] Bounce before clearing")
  r = await rec(chequeInput("C2", 10000, s3Detail))
  const c2 = await chequeIdOf("C2")
  const s3Before = await fd(s3)
  const bounce = await Promise.all([receivables.bounceFinanceCheque({ chequeId: c2, reason: "no funds" }), receivables.bounceFinanceCheque({ chequeId: c2 })])
  check("two simultaneous bounces: exactly one succeeds", bounce.filter((x: { success: boolean }) => x.success).length === 1, bounce.map((x: { success: boolean }) => x.success).join(","))
  const s3After = await fd(s3)
  check("nothing had been applied, so nothing changes", near(s3After!.balanceAmount, s3Before!.balanceAmount) && s3After!.status === s3Before!.status)
  check("receipt is REVERSED and the reservation released", (await prisma.financeReceipt.findFirst({ where: { incomingCheque: { id: c2 } } }))?.status === "REVERSED" && near((await receivables.getCompanyAllocatableSales(one.lb.id)).find((x: { financeDetailId: string }) => x.financeDetailId === s3Detail)?.availableAmount, 29999.9))
  check("a bounced cheque cannot be cleared", (await receivables.clearFinanceCheque({ chequeId: c2 })).success === false)

  // ================================================================ cheque: bounce after clearing
  console.log("\n[7] Returned after clearing: reversed exactly once")
  r = await rec(chequeInput("C3", 5000, s3Detail))
  const c3 = await chequeIdOf("C3")
  check("present the cheque", (await receivables.presentFinanceCheque({ chequeId: c3 })).success)
  check("clear the presented cheque", (await receivables.clearFinanceCheque({ chequeId: c3 })).success)
  d = await fd(s3)
  check("cleared cheque reduced the balance by 5000", d !== null && near(d.receivedAmount, 25000.1) && near(d.balanceAmount, 24999.9))
  const returned = await Promise.all([receivables.bounceFinanceCheque({ chequeId: c3, reason: "returned" }), receivables.bounceFinanceCheque({ chequeId: c3 })])
  check("two simultaneous returns: exactly one succeeds", returned.filter((x: { success: boolean }) => x.success).length === 1, returned.map((x: { success: boolean }) => x.success).join(","))
  d = await fd(s3)
  check("reversed once: received back to 20000.10 (not 15000.10)", d !== null && near(d.receivedAmount, 20000.1) && near(d.balanceAmount, 29999.9) && d.status === "Partial", JSON.stringify(d))
  const c3Events = (await prisma.incomingChequeEvent.findMany({ where: { chequeId: c3 }, orderBy: { createdAt: "asc" } })).map((e: { toStatus: string }) => e.toStatus)
  check("history: RECEIVED, PRESENTED, CLEARED, BOUNCED", c3Events.join(",") === "RECEIVED,PRESENTED,CLEARED,BOUNCED", c3Events.join(","))
  check("returning a cheque again is rejected", (await receivables.bounceFinanceCheque({ chequeId: c3 })).success === false)

  // ================================================================ voiding
  console.log("\n[8] Voiding receipts")
  check("a cheque receipt cannot be voided directly", (await receivables.reverseFinanceReceipt({ receiptId: c1Receipt!.id })).success === false)
  const stateBeforeVoid = [await fd(s1), await fd(s3)]
  const voidMulti = await Promise.all([receivables.reverseFinanceReceipt({ receiptId: multi.receiptId }), receivables.reverseFinanceReceipt({ receiptId: multi.receiptId })])
  check("two simultaneous voids: exactly one succeeds", voidMulti.filter((x: { success: boolean }) => x.success).length === 1, voidMulti.map((x: { success: boolean }) => x.success).join(","))
  const afterVoid = [await fd(s1), await fd(s3)]
  check("multi-sale void took back 100000 from the first sale and 20000.10 from the second, once", near(afterVoid[0]!.receivedAmount, stateBeforeVoid[0]!.receivedAmount - 100000) && near(afterVoid[1]!.receivedAmount, 0) && afterVoid[1]!.status === "Pending", JSON.stringify(afterVoid.map((x) => [x!.receivedAmount, x!.status])))

  // ================================================================ permissions & branches
  console.log("\n[9] Permissions and branch scope")
  await asUser("none")
  check("no permission: cannot list", await blocked(() => receivables.getPendingFinanceReceivables()))
  check("no permission: cannot receive", await blocked(() => rec({ amount: 1, allocations: [{ financeDetailId: s1Detail, amount: 1 }] })))
  check("no permission: cannot clear, present, bounce or void", (await blocked(() => receivables.clearFinanceCheque({ chequeId: c1 }))) && (await blocked(() => receivables.presentFinanceCheque({ chequeId: c1 }))) && (await blocked(() => receivables.bounceFinanceCheque({ chequeId: c1 }))) && (await blocked(() => receivables.reverseFinanceReceipt({ receiptId: c1Receipt!.id }))))
  await asUser("staffA")
  const scoped = await receivables.getPendingFinanceReceivables()
  check("branch A staff only see branch A receivables", !scoped.groups.some((g: { items: { saleId: string }[] }) => g.items.some((i) => i.saleId === s3)) && scoped.totals.count >= 1)
  check("branch A staff cannot receive for a branch B sale", (await rec({ amount: 100, allocations: [{ financeDetailId: s3Detail, amount: 100 }] })).success === false)
  const staffReceipt = await rec({ method: "Cash", amount: 100, allocations: [{ financeDetailId: await detailOf(s1), amount: 100 }] })
  check("branch A staff can receive for a branch A sale (s1 has been voided back to partial)", staffReceipt.success, staffReceipt.message)
  check("branch A staff only see their branch's receipts", (await receivables.getFinanceReceipts()).every((x: { recordedBy: string }) => x.recordedBy === "ZZ staffA"))
  await asUser("owner")
  check("owner can use the feature", (await receivables.getPendingFinanceReceivables()).totals.count >= 1)

  // ================================================================ company protection
  console.log("\n[10] Company with receivables cannot be deleted")
  const delLb = await financeActions.deleteFinanceCompany(one.lb.id)
  const delOther = await financeActions.deleteFinanceCompany(one.other.id)
  check("company with payments is protected", delLb.success === false && /cannot be deleted/.test(delLb.error ?? ""), JSON.stringify(delLb))
  check("company with outstanding sales is protected", delOther.success === false)

  // ================================================================ invariants & audit
  console.log("\n[11] Money invariants and audit trail")
  const details = await prisma.financeDetail.findMany({ where: { sale: { organizationId: one.org.id } } })
  let invariantsOk = true
  const problems: string[] = []
  for (const x of details) {
    const applied = await prisma.financeReceiptAllocation.aggregate({ where: { financeDetailId: x.id, receipt: { status: "COMPLETED" } }, _sum: { amount: true } })
    const sumApplied = applied._sum.amount ?? 0
    const status = x.totalFinanceAmount - x.receivedAmount <= 0.005 ? "Received" : x.receivedAmount > 0.005 ? "Partial" : "Pending"
    if (!near(x.receivedAmount, sumApplied) || !near(x.balanceAmount, x.totalFinanceAmount - x.receivedAmount) || x.balanceAmount < 0 || x.status !== status) {
      invariantsOk = false
      problems.push(`${x.id.slice(0, 6)} recv=${x.receivedAmount} applied=${sumApplied} bal=${x.balanceAmount} st=${x.status}`)
    }
  }
  check("every sale: received = applied receipts, balance = total - received, status consistent, never negative", invariantsOk, problems.join(" | "))
  const countAudit = (action: string) => prisma.auditLog.count({ where: { organizationId: one.org.id, action } })
  check("audit: 8 receipts recorded", (await countAudit("FINANCE_RECEIPT_RECORDED")) === 8, String(await countAudit("FINANCE_RECEIPT_RECORDED")))
  check("audit: 2 receipts voided", (await countAudit("FINANCE_RECEIPT_REVERSED")) === 2, String(await countAudit("FINANCE_RECEIPT_REVERSED")))
  check("audit: cheque presented 1, cleared 2, bounced 2", (await countAudit("FINANCE_CHEQUE_PRESENTED")) === 1 && (await countAudit("FINANCE_CHEQUE_CLEARED")) === 2 && (await countAudit("FINANCE_CHEQUE_BOUNCED")) === 2)
  check("existing real finance records were not touched", (await realSnapshot()) === before)
} catch (e) {
  console.log("\nTEST ERROR:", (e as Error).stack || e)
  failures.push("test error: " + (e as Error).message)
} finally {
  ;(globalThis as Record<string, unknown>).__TEST_SESSION__ = null
  await cleanup()
  await prisma.$disconnect()
}
console.log(`\nRESULT: ${pass} checks passed, ${failures.length} failed`)
if (failures.length) console.log("FAILED:\n - " + failures.join("\n - "))
process.exit(failures.length ? 1 : 0)
