import type { Page } from "@playwright/test"
import { test, expect, loadFixtures, pageAs } from "../fixtures"
import { db } from "../db"
import { createSale } from "../helpers"

const fx = loadFixtures()

/** "Pending Rs. 1,000.00 · Settled Rs. 0.00 (for the lines shown)" -> numbers. */
async function totals(page: Page) {
  const text = await page.getByText(/Pending Rs\. .* · Settled Rs\. /).first().innerText()
  const nums = [...text.matchAll(/Rs\. ([\d,]+\.\d\d)/g)].map((m) => Number(m[1].replace(/,/g, "")))
  return { pending: nums[0], settled: nums[1] }
}

async function settlementRow(page: Page, invoice: string, type: string) {
  await page.goto("/dashboard/finance/commissions")
  await page.getByLabel("Commission type").selectOption({ label: type })
  // The settlement table is the one with an "Action" column.
  return page.getByRole("row").filter({ hasText: invoice }).filter({ hasText: type }).filter({ has: page.getByRole("button", { name: /Settle|Reopen/ }) })
}

test.describe.serial("commission settlement (owner only)", () => {
  let financeInvoice = ""
  let insuranceInvoice = ""
  let financeCommission = 0

  test("setup: a finance sale and a full-insurance cash sale create pending commission lines", async ({ browser }) => {
    const { page, close } = await pageAs(browser, "owner")
    const fin = await createSale(page, {
      customerName: fx.customers.commFinance.name,
      chassis: "E2E-STOCK-COMM-01",
      paymentType: "FINANCE",
      financeCompany: fx.financeCompany.name,
    })
    financeInvoice = fin.invoiceNumber
    const finRow = await db.sale.findUniqueOrThrow({ where: { id: fin.saleId } })
    financeCommission = finRow.financeCommission ?? 0
    expect(financeCommission).toBeCloseTo(finRow.financeAmount * 0.03, 2)

    const ins = await createSale(page, {
      customerName: fx.customers.commInsurance.name,
      chassis: "E2E-STOCK-COMM-02",
      paymentType: "CASH",
      insurance: "FULL_DEALER",
      insuranceCompany: fx.insuranceCompany.name,
    })
    insuranceInvoice = ins.invoiceNumber
    expect((await db.sale.findUniqueOrThrow({ where: { id: ins.saleId } })).insuranceCommission).toBe(2000)

    await page.goto("/dashboard/finance/commissions")
    await expect(await settlementRow(page, financeInvoice, "Finance / Leasing")).toContainText("PENDING")
    await expect(await settlementRow(page, insuranceInvoice, "Insurance")).toContainText("PENDING")
    await close()
  })

  test("settling the finance commission with a reference updates the totals", async ({ browser }) => {
    const { page, close } = await pageAs(browser, "owner")
    let row = await settlementRow(page, financeInvoice, "Finance / Leasing")
    await expect(row).toContainText("PENDING")
    // Totals for the finance lines only (the type filter is applied), before settling.
    const before = await totals(page)
    expect(before.pending).toBeGreaterThanOrEqual(financeCommission)

    await row.getByRole("button", { name: "Settle" }).click()
    const dialog = page.getByRole("dialog")
    await dialog.getByLabel("Status").selectOption("SETTLED")
    await dialog.getByLabel("Reference / notes").fill("E2E-REF-FIN-1")
    await dialog.getByRole("button", { name: "Save" }).click()

    await expect
      .poll(async () => (await db.commissionSettlement.count({ where: { saleId: (await sale(financeInvoice)).id } })) > 0, { timeout: 90_000 })
      .toBe(true)
    row = await settlementRow(page, financeInvoice, "Finance / Leasing")
    await expect(row).toContainText("SETTLED")
    await expect(row).toContainText("E2E-REF-FIN-1")
    const after = await totals(page)
    expect(after.pending).toBeCloseTo(before.pending - financeCommission, 2)
    expect(after.settled).toBeCloseTo(before.settled + financeCommission, 2)

    const saved = await db.commissionSettlement.findFirstOrThrow({ where: { saleId: (await sale(financeInvoice)).id, type: "FINANCE" } })
    expect(saved.status).toBe("SETTLED")
    expect(saved.reference).toBe("E2E-REF-FIN-1")
    expect(saved.settledAt).not.toBeNull()
    await close()
  })

  test("settling the insurance commission is independent of the finance one", async ({ browser }) => {
    const { page, close } = await pageAs(browser, "owner")
    let row = await settlementRow(page, insuranceInvoice, "Insurance")
    const before = await totals(page)
    await row.getByRole("button", { name: "Settle" }).click()
    const dialog = page.getByRole("dialog")
    await dialog.getByLabel("Status").selectOption("SETTLED")
    await dialog.getByLabel("Reference / notes").fill("E2E-REF-INS-1")
    await dialog.getByRole("button", { name: "Save" }).click()
    await expect
      .poll(async () => db.commissionSettlement.count({ where: { saleId: (await sale(insuranceInvoice)).id, type: "INSURANCE", status: "SETTLED" } }), { timeout: 90_000 })
      .toBe(1)
    row = await settlementRow(page, insuranceInvoice, "Insurance")
    await expect(row).toContainText("SETTLED")
    const after = await totals(page)
    expect(after.pending).toBeCloseTo(before.pending - 2000, 2)
    expect(after.settled).toBeCloseTo(before.settled + 2000, 2)
    // The finance line is still settled, untouched.
    expect(await db.commissionSettlement.count({ where: { saleId: (await sale(financeInvoice)).id, type: "FINANCE", status: "SETTLED" } })).toBe(1)
    await close()
  })

  test("an RMV commission can be added and shows as pending", async ({ browser }) => {
    const { page, close } = await pageAs(browser, "owner")
    await page.goto("/dashboard/finance/commissions")
    await page.getByRole("button", { name: "RMV commission" }).click()
    const dialog = page.getByRole("dialog", { name: "Add RMV commission" })
    await dialog.getByLabel("Invoice number").fill(insuranceInvoice)
    await dialog.getByLabel("Amount (Rs.)").fill("1500")
    await dialog.getByRole("button", { name: "Add" }).click()
    await expect
      .poll(async () => db.commissionSettlement.count({ where: { saleId: (await sale(insuranceInvoice)).id, type: "RMV" } }), { timeout: 90_000 })
      .toBe(1)
    const rmv = await db.commissionSettlement.findFirstOrThrow({ where: { saleId: (await sale(insuranceInvoice)).id, type: "RMV" } })
    expect(rmv.status).toBe("PENDING")
    expect(rmv.amount).toBe(1500)

    const row = await settlementRow(page, insuranceInvoice, "RMV")
    await expect(row).toContainText("PENDING")
    await expect(row).toContainText("1,500.00")
    await close()
  })

  test("non-owners cannot see or open commission settlement, even by direct URL", async ({ browser }) => {
    for (const role of ["branchManager", "cashier", "receivablesStaff"] as const) {
      const { page, close } = await pageAs(browser, role)
      await page.goto("/dashboard/finance/commissions")
      await expect.poll(() => new URL(page.url()).pathname, { timeout: 30_000 }).not.toBe("/dashboard/finance/commissions")
      await expect(page.getByText("Commission settlement")).toHaveCount(0)
      await expect(page.getByText("E2E-REF-FIN-1")).toHaveCount(0)
      await close()
    }
  })
})

async function sale(invoiceNumber: string) {
  return db.sale.findUniqueOrThrow({ where: { invoiceNumber } })
}
