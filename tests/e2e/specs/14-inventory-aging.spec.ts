import { test, expect, loadFixtures, pageAs } from "../fixtures"

const fx = loadFixtures()
const LABEL = { fresh: "Fresh", aging: "Aging", warning: "Warning", critical: "Critical" } as const

test.describe("inventory", () => {
  test("aging buckets place bikes by the GRN received date", async ({ browser }) => {
    const { page, close } = await pageAs(browser, "owner")
    await page.goto("/dashboard/reports")
    await expect(page.getByText("Dead Stock & EV Bike Inventory Aging Analysis")).toBeVisible({ timeout: 60_000 })

    for (const bike of fx.agingBikes) {
      const row = page.getByRole("row").filter({ hasText: bike.chassisNumber })
      await expect(row).toContainText(`${bike.days} Days (${LABEL[bike.tier]})`)
    }

    // Summary cards: exactly one bike in each of the three older buckets (the seed has one of each).
    const text = await page.locator("main").innerText()
    expect(text).toMatch(/CRITICAL \(>90D\)\s+1 units/)
    expect(text).toMatch(/WARNING \(60-90D\)\s+1 units/)
    expect(text).toMatch(/AGING \(30-60D\)\s+1 units/)

    // Each filter shows only its own bike among the aged ones.
    const filters: Array<[RegExp, string, string[]]> = [
      [/>90d Critical/, "E2E-AGE-120", ["E2E-AGE-075", "E2E-AGE-045", "E2E-AGE-010"]],
      [/60-90d Warning/, "E2E-AGE-075", ["E2E-AGE-120", "E2E-AGE-045", "E2E-AGE-010"]],
      [/30-60d Aging/, "E2E-AGE-045", ["E2E-AGE-120", "E2E-AGE-075", "E2E-AGE-010"]],
      [/<30d Fresh/, "E2E-AGE-010", ["E2E-AGE-120", "E2E-AGE-075", "E2E-AGE-045"]],
    ]
    for (const [tab, shown, hidden] of filters) {
      await page.getByRole("tab", { name: tab }).or(page.getByRole("button", { name: tab })).first().click()
      await expect(page.getByRole("row").filter({ hasText: shown })).toBeVisible()
      for (const chassis of hidden) await expect(page.getByRole("row").filter({ hasText: chassis })).toHaveCount(0)
    }
    await close()
  })

  test("a branch manager's aging report only covers their own branch", async ({ browser }) => {
    const { page, close } = await pageAs(browser, "branchManager")
    await page.goto("/dashboard/reports")
    await expect(page.getByText("Dead Stock & EV Bike Inventory Aging Analysis")).toBeVisible({ timeout: 60_000 })
    // Branch B's bike is never listed for a Branch A user.
    await expect(page.getByText("E2E-STOCK-B-01")).toHaveCount(0)
    await expect(page.getByRole("row").filter({ hasText: "E2E-AGE-120" })).toContainText(fx.branchA.name)
    await close()
  })

  test("a branch manager can open every report tab", async ({ browser }) => {
    const { page, close } = await pageAs(browser, "branchManager")
    await page.goto("/dashboard/reports")
    await expect(page.getByRole("heading", { name: "Reports & Analytics" })).toBeVisible({ timeout: 60_000 })
    for (const tab of [/^Overview/, /^Daily.Monthly Sales/, /^Commissions/, /^Advances/, /^Service & Parts/, /^GRN Stock/]) {
      await page.getByRole("tab", { name: tab }).click()
      // No crash page, and the tab shows content.
      await expect(page.getByText("This page couldn’t load")).toHaveCount(0)
      await expect(page.getByRole("tabpanel").first()).toBeVisible()
    }
    await close()
  })
})
