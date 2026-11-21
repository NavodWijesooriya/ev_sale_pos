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

  // KNOWN APP BUG (app/actions/reports.ts:1523): getServiceAndPartsReportData adds branchFilter(user) to the
  // SparePart query, but SparePart has no branchId column. Prisma throws "Unknown argument `branchId`", so the
  // whole Reports page ("This page couldn't load") fails for every branch-restricted user, e.g. a Branch Manager.
  // test.fail() keeps the suite green while the bug exists and turns red once it is fixed.
  test.fail("a branch manager's aging report only covers their own branch", async ({ browser }) => {
    const { page, close } = await pageAs(browser, "branchManager")
    await page.goto("/dashboard/reports")
    await expect(page.getByText("Dead Stock & EV Bike Inventory Aging Analysis")).toBeVisible({ timeout: 60_000 })
    // Branch B's bike is never listed for a Branch A user.
    await expect(page.getByText("E2E-STOCK-B-01")).toHaveCount(0)
    await expect(page.getByRole("row").filter({ hasText: "E2E-AGE-120" })).toContainText(fx.branchA.name)
    await close()
  })

  // The permission "Transfer stock" exists, but the app has no screen or action that moves a bike between
  // branches (nothing updates Vehicle.branchId), so there is nothing to test yet.
  test.fixme("an inter-branch stock transfer moves the bike and updates both branches' stock counts", async () => {})
})
