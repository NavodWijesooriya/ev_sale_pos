import type { Page } from "@playwright/test"
import { test, expect, loadFixtures, pageAs } from "../fixtures"
import { db } from "../db"
import { createSale } from "../helpers"

const fx = loadFixtures()
const money = (n: number) => `Rs. ${n.toLocaleString("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

async function depositFormFill(page: Page, o: { branch: string; account: string; amount: number; slip: string }) {
  await page.goto("/dashboard/finance/bank-deposits")
  await page.getByLabel("Branch / showroom").selectOption({ label: o.branch })
  await page.getByLabel("Bank account").selectOption({ label: o.account })
  await page.getByLabel("Deposit amount (Rs.)").fill(String(o.amount))
  await page.getByLabel("Slip / reference number").fill(o.slip)
}

test.describe.serial("bank deposits", () => {
  const ACC1 = "E2E Bank · ACC-001"
  const ACC2 = "E2E Bank Two · ACC-002"
  let acc1Id = ""

  test("setup: the owner adds a bank account and a cash sale is made at Branch B", async ({ browser }) => {
    const { page, close } = await pageAs(browser, "owner")
    await page.goto("/dashboard/finance/bank-deposits")
    await page.getByRole("button", { name: "+ Add account" }).click()
    const dialog = page.getByRole("dialog", { name: "Add bank account" })
    await dialog.getByLabel("Bank", { exact: true }).fill("E2E Bank")
    await dialog.getByLabel("Account number").fill("ACC-001")
    await dialog.getByRole("button", { name: "Add account" }).click()
    await expect
      .poll(() => db.bankAccount.count({ where: { organizationId: fx.orgId, accountNumber: "ACC-001" } }), { timeout: 90_000 })
      .toBe(1)
    acc1Id = (await db.bankAccount.findFirstOrThrow({ where: { organizationId: fx.orgId, accountNumber: "ACC-001" } })).id
    // A second account (set up directly) to prove the slip rule is per account.
    await db.bankAccount.create({ data: { organizationId: fx.orgId, bankName: "E2E Bank Two", accountNumber: "ACC-002" } })

    const sale = await createSale(page, { customerName: fx.customers.depositSale.name, chassis: "E2E-STOCK-DEP-01", paymentType: "CASH" })
    const row = await db.sale.findUniqueOrThrow({ where: { id: sale.saleId } })
    expect(row.branchId).toBe(fx.branchB.id)
    expect(row.paymentMethod).toBe("Cash")
    expect(row.totalAmount).toBe(510300)
    await close()
  })

  test("branch staff log a deposit with a slip number and see the day's cash sales total", async ({ browser }) => {
    const { page, close } = await pageAs(browser, "depositStaffB")
    await depositFormFill(page, { branch: fx.branchB.name, account: ACC1, amount: 200000, slip: "SLIP-100" })

    // The reference figures come from that day's cash sales at this branch.
    await expect(page.getByText("Cash sales that day:")).toContainText(money(510300), { timeout: 60_000 })
    await expect(page.getByText("Already deposited:")).toContainText(money(0))
    await expect(page.getByText("Still to deposit:")).toContainText(money(510300))

    await page.getByRole("button", { name: "Record deposit" }).click()
    await expect
      .poll(() => db.bankDeposit.count({ where: { organizationId: fx.orgId, slipNumber: "SLIP-100" } }), { timeout: 90_000 })
      .toBe(1)
    const deposit = await db.bankDeposit.findFirstOrThrow({ where: { organizationId: fx.orgId, slipNumber: "SLIP-100" } })
    expect(deposit.depositAmount).toBe(200000)
    expect(deposit.cashSalesTotal).toBe(510300)
    expect(deposit.branchId).toBe(fx.branchB.id)
    expect(deposit.bankAccountId).toBe(acc1Id)

    // The next look at the same day shows the deposit and what is left.
    await page.goto("/dashboard/finance/bank-deposits")
    await page.getByLabel("Branch / showroom").selectOption({ label: fx.branchB.name })
    await expect(page.getByText("Already deposited:")).toContainText(money(200000), { timeout: 60_000 })
    await expect(page.getByText("Still to deposit:")).toContainText(money(310300))
    await close()
  })

  test("a duplicate slip number for the same account is rejected; the same slip on another account is allowed", async ({ browser }) => {
    const { page, close } = await pageAs(browser, "depositStaffB")
    await depositFormFill(page, { branch: fx.branchB.name, account: ACC1, amount: 50000, slip: "SLIP-100" })
    await page.getByRole("button", { name: "Record deposit" }).click()
    await expect(page.getByText(/slip number was already recorded for that bank account/i).first()).toBeVisible({ timeout: 60_000 })
    expect(await db.bankDeposit.count({ where: { organizationId: fx.orgId, slipNumber: "SLIP-100" } })).toBe(1)

    // Different account, same slip text: a different slip book, so it is accepted.
    await page.getByLabel("Bank account").selectOption({ label: ACC2 })
    await page.getByRole("button", { name: "Record deposit" }).click()
    await expect
      .poll(() => db.bankDeposit.count({ where: { organizationId: fx.orgId, slipNumber: "SLIP-100" } }), { timeout: 90_000 })
      .toBe(2)
    await close()
  })

  test("branch staff only see their own branch; the owner sees all", async ({ browser }) => {
    const a = await pageAs(browser, "depositStaffA")
    await a.page.goto("/dashboard/finance/bank-deposits")
    const options = await a.page.getByLabel("Branch / showroom").locator("option").allInnerTexts()
    expect(options.map((o) => o.trim())).toEqual(["Select branch", fx.branchA.name])
    // Branch B's deposits are not in Branch A staff's report.
    await expect(a.page.getByText("SLIP-100")).toHaveCount(0)
    await a.close()

    const b = await pageAs(browser, "depositStaffB")
    await b.page.goto("/dashboard/finance/bank-deposits")
    const bOptions = await b.page.getByLabel("Branch / showroom").locator("option").allInnerTexts()
    expect(bOptions.map((o) => o.trim())).toEqual(["Select branch", fx.branchB.name])
    await expect(b.page.getByText("SLIP-100").first()).toBeVisible()
    await b.close()

    const o = await pageAs(browser, "owner")
    await o.page.goto("/dashboard/finance/bank-deposits")
    const ownerOptions = await o.page.getByLabel("Branch / showroom").locator("option").allInnerTexts()
    expect(ownerOptions.map((x) => x.trim())).toEqual(["Select branch", fx.branchA.name, fx.branchB.name])
    await o.close()
  })
})
