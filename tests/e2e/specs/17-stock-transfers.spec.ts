import type { Page } from "@playwright/test"
import { test, expect, loadFixtures, pageAs } from "../fixtures"
import { db } from "../db"
import { fillSaleForm } from "../helpers"

const fx = loadFixtures()
const X1 = "E2E-STOCK-XFER-01"
const X2 = "E2E-STOCK-XFER-02"
const X3 = "E2E-STOCK-XFER-03"
const X4 = "E2E-STOCK-XFER-04"
const AGED = "E2E-AGE-120"

async function bike(chassisNumber: string) {
  return db.vehicle.findUniqueOrThrow({ where: { chassisNumber } })
}
const stockCount = (branchId: string) => db.vehicle.count({ where: { organizationId: fx.orgId, branchId, status: "AVAILABLE" } })
const audits = (action: string) => db.auditLog.count({ where: { organizationId: fx.orgId, action } })

async function dispatch(page: Page, from: string, to: string, chassis: string[], notes = "") {
  await page.goto("/dashboard/grn/transfers")
  await page.getByRole("button", { name: "New transfer" }).click()
  const dialog = page.getByRole("dialog", { name: "Dispatch stock transfer" })
  // Branch staff have a fixed source branch (the select is locked to their own branch).
  const fromSelect = dialog.getByLabel("From branch")
  if (await fromSelect.isEnabled()) await fromSelect.selectOption({ label: from })
  else await expect(fromSelect.locator("option:checked")).toHaveText(from)
  await dialog.getByLabel("To branch").selectOption({ label: to })
  for (const c of chassis) await dialog.getByLabel(c, { exact: true }).check()
  if (notes) await dialog.getByLabel("Notes").fill(notes)
  return dialog
}

async function lastTransfer() {
  return db.stockTransfer.findFirstOrThrow({
    where: { organizationId: fx.orgId },
    orderBy: { dispatchedAt: "desc" },
    include: { items: true },
  })
}

