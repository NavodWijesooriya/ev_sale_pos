import { test, expect, loadFixtures, pageAs } from "../fixtures"
import { db } from "../db"
import { createSale } from "../helpers"

const money = (n: number) => n.toLocaleString("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })

test.describe.serial("finance sale", () => {
  const fx = loadFixtures()
  let saleId = ""
  let invoiceNumber = ""

  test("owner creates a finance sale: Pending FinanceDetail, commission = loan x 3%, insurance commission 0", async ({ browser }) => {
    const { page, close } = await pageAs(browser, "owner")
    const sale = await createSale(page, {
      customerName: fx.customers.financeOne.name,
      chassis: "E2E-STOCK-FIN-01",
      paymentType: "FINANCE",
      financeCompany: fx.financeCompany.name,
      // Full insurance is selected on purpose: finance sales earn no insurance commission.
      insurance: "FULL_DEALER",
      insuranceCompany: fx.insuranceCompany.name,
    })
    saleId = sale.saleId
    invoiceNumber = sale.invoiceNumber

    const row = await db.sale.findUniqueOrThrow({ where: { id: saleId }, include: { financeDetail: true, vehicle: true } })
    expect(row.vehicle.status).toBe("Sold")
    expect(row.paymentType).toBe("FINANCE")
    expect(row.financeDetail).not.toBeNull()
    const fd = row.financeDetail!
    expect(fd.status).toBe("Pending")
    expect(fd.financeCompanyId).toBe(fx.financeCompany.id)
    expect(fd.totalFinanceAmount).toBeGreaterThan(0)
    expect(fd.receivedAmount).toBe(0)
    expect(fd.balanceAmount).toBe(fd.totalFinanceAmount)
    expect(row.financeAmount).toBe(fd.totalFinanceAmount)
    // 3% of the finance amount.
    expect(row.financeCommission).toBeCloseTo(fd.totalFinanceAmount * 0.03, 2)
    expect(row.insuranceCommission ?? 0).toBe(0)
    await close()
  })

  test("it appears in Finance Receivables and in the dashboard Pending Finance card", async ({ browser }) => {
    const sale = await db.sale.findUniqueOrThrow({ where: { id: saleId }, include: { financeDetail: true } })
    const owed = sale.financeDetail!.balanceAmount
    const { page, close } = await pageAs(browser, "owner")

    await page.goto("/dashboard/finance/receivables")
    // Company name and count sit in separate elements of the group header.
    await expect(page.getByText("1 sale(s) · outstanding")).toBeVisible()
    const row = page.getByRole("row").filter({ hasText: fx.customers.financeOne.name })
    await expect(row).toBeVisible()
    await expect(row).toContainText("Pending")
    await expect(row).toContainText(money(owed))

    await page.goto("/dashboard")
    const card = page.getByRole("link", { name: /Pending Finance \/ Leases/ })
    await expect(card).toBeVisible()
    // The dashboard card shows whole rupees (no decimals).
    await expect(card).toContainText(owed.toLocaleString("en-LK", { maximumFractionDigits: 0 }))
    await expect(card).toContainText("1 sale awaiting finance payment")
    await card.click()
    await expect(page).toHaveURL(/finance\/receivables/)
    await close()
  })

  test("Commission Reports shows the finance commission (owner only)", async ({ browser }) => {
    const sale = await db.sale.findUniqueOrThrow({ where: { id: saleId } })
    const { page, close } = await pageAs(browser, "owner")
    await page.goto("/dashboard/finance/commissions")
    const row = page.getByRole("row").filter({ hasText: invoiceNumber }).first()
    await expect(row).toBeVisible()
    await expect(row).toContainText(money(sale.financeCommission ?? 0).replace(/\.00$/, ""))
    await close()
  })

  test("branch isolation: receivables staff in Branch B do not see the Branch A receivable", async ({ browser }) => {
    const b = await pageAs(browser, "receivablesStaff")
    await b.page.goto("/dashboard/finance/receivables")
    await expect(b.page.getByRole("heading", { name: "Finance Receivables" })).toBeVisible()
    await expect(b.page.getByText(fx.customers.financeOne.name)).toHaveCount(0)
    await b.page.goto("/dashboard")
    // The card exists for this user but must not count Branch A's sale.
    await expect(b.page.getByRole("link", { name: /Pending Finance \/ Leases/ })).toContainText("All finance payments received")
    await b.close()

    const a = await pageAs(browser, "branchManager")
    await a.page.goto("/dashboard/finance/receivables")
    await expect(a.page.getByText(fx.customers.financeOne.name)).toBeVisible()
    await a.close()
  })
})
