import { test, expect, loadFixtures, pageAs } from "../fixtures"
import { db } from "../db"
import { createSale } from "../helpers"

test.describe.serial("cash sale with full dealer insurance", () => {
  let saleId = ""
  let invoiceNumber = ""
  const fx = loadFixtures()

  test("owner completes the sale; bike becomes Sold; insurance commission is 2000", async ({ browser }) => {
    const { page, close } = await pageAs(browser, "owner")
    const sale = await createSale(page, {
      customerName: fx.customers.cashSale.name,
      chassis: "E2E-STOCK-CASH-01",
      paymentType: "CASH",
      insurance: "FULL_DEALER",
      insuranceCompany: fx.insuranceCompany.name,
    })
    saleId = sale.saleId
    invoiceNumber = sale.invoiceNumber

    // The invoice opened and shows the customer and the bike.
    await expect(page).toHaveURL(new RegExp(`/dashboard/sales/${saleId}/invoice`))
    await expect(page.getByText(fx.customers.cashSale.name).first()).toBeVisible()
    await expect(page.getByText("E2E-STOCK-CASH-01").first()).toBeVisible()

    const row = await db.sale.findUniqueOrThrow({ where: { id: saleId }, include: { vehicle: true } })
    expect(row.vehicle.status).toBe("Sold")
    expect(row.paymentType).toBe("CASH")
    expect(row.insuranceType).toBe("FULL_DEALER")
    expect(row.insuranceCommission).toBe(2000)
    expect(row.financeCommission ?? 0).toBe(0)
    expect(row.organizationId).toBe(fx.orgId)
    await close()
  })

  test("owner sees Rs. 2,000 insurance commission in Commission Reports", async ({ browser }) => {
    const { page, close } = await pageAs(browser, "owner")
    await page.goto("/dashboard/finance/commissions")
    const row = page.getByRole("row").filter({ hasText: invoiceNumber }).first()
    await expect(row).toBeVisible()
    await expect(row).toContainText("2,000")
    await close()
  })

  test("cashier cannot see any commission value on dashboard, sale, invoice or reports", async ({ browser }) => {
    const { page, close } = await pageAs(browser, "cashier")
    for (const url of ["/dashboard", `/dashboard/sales/${saleId}`, `/dashboard/sales/${saleId}/invoice`, "/dashboard/sales/new", "/dashboard/sales/history"]) {
      await page.goto(url)
      await page.waitForLoadState("networkidle")
      const text = await page.locator("body").innerText()
      expect(text, `${url} should not mention commission`).not.toMatch(/commission/i)
      expect(text, `${url} should not show the 2,000 commission value`).not.toContain("2,000")
    }
    // The commission reports page itself is closed to the cashier.
    await page.goto("/dashboard/finance/commissions")
    await expect(page).not.toHaveURL(/finance\/commissions/)
    await page.goto("/dashboard/reports")
    await expect(page).not.toHaveURL(/dashboard\/reports/)
    await close()
  })
})