test.describe.serial("inter-branch stock transfer", () => {
  let transferId = ""
  let transferNumber = ""
  let aMinus = 0

  test("dispatch moves the bikes out of the source stock into transit", async ({ browser }) => {
    const aBefore = await stockCount(fx.branchA.id)
    const bBefore = await stockCount(fx.branchB.id)
    const { page, close } = await pageAs(browser, "branchManager") // Branch A
    const dialog = await dispatch(page, fx.branchA.name, fx.branchB.name, [X1, X2], "E2E dispatch")
    await dialog.getByRole("button", { name: "Dispatch" }).click()
    await expect.poll(() => db.stockTransfer.count({ where: { organizationId: fx.orgId } }), { timeout: 90_000 }).toBe(1)

    const transfer = await lastTransfer()
    transferId = transfer.id
    transferNumber = transfer.transferNumber
    expect(transfer.status).toBe("IN_TRANSIT")
    expect(transfer.fromBranchId).toBe(fx.branchA.id)
    expect(transfer.toBranchId).toBe(fx.branchB.id)
    expect(transfer.items).toHaveLength(2)
    expect(transfer.dispatchedByName).toBe(fx.users.branchManager.name)
    for (const c of [X1, X2]) {
      const v = await bike(c)
      expect(v.status).toBe("InTransit")
      expect(v.branchId).toBe(fx.branchA.id) // still on the source branch's books until received
    }
    // The source stock dropped by 2; the destination has not gained them yet.
    aMinus = aBefore - (await stockCount(fx.branchA.id))
    expect(aMinus).toBe(2)
    expect(await stockCount(fx.branchB.id)).toBe(bBefore)
    expect(await audits("STOCK_TRANSFER_DISPATCHED")).toBe(1)

    await page.goto("/dashboard/grn/transfers")
    const row = page.getByRole("row").filter({ hasText: transferNumber })
    await expect(row).toContainText("In transit")
    await expect(row).toContainText(X1)
    await expect(row).toContainText(X2)
    // In transit bikes are no longer in the stock list.
    await page.goto("/dashboard/grn/stock")
    await expect(page.getByText(X1)).toHaveCount(0)
    await close()
  })

  test("bikes in transit cannot be sold or dispatched again", async ({ browser }) => {
    const { page, close } = await pageAs(browser, "owner")
    // Not offered in the POS vehicle search...
    await page.goto("/dashboard/sales/new")
    const vehicle = page.getByRole("combobox", { name: "Available vehicle" })
    await vehicle.click()
    await vehicle.fill(X1)
    await expect(page.getByRole("option", { name: new RegExp(X1) })).toHaveCount(0)
    // ...and not offered for another transfer.
    const dialog = await dispatch(page, fx.branchA.name, fx.branchB.name, [X3])
    await expect(dialog.getByLabel(X1, { exact: true })).toHaveCount(0)
    await expect(dialog.getByLabel(X2, { exact: true })).toHaveCount(0)
    await close()
  })

  test("a stale screen cannot sell a bike that has just gone in transit", async ({ browser }) => {
    const { page, close } = await pageAs(browser, "owner")
    await fillSaleForm(page, { customerName: fx.customers.raceTwo.name, chassis: X4, paymentType: "CASH" })
    // Meanwhile the bike is dispatched elsewhere (simulated directly).
    await db.vehicle.update({ where: { chassisNumber: X4 }, data: { status: "InTransit" } })
    const salesBefore = await db.sale.count({ where: { organizationId: fx.orgId } })
    await page.getByRole("button", { name: /Complete Sale/ }).click()
    await expect(page.getByText(/no longer available|just sold or reserved/i).first()).toBeVisible({ timeout: 60_000 })
    expect(await db.sale.count({ where: { organizationId: fx.orgId } })).toBe(salesBefore)
    expect((await bike(X4)).status).toBe("InTransit")
    await db.vehicle.update({ where: { chassisNumber: X4 }, data: { status: "AVAILABLE" } }) // put it back for later steps
    await close()
  })

  test("branch rules: only the source branch dispatches and cancels, only the destination receives", async ({ browser }) => {
    // Branch B staff can only dispatch out of Branch B, and can receive but not cancel this transfer.
    const b = await pageAs(browser, "transferStaffB")
    await b.page.goto("/dashboard/grn/transfers")
    await b.page.getByRole("button", { name: "New transfer" }).click()
    const fromOptions = await b.page.getByRole("dialog").getByLabel("From branch").locator("option").allInnerTexts()
    expect(fromOptions.map((o) => o.trim())).toEqual([fx.branchB.name])
    await expect(b.page.getByRole("dialog").getByLabel("From branch")).toBeDisabled()
    await b.page.keyboard.press("Escape")
    const row = b.page.getByRole("row").filter({ hasText: transferNumber })
    await expect(row.getByRole("button", { name: "Receive" })).toBeVisible()
    await expect(row.getByRole("button", { name: "Cancel" })).toHaveCount(0)
    await b.close()

    // The source branch can cancel but not receive.
    const a = await pageAs(browser, "branchManager")
    await a.page.goto("/dashboard/grn/transfers")
    const aRow = a.page.getByRole("row").filter({ hasText: transferNumber })
    await expect(aRow.getByRole("button", { name: "Cancel" })).toBeVisible()
    await expect(aRow.getByRole("button", { name: "Receive" })).toHaveCount(0)
    await a.close()

    // Someone without TRANSFER_STOCK cannot open the page.
    const c = await pageAs(browser, "cashier")
    await c.page.goto("/dashboard/grn/transfers")
    await expect.poll(() => new URL(c.page.url()).pathname, { timeout: 30_000 }).not.toBe("/dashboard/grn/transfers")
    await c.close()
  })

  test("receive puts the bikes into the destination stock, exactly once", async ({ browser }) => {
    const bBefore = await stockCount(fx.branchB.id)
    const b = await pageAs(browser, "transferStaffB")
    // A second screen opened before the first receipt (stale).
    const stale = await pageAs(browser, "transferStaffB")
    await stale.page.goto("/dashboard/grn/transfers")
    await stale.page.getByRole("row").filter({ hasText: transferNumber }).getByRole("button", { name: "Receive" }).click()

    await b.page.goto("/dashboard/grn/transfers")
    await b.page.getByRole("row").filter({ hasText: transferNumber }).getByRole("button", { name: "Receive" }).click()
    await b.page.getByRole("dialog").getByRole("button", { name: "Confirm receipt" }).click()
    await expect
      .poll(async () => (await db.stockTransfer.findUniqueOrThrow({ where: { id: transferId } })).status, { timeout: 90_000 })
      .toBe("RECEIVED")

    const done = await db.stockTransfer.findUniqueOrThrow({ where: { id: transferId } })
    expect(done.receivedByName).toBe(fx.users.transferStaffB.name)
    expect(done.receivedAt).not.toBeNull()
    for (const c of [X1, X2]) {
      const v = await bike(c)
      expect(v.status).toBe("AVAILABLE")
      expect(v.branchId).toBe(fx.branchB.id)
    }
    // Both branches' counts: A stays 2 down, B is 2 up.
    expect(await stockCount(fx.branchB.id)).toBe(bBefore + 2)
    expect(await audits("STOCK_TRANSFER_RECEIVED")).toBe(1)

    // The stale screen cannot receive it a second time.
    await stale.page.getByRole("dialog").getByRole("button", { name: "Confirm receipt" }).click()
    await expect(stale.page.getByText(/already received or cancelled/i).first()).toBeVisible({ timeout: 60_000 })
    expect(await stockCount(fx.branchB.id)).toBe(bBefore + 2)
    expect(await audits("STOCK_TRANSFER_RECEIVED")).toBe(1)

    // The bikes now show in Branch B's stock page.
    await b.page.goto("/dashboard/grn/stock")
    await expect(b.page.getByText(X1).first()).toBeVisible()
    await b.close()
    await stale.close()
    expect(aMinus).toBe(2)
  })

  test("a transferred bike keeps its original GRN date for inventory aging", async ({ browser }) => {
    const owner = await pageAs(browser, "owner")
    const dialog = await dispatch(owner.page, fx.branchA.name, fx.branchB.name, [AGED])
    await dialog.getByRole("button", { name: "Dispatch" }).click()
    await expect.poll(() => db.stockTransfer.count({ where: { organizationId: fx.orgId } }), { timeout: 90_000 }).toBe(2)
    const second = await lastTransfer()
    await owner.close()

    const b = await pageAs(browser, "transferStaffB")
    await b.page.goto("/dashboard/grn/transfers")
    await b.page.getByRole("row").filter({ hasText: second.transferNumber }).getByRole("button", { name: "Receive" }).click()
    await b.page.getByRole("dialog").getByRole("button", { name: "Confirm receipt" }).click()
    await expect
      .poll(async () => (await db.stockTransfer.findUniqueOrThrow({ where: { id: second.id } })).status, { timeout: 90_000 })
      .toBe("RECEIVED")
    await b.close()

    const o = await pageAs(browser, "owner")
    await o.page.goto("/dashboard/reports")
    await expect(o.page.getByText("Dead Stock & EV Bike Inventory Aging Analysis")).toBeVisible({ timeout: 60_000 })
    const row = o.page.getByRole("row").filter({ hasText: AGED })
    await expect(row).toContainText(fx.branchB.name)
    await expect(row).toContainText("120 Days (Critical)")
    await o.close()
  })

  test("cancel before receipt returns the bikes to the source branch", async ({ browser }) => {
    const aBefore = await stockCount(fx.branchA.id)
    const a = await pageAs(browser, "branchManager")
    const dialog = await dispatch(a.page, fx.branchA.name, fx.branchB.name, [X3])
    await dialog.getByRole("button", { name: "Dispatch" }).click()
    await expect.poll(() => db.stockTransfer.count({ where: { organizationId: fx.orgId } }), { timeout: 90_000 }).toBe(3)
    const third = await lastTransfer()
    expect((await bike(X3)).status).toBe("InTransit")
    expect(await stockCount(fx.branchA.id)).toBe(aBefore - 1)

    await a.page.goto("/dashboard/grn/transfers")
    await a.page.getByRole("row").filter({ hasText: third.transferNumber }).getByRole("button", { name: "Cancel" }).click()
    await a.page.getByRole("dialog").getByLabel("Reason (optional)").fill("Wrong bike")
    await a.page.getByRole("dialog").getByRole("button", { name: "Confirm cancellation" }).click()
    await expect
      .poll(async () => (await db.stockTransfer.findUniqueOrThrow({ where: { id: third.id } })).status, { timeout: 90_000 })
      .toBe("CANCELLED")

    const v = await bike(X3)
    expect(v.status).toBe("AVAILABLE")
    expect(v.branchId).toBe(fx.branchA.id)
    expect(await stockCount(fx.branchA.id)).toBe(aBefore)
    const cancelled = await db.stockTransfer.findUniqueOrThrow({ where: { id: third.id } })
    expect(cancelled.cancelReason).toBe("Wrong bike")
    expect(await audits("STOCK_TRANSFER_CANCELLED")).toBe(1)
    await a.close()

    // The destination can no longer receive it.
    const b = await pageAs(browser, "transferStaffB")
    await b.page.goto("/dashboard/grn/transfers")
    const row = b.page.getByRole("row").filter({ hasText: third.transferNumber })
    await expect(row).toContainText("Cancelled")
    await expect(row.getByRole("button")).toHaveCount(0)
    await b.close()
  })
})
