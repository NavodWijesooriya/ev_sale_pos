import type { Page } from "@playwright/test"
import { test, expect, loadFixtures, loginAndSave, pageAs } from "../fixtures"
import { db } from "../db"
import { callServerAction } from "../helpers"

const fx = loadFixtures()

/** Open a sidebar group (when it is not open already) and return the sidebar. */
async function openGroup(page: Page, group: string) {
  const nav = page.getByRole("navigation")
  await expect(nav.getByText(group, { exact: true }).first()).toBeVisible({ timeout: 60_000 })
  const button = nav.getByRole("button", { name: group })
  if ((await button.getAttribute("aria-expanded")) !== "true") await button.click()
  return nav
}

async function cashierUser() {
  return db.user.findUniqueOrThrow({ where: { email: fx.users.cashier.email } })
}

test.describe.serial("bank deposits: permission, menu placement and recorded-by", () => {
  test("Bank Deposits sits under Sales Management for the owner, not under Finance Management", async ({ browser }) => {
    const { page, close } = await pageAs(browser, "owner")
    await page.goto("/dashboard")
    const nav = await openGroup(page, "Sales Management")
    await expect(nav.getByRole("link", { name: "Bank Deposits" })).toBeVisible()
    await expect(nav.getByRole("link", { name: "Sales History" })).toBeVisible()
    await openGroup(page, "Finance Management")
    await expect(nav.getByRole("link", { name: "Finance Receivables" })).toBeVisible()
    // Exactly one Bank Deposits entry in the whole menu.
    await expect(nav.getByRole("link", { name: "Bank Deposits" })).toHaveCount(1)
    // It opens from the Sales Management entry.
    await nav.getByRole("link", { name: "Bank Deposits" }).click()
    await expect(page.getByRole("heading", { name: /bank deposit/i }).first()).toBeVisible({ timeout: 60_000 })
    await close()
  })

  test("staff with only the bank deposit permission see Sales Management with just Bank Deposits", async ({ browser }) => {
    const { page, close } = await pageAs(browser, "depositStaffA")
    await page.goto("/dashboard")
    const nav = await openGroup(page, "Sales Management")
    await expect(nav.getByRole("link", { name: "Bank Deposits" })).toBeVisible()
    await expect(nav.getByRole("link", { name: "New Sale (POS)" })).toHaveCount(0)
    await expect(nav.getByRole("link", { name: "Sales History" })).toHaveCount(0)
    await expect(nav.getByText("Finance Management", { exact: true })).toHaveCount(0)
    await close()
  })

  test("staff without the permission have no menu item, no page and no server access", async ({ browser }) => {
    const { page, close } = await pageAs(browser, "cashier")
    await page.goto("/dashboard")
    const nav = await openGroup(page, "Sales Management")
    await expect(nav.getByRole("link", { name: "New Sale (POS)" })).toBeVisible()
    await expect(nav.getByRole("link", { name: "Bank Deposits" })).toHaveCount(0)

    await page.goto("/dashboard/finance/bank-deposits")
    await expect.poll(() => new URL(page.url()).pathname, { timeout: 30_000 }).not.toBe("/dashboard/finance/bank-deposits")

    // A hand-made request is refused by the server too. (The action is found on the deposit page of an allowed user.)
    await page.goto("/dashboard/sales/advances")
    const bank =
      (await db.bankAccount.findFirst({ where: { organizationId: fx.orgId, accountNumber: "ACC-26" } })) ??
      (await db.bankAccount.create({ data: { organizationId: fx.orgId, bankName: "E2E Bank 26", accountNumber: "ACC-26" } }))
    const today = new Date().toISOString().slice(0, 10)
    const allowed = await pageAs(browser, "depositStaffA")
    await allowed.page.goto("/dashboard/finance/bank-deposits")
    await expect(allowed.page.getByLabel("Bank account")).toBeVisible({ timeout: 60_000 })
    const refused = await callServerAction(
      page,
      "recordBankDeposit",
      [{ date: today, branchId: fx.branchA.id, bankAccountId: bank.id, amount: 1000, slipNumber: "SLIP-26-DENIED" }],
      allowed.page,
    )
    await allowed.close()
    expect(refused).toContain('"success":false')
    expect(await db.bankDeposit.count({ where: { organizationId: fx.orgId, slipNumber: "SLIP-26-DENIED" } })).toBe(0)
    await close()
  })

  test("the owner grants the permission; the staff member then records a deposit and is saved as the depositor", async ({ browser }) => {
    const ownerSession = await pageAs(browser, "owner")
    await ownerSession.page.goto("/dashboard/settings/permissions")
    await ownerSession.page.getByLabel("Daily bank deposits for E2E Cashier").check()
    await ownerSession.page.getByRole("button", { name: "Save changes" }).click()
    await expect
      .poll(async () => (await cashierUser()).permissions.includes("MANAGE_BANK_DEPOSITS"), { timeout: 90_000 })
      .toBe(true)
    await ownerSession.close()

    await loginAndSave(browser, "cashier")
    const { page, close } = await pageAs(browser, "cashier")
    await page.goto("/dashboard")
    const nav = await openGroup(page, "Sales Management")
    await nav.getByRole("link", { name: "Bank Deposits" }).click()
    await expect(page.getByLabel("Bank account")).toBeVisible({ timeout: 60_000 })

    // The depositor is filled in by the system and cannot be edited.
    const recordedBy = page.getByLabel("Recorded by")
    await expect(recordedBy).toHaveValue("E2E Cashier")
    await expect(recordedBy).toHaveAttribute("readonly", "")

    await page.getByLabel("Bank account").selectOption({ label: "E2E Bank 26 · ACC-26" })
    await page.getByLabel("Deposit amount (Rs.)").fill("1500")
    await page.getByLabel("Slip / reference number").fill("SLIP-26-1")
    await page.getByRole("button", { name: "Record deposit" }).click()
    await expect
      .poll(() => db.bankDeposit.count({ where: { organizationId: fx.orgId, slipNumber: "SLIP-26-1" } }), { timeout: 90_000 })
      .toBe(1)

    const cashier = await cashierUser()
    const deposit = await db.bankDeposit.findFirstOrThrow({ where: { organizationId: fx.orgId, slipNumber: "SLIP-26-1" } })
    expect(deposit.createdById).toBe(cashier.id)
    expect(deposit.createdByName).toBe("E2E Cashier")
    expect(deposit.branchId).toBe(fx.branchA.id)

    // The report names the staff member too.
    await page.goto("/dashboard/finance/bank-deposits")
    await expect(page.getByRole("row").filter({ hasText: "SLIP-26-1" })).toContainText("E2E Cashier", { timeout: 60_000 })
    await close()

    // Take the permission away again; the menu item goes with it.
    await db.user.update({
      where: { id: cashier.id },
      data: { permissions: cashier.permissions.filter((p) => p !== "MANAGE_BANK_DEPOSITS") },
    })
    await loginAndSave(browser, "cashier")
    const after = await pageAs(browser, "cashier")
    await after.page.goto("/dashboard")
    const afterNav = await openGroup(after.page, "Sales Management")
    await expect(afterNav.getByRole("link", { name: "Bank Deposits" })).toHaveCount(0)
    await after.close()
  })
})
