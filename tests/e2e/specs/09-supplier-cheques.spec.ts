import type { Page } from "@playwright/test"
import { test, expect, loadFixtures, pageAs } from "../fixtures"
import { db } from "../db"
import { paySupplier } from "../supplier"

const fx = loadFixtures()
const G = fx.supplierGrns
const SUPPLIER = fx.supplier.name

async function issueCheque(page: Page, grnKey: string, chequeNumber: string) {
  await paySupplier(page, {
    supplierName: SUPPLIER,
    method: "CHEQUE",
    amount: 100000,
    allocations: { [G[grnKey].grnNumber]: 100000 },
    cheque: { number: chequeNumber, bank: "E2E Bank" },
  })
  const cheque = await db.cheque.findFirstOrThrow({
    where: { organizationId: fx.orgId, chequeNumber },
    include: { payment: true },
  })
  return cheque
}

async function chequeRow(page: Page, paymentNumber: string, filter = "ACTIVE") {
  await page.goto("/dashboard/suppliers/cheques")
  await page.getByLabel("Filter by status").selectOption(filter)
  return page.getByRole("row").filter({ hasText: paymentNumber })
}

/** Wait for the saved status in the database, then reload so the table shows it (the in-page refresh can lag). */
async function expectStatus(page: Page, chequeId: string, row: ReturnType<Page["getByRole"]>, status: string) {
  await expect.poll(async () => (await db.cheque.findUniqueOrThrow({ where: { id: chequeId } })).status, { timeout: 90_000 }).toBe(status)
  await page.reload()
  // Finished cheques leave the default "Awaiting clearance" list, so show everything.
  await page.getByLabel("Filter by status").selectOption("ALL")
  await expect(row).toContainText(status, { timeout: 60_000 })
}

const events = (chequeId: string) =>
  db.chequeEvent.findMany({ where: { chequeId }, orderBy: { createdAt: "asc" }, select: { fromStatus: true, toStatus: true } })
const audits = (action: string) => db.auditLog.count({ where: { organizationId: fx.orgId, action } })

