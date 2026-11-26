import { test, expect, loadFixtures, pageAs } from "../fixtures"
import { db } from "../db"
import { createSale, fillSaleForm } from "../helpers"

const fx = loadFixtures()
const C = fx.customers

test.describe.serial("TIN number on sales and advances", () => {
  test("a TIN typed on the sale form is saved on the sale and printed on the invoice", async ({ browser }) => {
    const { page, close } = await pageAs(browser, "owner")
    const sale = await createSale(page, {
      customerName: C.tinBuyer.name,
      chassis: "E2E-STOCK-TIN-02",
      paymentType: "CASH",
      tinNumber: "tin-10020030",
    })
    const row = await db.sale.findUniqueOrThrow({ where: { id: sale.saleId } })
    // Stored trimmed and upper-case.
    expect(row.tinNumber).toBe("TIN-10020030")
    await expect(page.getByTestId("invoice-tin")).toHaveText("TIN-10020030")
    await close()
  })

  test("the TIN is optional and a malformed one is refused", async ({ browser }) => {
    const { page, close } = await pageAs(browser, "owner")
    await fillSaleForm(page, { customerName: C.tinBuyer.name, chassis: "E2E-STOCK-TIN-03", paymentType: "CASH", tinNumber: "x!" })
    await page.getByRole("button", { name: /Complete Sale/ }).click()
    await expect(page.getByText("TIN must be 5 to 20 letters, numbers or dashes.")).toBeVisible()
    expect(await db.sale.count({ where: { organizationId: fx.orgId, vehicle: { chassisNumber: "E2E-STOCK-TIN-03" } } })).toBe(0)

    // Blank is fine: the sale is made without a TIN and the invoice has no TIN line.
    await page.locator("#sale-tin-number").fill("")
    await page.getByRole("button", { name: /Complete Sale/ }).click()
    await page.waitForURL(/\/dashboard\/sales\/[^/]+\/invoice/, { timeout: 60_000 })
    const saleId = page.url().match(/sales\/([^/]+)\/invoice/)![1]
    expect((await db.sale.findUniqueOrThrow({ where: { id: saleId } })).tinNumber).toBeNull()
    await expect(page.getByTestId("invoice-tin")).toHaveCount(0)
    await close()
  })

  test("a TIN recorded with an advance is saved, shown in the list and carried into the sale that uses it", async ({ browser }) => {
    // Use a customer without a sale TIN yet: the advance holder.
    const { page, close } = await pageAs(browser, "owner")
    await page.goto("/dashboard/sales/advances")
    await page.getByRole("button", { name: "Add Advance" }).click()
    const dialog = page.getByRole("dialog", { name: "Record Advance Payment" })
    const customer = dialog.getByRole("combobox", { name: "Customer *" })
    await customer.click()
    await customer.fill(C.histBuyer.name)
    await dialog.getByRole("option", { name: new RegExp(C.histBuyer.name) }).first().click()
    await dialog.getByLabel("Advance Amount (Rs.) *").fill("25000")
    await dialog.getByLabel(/TIN Number/).fill("adv-tin-777")
    await dialog.getByRole("button", { name: "Record Advance" }).click()
    await expect
      .poll(() => db.advancePayment.count({ where: { organizationId: fx.orgId, customerId: C.histBuyer.id } }), { timeout: 90_000 })
      .toBe(1)
    const advance = await db.advancePayment.findFirstOrThrow({ where: { organizationId: fx.orgId, customerId: C.histBuyer.id } })
    expect(advance.tinNumber).toBe("ADV-TIN-777")

    await page.goto("/dashboard/sales/advances")
    await expect(page.getByRole("row").filter({ hasText: C.histBuyer.name })).toContainText("TIN: ADV-TIN-777")

    // The sale form picks the TIN up from the pending advance; the cashier did not type one.
    await fillSaleForm(page, { customerName: C.histBuyer.name, chassis: "E2E-STOCK-HIST-01", paymentType: "CASH" })
    await expect(page.locator("#sale-tin-number")).toHaveValue("ADV-TIN-777", { timeout: 30_000 })
    await page.getByRole("button", { name: /Complete Sale/ }).click()
    await page.waitForURL(/\/dashboard\/sales\/[^/]+\/invoice/, { timeout: 60_000 })
    const saleId = page.url().match(/sales\/([^/]+)\/invoice/)![1]
    const sale = await db.sale.findUniqueOrThrow({ where: { id: saleId } })
    expect(sale.advancePaymentId).toBe(advance.id)
    expect(sale.tinNumber).toBe("ADV-TIN-777")
    await expect(page.getByTestId("invoice-tin")).toHaveText("ADV-TIN-777")
    await close()
  })
})
