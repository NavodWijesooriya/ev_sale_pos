import type { Page } from "@playwright/test"
import { test, expect, loadFixtures, pageAs } from "../fixtures"
import { db } from "../db"
import { createSale } from "../helpers"

const fx = loadFixtures()
const money = (n: number) => `Rs. ${n.toLocaleString("en-LK", { maximumFractionDigits: 0 })}`
const C = fx.customers

/** A pending advance created directly in the database (setup only; the first test records one through the UI). */
async function seedAdvance(customerKey: keyof typeof C, amount: number) {
  const staff = await db.user.findFirstOrThrow({ where: { organizationId: fx.orgId, role: "OrgAdmin" } })
  return db.advancePayment.create({
    data: {
      organizationId: fx.orgId,
      customerId: C[customerKey].id,
      nicNumber: C[customerKey].nic,
      bikeModel: "General advance",
      amount,
      branchId: fx.branchA.id,
      staffId: staff.id,
      paymentMethod: "Cash",
      paymentDetails: "Cash",
      status: "PENDING",
    },
  })
}

async function searchNic(page: Page, label: string, nic: string) {
  const box = page.getByLabel(label)
  await box.fill(nic)
  await box.press("Enter")
}

test.describe.serial("customer advances", () => {
  let useAdvanceId = ""

  test("recording an advance makes it PENDING", async ({ browser }) => {
    const { page, close } = await pageAs(browser, "owner")
    await page.goto("/dashboard/sales/advances")
    await page.getByRole("button", { name: "Add Advance" }).click()
    const dialog = page.getByRole("dialog", { name: "Record Advance Payment" })
    const customer = dialog.getByRole("combobox", { name: "Customer *" })
    await customer.click()
    await customer.fill(C.advUse.name)
    await dialog.getByRole("option", { name: new RegExp(C.advUse.name) }).first().click()
    const vehicle = dialog.getByRole("combobox", { name: /Vehicle Chassis/ })
    await vehicle.click()
    await vehicle.fill("E2E-STOCK-ADV-01")
    await dialog.getByRole("option", { name: /E2E-STOCK-ADV-01/ }).first().click()
    await dialog.getByLabel("Advance Amount (Rs.) *").fill("50000")
    await dialog.getByRole("button", { name: "Record Advance" }).click()

    await expect
      .poll(() => db.advancePayment.count({ where: { organizationId: fx.orgId, customerId: C.advUse.id } }), { timeout: 90_000 })
      .toBe(1)
    const advance = await db.advancePayment.findFirstOrThrow({ where: { organizationId: fx.orgId, customerId: C.advUse.id } })
    useAdvanceId = advance.id
    expect(advance.status).toBe("PENDING")
    expect(advance.amount).toBe(50000)
    expect(advance.nicNumber).toBe(C.advUse.nic)

    await page.goto("/dashboard/sales/advances")
    const row = page.getByRole("row").filter({ hasText: C.advUse.name })
    await expect(row).toContainText("Pending")
    await expect(row).toContainText(money(50000))
    await close()
  })

  test("using the advance in a sale marks it USED and reduces the sale total", async ({ browser }) => {
    const { page, close } = await pageAs(browser, "owner")
    const sale = await createSale(page, { customerName: C.advUse.name, chassis: "E2E-STOCK-ADV-01", paymentType: "CASH" })
    const row = await db.sale.findUniqueOrThrow({ where: { id: sale.saleId }, include: { vehicle: true } })
    // Scooter S1 costs 500,000; the 50,000 advance is deducted.
    expect(row.advanceDeducted).toBe(50000)
    expect(row.totalAmount).toBe(450000)
    expect(row.advancePaymentId).toBe(useAdvanceId)
    expect(row.vehicle.status).toBe("Sold")
    const advance = await db.advancePayment.findUniqueOrThrow({ where: { id: useAdvanceId } })
    expect(advance.status).toBe("USED")

    await page.goto("/dashboard/sales/advances")
    await expect(page.getByRole("row").filter({ hasText: C.advUse.name })).toContainText("Used")
    await close()
  })

  test("a used advance cannot be used twice: the next sale gets no deduction", async ({ browser }) => {
    const { page, close } = await pageAs(browser, "owner")
    const sale = await createSale(page, { customerName: C.advUse.name, chassis: "E2E-STOCK-ADV-02", paymentType: "CASH" })
    const row = await db.sale.findUniqueOrThrow({ where: { id: sale.saleId } })
    expect(row.advanceDeducted).toBe(0)
    expect(row.advancePaymentId).toBeNull()
    expect(row.totalAmount).toBe(500000)
    expect((await db.advancePayment.findUniqueOrThrow({ where: { id: useAdvanceId } })).status).toBe("USED")
    await close()
  })

  test("refund marks the advance REFUNDED and it can no longer be transferred", async ({ browser }) => {
    const advance = await seedAdvance("advRefund", 30000)
    const { page, close } = await pageAs(browser, "owner")
    await page.goto("/dashboard/sales/advances")
    const row = page.getByRole("row").filter({ hasText: C.advRefund.name })
    await row.getByRole("button", { name: "Open menu" }).click()
    await page.getByRole("menuitem", { name: "Refund Advance" }).click()
    const dialog = page.getByRole("dialog", { name: "Refund Advance Payment" })
    await expect(dialog).toContainText(money(30000))
    await dialog.getByRole("button", { name: "Confirm refund" }).click()
    await expect
      .poll(async () => (await db.advancePayment.findUniqueOrThrow({ where: { id: advance.id } })).status, { timeout: 90_000 })
      .toBe("REFUNDED")

    await page.goto("/dashboard/sales/advances")
    await expect(page.getByRole("row").filter({ hasText: C.advRefund.name })).toContainText("Refunded")
    expect(await db.auditLog.count({ where: { organizationId: fx.orgId, action: "ADVANCE_REFUNDED" } })).toBe(1)

    // The transfer-by-NIC screen no longer offers it.
    await page.goto("/dashboard/sales/advances/transfers")
    await searchNic(page, "Source customer NIC", C.advRefund.nic)
    await expect(page.getByText(C.advRefund.name).first()).toBeVisible({ timeout: 60_000 })
    await expect(page.getByRole("radio", { name: /30,000/ })).toHaveCount(0)
    await close()
  })

  test("transfer by NIC: needs a verified NIC on both sides, moves the amount and keeps the history", async ({ browser }) => {
    const advance = await seedAdvance("advFrom", 80000)
    const { page, close } = await pageAs(browser, "owner")
    await page.goto("/dashboard/sales/advances/transfers")

    // NIC verification: a short or unknown NIC finds nobody, so nothing can be transferred.
    await searchNic(page, "Source customer NIC", "910")
    await expect(page.getByText(/at least 4 characters/i)).toBeVisible()
    await searchNic(page, "Source customer NIC", "910999999")
    // Wait for this answer before searching again (the screen does not discard late answers).
    await expect(page.getByText("No customer found with that NIC.")).toBeVisible({ timeout: 60_000 })
    await expect(page.getByRole("button", { name: "Transfer advance" })).toBeDisabled()
    await expect(page.getByRole("radio")).toHaveCount(0)

    // Find the source by NIC, pick its advance.
    await searchNic(page, "Source customer NIC", C.advFrom.nic)
    await page.getByRole("radio", { name: /80,000/ }).check({ timeout: 60_000 })
    // The transfer is still blocked until the receiving customer is verified by NIC too.
    await expect(page.getByRole("button", { name: "Transfer advance" })).toBeDisabled()
    await searchNic(page, "Receiving customer NIC", C.advTo.nic)
    await page.getByRole("radio", { name: new RegExp(C.advTo.name) }).check({ timeout: 60_000 })
    await page.getByLabel("3. Amount to transfer (Rs.)").fill("50000")
    await page.getByLabel("Note (optional)").fill("E2E partial transfer")
    await page.getByRole("button", { name: "Transfer advance" }).click()

    await expect
      .poll(async () => (await db.advancePayment.findUniqueOrThrow({ where: { id: advance.id } })).amount, { timeout: 90_000 })
      .toBe(30000)
    const source = await db.advancePayment.findUniqueOrThrow({ where: { id: advance.id } })
    expect(source.status).toBe("PENDING")
    const received = await db.advancePayment.findFirstOrThrow({ where: { organizationId: fx.orgId, customerId: C.advTo.id } })
    expect(received.amount).toBe(50000)
    expect(received.status).toBe("PENDING")
    const transfer = await db.advanceTransfer.findFirstOrThrow({ where: { fromAdvanceId: advance.id } })
    expect(transfer.transferAmount).toBe(50000)
    expect(transfer.toCustomerId).toBe(C.advTo.id)
    expect(transfer.fromCustomerId).toBe(C.advFrom.id)
    expect(transfer.note).toBe("E2E partial transfer")
    expect(transfer.toAdvanceId).toBe(received.id)

    // History is kept and shown.
    await page.goto("/dashboard/sales/advances/transfers")
    const history = page.getByRole("row").filter({ hasText: "E2E partial transfer" })
    await expect(history).toContainText(C.advFrom.name)
    await expect(history).toContainText(C.advTo.name)
    await expect(history).toContainText(money(50000))

    // Move the remaining 30,000: the source advance becomes TRANSFERRED and a second history row exists.
    await searchNic(page, "Source customer NIC", C.advFrom.nic)
    await page.getByRole("radio", { name: /30,000/ }).check({ timeout: 60_000 })
    await searchNic(page, "Receiving customer NIC", C.advTo.nic)
    await page.getByRole("radio", { name: new RegExp(C.advTo.name) }).check({ timeout: 60_000 })
    await page.getByRole("button", { name: "Transfer advance" }).click()
    await expect
      .poll(async () => (await db.advancePayment.findUniqueOrThrow({ where: { id: advance.id } })).status, { timeout: 90_000 })
      .toBe("TRANSFERRED")
    expect(await db.advanceTransfer.count({ where: { fromAdvanceId: advance.id } })).toBe(2)
    const total = await db.advancePayment.aggregate({
      where: { organizationId: fx.orgId, customerId: C.advTo.id, status: "PENDING" },
      _sum: { amount: true },
    })
    expect(total._sum.amount).toBe(80000)
    expect(await db.auditLog.count({ where: { organizationId: fx.orgId, action: "ADVANCE_TRANSFERRED" } })).toBe(2)
    await close()
  })

  test("an advance cannot be transferred after it was used (stale screen is refused by the server)", async ({ browser }) => {
    const advance = await seedAdvance("advUsed", 20000)
    const { page, close } = await pageAs(browser, "owner")
    await page.goto("/dashboard/sales/advances/transfers")
    await searchNic(page, "Source customer NIC", C.advUsed.nic)
    await page.getByRole("radio", { name: /20,000/ }).check({ timeout: 60_000 })
    await searchNic(page, "Receiving customer NIC", C.advTo.nic)
    await page.getByRole("radio", { name: new RegExp(C.advTo.name) }).check({ timeout: 60_000 })

    // Meanwhile the advance is used in a sale (simulated directly).
    await db.advancePayment.update({ where: { id: advance.id }, data: { status: "USED" } })
    const transfersBefore = await db.advanceTransfer.count({ where: { fromAdvanceId: advance.id } })
    await page.getByRole("button", { name: "Transfer advance" }).click()
    await expect(page.getByText(/no longer available for transfer/i).first()).toBeVisible({ timeout: 60_000 })
    expect(await db.advanceTransfer.count({ where: { fromAdvanceId: advance.id } })).toBe(transfersBefore)
    expect((await db.advancePayment.findUniqueOrThrow({ where: { id: advance.id } })).status).toBe("USED")
    await close()
  })
})