test.describe.serial("supplier cheques", () => {
  test("lifecycle: Issued -> Presented -> Cleared, with event history and audit entries", async ({ browser }) => {
    const { page, close } = await pageAs(browser, "owner")
    const cheque = await issueCheque(page, "chequeLife", "CHQ-LIFE-001")
    // A cheque takes the amount off the GRN as soon as it is issued.
    expect(cheque.status).toBe("ISSUED")
    expect(cheque.payment.status).toBe("PENDING")
    let g = await db.gRN.findUniqueOrThrow({ where: { id: G.chequeLife.id } })
    expect(g.paymentStatus).toBe("PAID")
    expect(g.balanceAmount).toBe(0)

    let row = await chequeRow(page, cheque.payment.paymentNumber)
    await expect(row).toContainText("ISSUED")
    await row.getByRole("button", { name: "Presented" }).click()
    await expectStatus(page, cheque.id, row, "PRESENTED")

    await row.getByRole("button", { name: "Clear" }).click()
    await page.getByRole("dialog").getByRole("button", { name: "Confirm cleared" }).click()
    await expectStatus(page, cheque.id, row, "CLEARED")

    const done = await db.cheque.findUniqueOrThrow({ where: { id: cheque.id }, include: { payment: true } })
    expect(done.status).toBe("CLEARED")
    expect(done.clearedAt).not.toBeNull()
    expect(done.payment.status).toBe("COMPLETED")
    g = await db.gRN.findUniqueOrThrow({ where: { id: G.chequeLife.id } })
    expect(g.paymentStatus).toBe("PAID")
    expect(g.paidAmount).toBe(100000)

    expect(await events(cheque.id)).toEqual([
      { fromStatus: null, toStatus: "ISSUED" },
      { fromStatus: "ISSUED", toStatus: "PRESENTED" },
      { fromStatus: "PRESENTED", toStatus: "CLEARED" },
    ])
    expect(await audits("CHEQUE_PRESENTED")).toBe(1)
    expect(await audits("CHEQUE_CLEARED")).toBe(1)

    // Cleared is final: no actions are offered.
    row = await chequeRow(page, cheque.payment.paymentNumber, "ALL")
    await expect(row).toContainText("CLEARED")
    await expect(row.getByRole("button")).toHaveCount(0)
    await close()
  })

  test("bounced: the payment is reversed exactly once and a second attempt changes nothing", async ({ browser }) => {
    const { page, close } = await pageAs(browser, "owner")
    const cheque = await issueCheque(page, "chequeBounce", "CHQ-BNC-001")
    expect((await db.gRN.findUniqueOrThrow({ where: { id: G.chequeBounce.id } })).paymentStatus).toBe("PAID")

    const row = await chequeRow(page, cheque.payment.paymentNumber)
    await row.getByRole("button", { name: "Bounced" }).click()
    const dialog = page.getByRole("dialog")
    await dialog.getByLabel("Reason (optional)").fill("Insufficient funds")
    await dialog.getByRole("button", { name: "Confirm bounced" }).click()
    await expectStatus(page, cheque.id, row, "BOUNCED")

    const bounced = await db.cheque.findUniqueOrThrow({ where: { id: cheque.id }, include: { payment: true } })
    expect(bounced.status).toBe("BOUNCED")
    expect(bounced.bounceReason).toBe("Insufficient funds")
    expect(bounced.payment.status).toBe("REVERSED")
    const g = await db.gRN.findUniqueOrThrow({ where: { id: G.chequeBounce.id } })
    expect(g.paymentStatus).toBe("UNPAID")
    expect(g.paidAmount).toBe(0)
    expect(g.balanceAmount).toBe(100000)

    // No second bounce is possible: no buttons, and nothing moves after a reload.
    await page.reload()
    await expect(row.getByRole("button")).toHaveCount(0)
    const again = await db.gRN.findUniqueOrThrow({ where: { id: G.chequeBounce.id } })
    expect(again.paidAmount).toBe(0)
    expect(again.balanceAmount).toBe(100000)

    expect(await events(cheque.id)).toEqual([
      { fromStatus: null, toStatus: "ISSUED" },
      { fromStatus: "ISSUED", toStatus: "BOUNCED" },
    ])
    expect(await audits("CHEQUE_BOUNCED")).toBe(1)
    await close()
  })

  test("cancelled: the payment is reversed and balances are back where they started", async ({ browser }) => {
    const before = await db.gRN.aggregate({
      where: { organizationId: fx.orgId, supplierId: fx.supplier.id },
      _sum: { paidAmount: true, balanceAmount: true },
    })
    const { page, close } = await pageAs(browser, "owner")
    const cheque = await issueCheque(page, "chequeCancel", "CHQ-CAN-001")
    const mid = await db.gRN.aggregate({
      where: { organizationId: fx.orgId, supplierId: fx.supplier.id },
      _sum: { paidAmount: true },
    })
    expect(mid._sum.paidAmount).toBe((before._sum.paidAmount ?? 0) + 100000)

    const row = await chequeRow(page, cheque.payment.paymentNumber)
    await row.getByRole("button", { name: "Cancel", exact: true }).click()
    await page.getByRole("dialog").getByRole("button", { name: "Cancel cheque" }).click()
    await expectStatus(page, cheque.id, row, "CANCELLED")

    const cancelled = await db.cheque.findUniqueOrThrow({ where: { id: cheque.id }, include: { payment: true } })
    expect(cancelled.status).toBe("CANCELLED")
    expect(cancelled.payment.status).toBe("REVERSED")
    const g = await db.gRN.findUniqueOrThrow({ where: { id: G.chequeCancel.id } })
    expect(g.paymentStatus).toBe("UNPAID")
    expect(g.balanceAmount).toBe(100000)

    const after = await db.gRN.aggregate({
      where: { organizationId: fx.orgId, supplierId: fx.supplier.id },
      _sum: { paidAmount: true, balanceAmount: true },
    })
    expect(after._sum.paidAmount).toBe(before._sum.paidAmount)
    expect(after._sum.balanceAmount).toBe(before._sum.balanceAmount)
    expect(await audits("CHEQUE_CANCELLED")).toBe(1)
    await close()
  })

  test("a user without MANAGE_CHEQUES cannot see or open the cheque screen", async ({ browser }) => {
    const { page, close } = await pageAs(browser, "cashier")
    await page.goto("/dashboard/suppliers/cheques")
    await expect.poll(() => new URL(page.url()).pathname, { timeout: 30_000 }).not.toBe("/dashboard/suppliers/cheques")
    await close()
  })
})
