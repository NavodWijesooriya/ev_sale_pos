import { test, expect, loadFixtures, pageAs } from "../fixtures"
import { db } from "../db"
import { createSale, fillSaleForm } from "../helpers"

const fx = loadFixtures()
const C = fx.customers

async function setCharges(browser: Parameters<typeof pageAs>[0], values: { finance: number; cash: number; insurance: number }) {
  const { page, close } = await pageAs(browser, "owner")
  await page.goto("/dashboard/settings/sale-charges")
  await page.getByLabel(/RMV charge: Finance sales/).fill(String(values.finance))
  await page.getByLabel(/RMV charge: Cash sales/).fill(String(values.cash))
  await page.getByLabel(/Third-party insurance amount/).fill(String(values.insurance))
  await page.getByRole("button", { name: "Save sale charges" }).click()
  await expect
    .poll(async () => (await db.commissionSettings.findUnique({ where: { organizationId: fx.orgId } }))?.rmvChargeCash, { timeout: 60_000 })
    .toBe(values.cash)
  await close()
}

test.describe.serial("sale charges: RMV and third-party insurance", () => {
  let cashSaleId = ""
  let thirdPartySaleId = ""

  test("a cash sale gets the Cash RMV charge automatically; the form shows it read-only", async ({ browser }) => {
    const { page, close } = await pageAs(browser, "owner")
    await fillSaleForm(page, { customerName: C.chargeBuyer.name, chassis: "E2E-STOCK-CHG-01", paymentType: "CASH" })

    const rmv = page.locator("#sale-rmv-charge")
    await expect(rmv).toHaveValue(/10,300/)
    await expect(rmv).toHaveAttribute("readonly", "")
    await expect(page.getByTestId("summary-rmv-charge")).toContainText("10,300")
    // 500,000 bike + 10,300 RMV.
    await expect(page.getByTestId("summary-grand-total")).toContainText("510,300")
    await expect(page.getByTestId("summary-third-party")).toHaveCount(0)

    await page.getByRole("button", { name: /Complete Sale/ }).click()
    await page.waitForURL(/\/dashboard\/sales\/[^/]+\/invoice/, { timeout: 60_000 })
    cashSaleId = page.url().match(/sales\/([^/]+)\/invoice/)![1]

    const row = await db.sale.findUniqueOrThrow({ where: { id: cashSaleId }, include: { items: true } })
    expect(row.rmvCharge).toBe(10_300)
    expect(row.thirdPartyInsurance).toBe(0)
    expect(row.items[0].price).toBe(500_000)
    expect(row.totalAmount).toBe(510_300)

    // The invoice prints the bike price, RMV charges and the grand total on separate lines.
    await expect(page.getByTestId("invoice-rmv-charge")).toContainText("10,300")
    await expect(page.getByTestId("invoice-third-party-insurance")).toHaveCount(0)
    await expect(page.getByTestId("invoice-grand-total")).toContainText("510,300")
    await close()
  })

  test("ticking third-party insurance adds the settings amount; each amount is saved separately", async ({ browser }) => {
    const { page, close } = await pageAs(browser, "owner")
    await fillSaleForm(page, { customerName: C.chargeBuyer.name, chassis: "E2E-STOCK-CHG-02", paymentType: "CASH", thirdPartyInsurance: true })
    await expect(page.getByTestId("summary-third-party")).toContainText("1,200")
    await expect(page.getByTestId("summary-grand-total")).toContainText("511,500")

    await page.getByRole("button", { name: /Complete Sale/ }).click()
    await page.waitForURL(/\/dashboard\/sales\/[^/]+\/invoice/, { timeout: 60_000 })
    thirdPartySaleId = page.url().match(/sales\/([^/]+)\/invoice/)![1]

    const row = await db.sale.findUniqueOrThrow({ where: { id: thirdPartySaleId }, include: { items: true } })
    expect(row.rmvCharge).toBe(10_300)
    expect(row.thirdPartyInsurance).toBe(1_200)
    expect(row.items[0].price).toBe(500_000)
    expect(row.totalAmount).toBe(511_500)
    // Third-party insurance is not the dealership insurance type and earns no commission.
    expect(row.insuranceType).toBe("NONE")
    expect(row.insuranceCommission ?? 0).toBe(0)

    await expect(page.getByTestId("invoice-rmv-charge")).toContainText("10,300")
    await expect(page.getByTestId("invoice-third-party-insurance")).toContainText("1,200")
    await expect(page.getByTestId("invoice-grand-total")).toContainText("511,500")
    await close()
  })

  test("a finance sale gets the Finance RMV charge; the loan, commission and receivable stay on the bike price", async ({ browser }) => {
    const { page, close } = await pageAs(browser, "owner")
    const sale = await createSale(page, {
      customerName: C.chargeBuyer.name,
      chassis: "E2E-STOCK-CHG-03",
      paymentType: "FINANCE",
      financeCompany: fx.financeCompany.name,
      // Full dealer insurance is picked on purpose: it earns no commission on a finance sale.
      insurance: "FULL_DEALER",
      insuranceCompany: fx.insuranceCompany.name,
      thirdPartyInsurance: true,
    })
    const row = await db.sale.findUniqueOrThrow({ where: { id: sale.saleId }, include: { financeDetail: true } })
    expect(row.paymentType).toBe("FINANCE")
    expect(row.rmvCharge).toBe(14_300)
    expect(row.thirdPartyInsurance).toBe(1_200)
    // Down payment + loan still equal the bike price, so the loan does not pay for RMV / insurance.
    expect(row.downPayment + row.financeAmount).toBe(500_000)
    expect(row.totalAmount).toBe(500_000 + 14_300 + 1_200)
    expect(row.financeDetail!.totalFinanceAmount).toBe(row.financeAmount)
    expect(row.financeDetail!.balanceAmount).toBe(row.financeAmount)
    // Finance commission is still the loan x the configured 3%; insurance commission is still 0.
    expect(row.financeCommission).toBeCloseTo(row.financeAmount * 0.03, 2)
    expect(row.insuranceCommission ?? 0).toBe(0)

    await expect(page.getByTestId("invoice-rmv-charge")).toContainText("14,300")
    await expect(page.getByTestId("invoice-grand-total")).toContainText("515,500")
    await close()
  })

  test("changing the owner settings affects new sales only; earlier sales keep their saved amounts", async ({ browser }) => {
    await setCharges(browser, { finance: 15_000, cash: 11_000, insurance: 1_500 })

    const before = await db.sale.findMany({ where: { id: { in: [cashSaleId, thirdPartySaleId] } }, orderBy: { id: "asc" } })
    expect(before.map((s) => s.rmvCharge)).toEqual([10_300, 10_300])
    expect(before.map((s) => s.thirdPartyInsurance).sort()).toEqual([0, 1_200])

    // The old invoice still prints the old amounts.
    const { page, close } = await pageAs(browser, "owner")
    await page.goto(`/dashboard/sales/${thirdPartySaleId}/invoice`)
    await expect(page.getByTestId("invoice-rmv-charge")).toContainText("10,300")
    await expect(page.getByTestId("invoice-third-party-insurance")).toContainText("1,200")

    // A new sale picks up the new amounts. (TIN-01 is a spare bike used only here.)
    const sale = await createSale(page, { customerName: C.chargeBuyer.name, chassis: "E2E-STOCK-TIN-01", paymentType: "CASH", thirdPartyInsurance: true })
    const fresh = await db.sale.findUniqueOrThrow({ where: { id: sale.saleId } })
    expect(fresh.rmvCharge).toBe(11_000)
    expect(fresh.thirdPartyInsurance).toBe(1_500)
    expect(fresh.totalAmount).toBe(512_500)
    await close()

    await setCharges(browser, { finance: 14_300, cash: 10_300, insurance: 1_200 })
  })
})
