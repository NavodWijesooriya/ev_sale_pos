import type { Page } from "@playwright/test"
import { test, expect, loadFixtures, pageAs } from "../fixtures"
import { db } from "../db"
import { fillPayDialog, paySupplier } from "../supplier"

const fx = loadFixtures()
const money = (n: number) => `Rs. ${n.toLocaleString("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const G = fx.supplierGrns

async function grn(key: string) {
  return db.gRN.findUniqueOrThrow({ where: { id: G[key].id } })
}

/** The supplier's row on the Outstanding tab: purchases, paid, outstanding, advance held. */
async function outstandingRow(page: Page) {
  await page.goto("/dashboard/suppliers/reports")
  await page.getByRole("tab", { name: "Outstanding" }).click()
  return page.getByRole("row").filter({ hasText: fx.supplier.name })
}

test.describe.serial("supplier payments", () => {
  test("a full payment makes the GRN PAID and the supplier ledger balance drops by the amount", async ({ browser }) => {
    const { page, close } = await pageAs(browser, "owner")
    await paySupplier(page, {
      supplierName: fx.supplier.name,
      method: "BankTransfer",
      amount: 100000,
      allocations: { [G.full.grnNumber]: 100000 },
      reference: "TRF-SUP-FULL",
    })
    const g = await grn("full")
    expect(g.paymentStatus).toBe("PAID")
    expect(g.paidAmount).toBe(100000)
    expect(g.balanceAmount).toBe(0)

    const payment = await db.supplierPayment.findFirstOrThrow({
      where: { organizationId: fx.orgId, referenceNo: "TRF-SUP-FULL" },
      include: { allocations: true },
    })
    expect(payment.status).toBe("COMPLETED")
    expect(payment.allocations).toHaveLength(1)

    // Ledger: purchases 1,000,000, paid 100,000, outstanding 900,000.
    const row = await outstandingRow(page)
    await expect(row).toContainText(money(1000000))
    await expect(row).toContainText(money(100000))
    await expect(row).toContainText(money(900000))
    await close()
  })

  test("a partial payment leaves the GRN PARTIAL with the right balance", async ({ browser }) => {
    const { page, close } = await pageAs(browser, "owner")
    await paySupplier(page, {
      supplierName: fx.supplier.name,
      method: "Cash",
      amount: 40000,
      allocations: { [G.partial.grnNumber]: 40000 },
    })
    const g = await grn("partial")
    expect(g.paymentStatus).toBe("PARTIAL")
    expect(g.paidAmount).toBe(40000)
    expect(g.balanceAmount).toBe(60000)

    await page.goto("/dashboard/suppliers/payments")
    const row = page.getByRole("row").filter({ hasText: G.partial.grnNumber })
    await expect(row).toContainText("PARTIAL")
    await expect(row).toContainText(money(60000))
    await close()
  })

  test("one payment allocated across 2 GRNs", async ({ browser }) => {
    const { page, close } = await pageAs(browser, "owner")
    await paySupplier(page, {
      supplierName: fx.supplier.name,
      method: "BankTransfer",
      amount: 150000,
      allocations: { [G.splitA.grnNumber]: 100000, [G.splitB.grnNumber]: 50000 },
      reference: "TRF-SUP-SPLIT",
    })
    const a = await grn("splitA")
    const b = await grn("splitB")
    expect(a.paymentStatus).toBe("PAID")
    expect(b.paymentStatus).toBe("PARTIAL")
    expect(b.balanceAmount).toBe(50000)
    const payment = await db.supplierPayment.findFirstOrThrow({
      where: { organizationId: fx.orgId, referenceNo: "TRF-SUP-SPLIT" },
      include: { allocations: true },
    })
    expect(payment.allocations.map((x) => x.amount).sort((x, y) => x - y)).toEqual([50000, 100000])
    await close()
  })

  test("overpayment: the extra becomes a supplier advance; the advance is later applied to a new GRN", async ({ browser }) => {
    const { page, close } = await pageAs(browser, "owner")

    // Pay 130,000 against a GRN that owes 100,000: 30,000 stays with the supplier as an advance.
    const dialog = await fillPayDialog(page, {
      supplierName: fx.supplier.name,
      method: "BankTransfer",
      amount: 130000,
      allocations: { [G.over.grnNumber]: 100000 },
      reference: "TRF-SUP-OVER",
    })
    await expect(dialog).toContainText("Kept as advance")
    await expect(dialog).toContainText(money(30000))
    await dialog.getByRole("button", { name: "Record payment" }).click()
    await expect(dialog).toBeHidden({ timeout: 60_000 })

    expect((await grn("over")).paymentStatus).toBe("PAID")
    const advance = await db.supplierAdvance.findFirstOrThrow({ where: { organizationId: fx.orgId, supplierId: fx.supplier.id } })
    expect(advance.amount).toBe(30000)
    expect(advance.balanceAmount).toBe(30000)
    const ledger = await outstandingRow(page)
    await expect(ledger).toContainText(money(30000)) // advance held

    // A new GRN arrives (through the real GRN form) and its payable is set up.
    const stamp = Date.now().toString(36).toUpperCase()
    await page.goto("/dashboard/grn/create")
    await page.getByLabel("Showroom *").selectOption({ label: fx.branchA.name })
    await page.getByLabel("Transport reference number").fill(`SUP-${stamp}`)
    await page.locator("#bike-0-chassis").fill(`E2E-SUP-${stamp}`)
    await page.locator("#bike-0-battery").fill(`BAT-SUP-${stamp}`)
    await page.locator("#bike-0-color").selectOption({ index: 1 })
    await page.getByRole("button", { name: "Create GRN" }).click()
    await expect
      .poll(() => db.gRN.count({ where: { organizationId: fx.orgId, transportRefNumber: `SUP-${stamp}` } }), { timeout: 90_000 })
      .toBe(1)
    const newGrn = await db.gRN.findFirstOrThrow({ where: { organizationId: fx.orgId, transportRefNumber: `SUP-${stamp}` } })

    await page.goto("/dashboard/suppliers/payments")
    await page.getByRole("row").filter({ hasText: newGrn.grnNumber }).getByRole("button", { name: "Set up" }).click()
    const setup = page.getByRole("dialog", { name: `Set payable for ${newGrn.grnNumber}` })
    await setup.getByLabel("Supplier").selectOption({ label: fx.supplier.name })
    await setup.getByLabel("Total amount (Rs.)").fill("50000")
    await setup.getByRole("button", { name: "Save" }).click()
    await expect(setup).toBeHidden({ timeout: 60_000 })
    expect((await db.gRN.findUniqueOrThrow({ where: { id: newGrn.id } })).balanceAmount).toBe(50000)

    // Apply the 30,000 advance to the new GRN.
    await paySupplier(page, {
      supplierName: fx.supplier.name,
      method: "ADVANCE",
      allocations: { [newGrn.grnNumber]: 30000 },
    })
    const after = await db.gRN.findUniqueOrThrow({ where: { id: newGrn.id } })
    expect(after.paymentStatus).toBe("PARTIAL")
    expect(after.paidAmount).toBe(30000)
    expect(after.balanceAmount).toBe(20000)
    const spent = await db.supplierAdvance.findUniqueOrThrow({ where: { id: advance.id } })
    expect(spent.balanceAmount).toBe(0)
    expect(spent.usedAmount).toBe(30000)
    await close()
  })

  test("over-allocation is blocked in the dialog and by the server", async ({ browser }) => {
    const before = await db.supplierPayment.count({ where: { organizationId: fx.orgId } })
    const { page, close } = await pageAs(browser, "owner")

    // UI: 150,000 against a GRN that owes 100,000.
    const dialog = await fillPayDialog(page, {
      supplierName: fx.supplier.name,
      method: "BankTransfer",
      amount: 150000,
      allocations: { [G.overAlloc.grnNumber]: 150000 },
    })
    const input = dialog.getByLabel(`Amount for ${G.overAlloc.grnNumber}`)
    await dialog.getByRole("button", { name: "Record payment" }).click()
    expect(await input.evaluate((el: HTMLInputElement) => el.validity.rangeOverflow)).toBe(true)
    await dialog.locator("form").evaluate((f: HTMLFormElement) => { f.noValidate = true })
    await dialog.getByRole("button", { name: "Record payment" }).click()
    await expect(page.getByText(/exceeds the balance/i).first()).toBeVisible()
    await expect(dialog).toBeVisible()

    // Server: the dialog was opened while the GRN still owed 100,000; meanwhile 60,000 is paid elsewhere.
    await dialog.getByLabel(`Amount for ${G.overAlloc.grnNumber}`).fill("100000")
    await dialog.getByLabel("Amount (Rs.)").fill("100000")
    await db.gRN.update({
      where: { id: G.overAlloc.id },
      data: { paidAmount: 60000, balanceAmount: 40000, paymentStatus: "PARTIAL" },
    })
    await dialog.getByRole("button", { name: "Record payment" }).click()
    await expect(page.getByText(/Allocation exceeds the outstanding balance/i).first()).toBeVisible()
    const g = await grn("overAlloc")
    expect(g.paidAmount).toBe(60000)
    expect(g.balanceAmount).toBe(40000)
    expect(await db.supplierPayment.count({ where: { organizationId: fx.orgId } })).toBe(before)
    await close()
  })

  test("a user without RECORD_PAYMENTS cannot record a payment", async ({ browser }) => {
    const before = await db.supplierPayment.count({ where: { organizationId: fx.orgId } })

    // The cashier cannot even open the page.
    const c = await pageAs(browser, "cashier")
    await c.page.goto("/dashboard/suppliers/payments")
    await expect.poll(() => new URL(c.page.url()).pathname, { timeout: 30_000 }).not.toBe("/dashboard/suppliers/payments")
    await c.close()

    // A user who may view suppliers (MANAGE_SUPPLIERS) but lacks RECORD_PAYMENTS is refused by the server.
    const v = await pageAs(browser, "supplierViewer")
    const dialog = await fillPayDialog(v.page, {
      supplierName: fx.supplier.name,
      method: "Cash",
      amount: 10000,
      allocations: { [G.advTarget.grnNumber]: 10000 },
    })
    await dialog.getByRole("button", { name: "Record payment" }).click()
    await expect(v.page.getByText(/permission/i).first()).toBeVisible()
    expect(await db.supplierPayment.count({ where: { organizationId: fx.orgId } })).toBe(before)
    expect((await grn("advTarget")).paidAmount).toBe(0)
    await v.close()
  })
})
