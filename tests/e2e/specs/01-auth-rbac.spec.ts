import type { Page } from "@playwright/test"
import { test, expect, loadFixtures, pageAs } from "../fixtures"
import type { RoleKey } from "../seed"

const fx = loadFixtures()

/** Names of the top-level sidebar entries (links and group buttons), in order. */
async function sidebarEntries(page: Page): Promise<string[]> {
  await page.goto("/dashboard")
  const nav = page.getByRole("navigation").filter({ has: page.getByRole("link", { name: "Dashboard" }) }).first()
  await expect(nav.getByRole("link", { name: "Dashboard" })).toBeVisible()
  const items = await nav.locator(":scope > div > a, :scope > div > button").allInnerTexts()
  return items.map((t) => t.trim()).filter(Boolean)
}

async function financeChildren(page: Page): Promise<string[]> {
  const nav = page.getByRole("navigation").filter({ has: page.getByRole("link", { name: "Dashboard" }) }).first()
  const group = nav.getByRole("button", { name: "Finance Management" })
  if ((await group.getAttribute("aria-expanded")) !== "true") await group.click()
  // The children are the links under the group, up to the next top-level button.
  const links = await nav.locator('a[href^="/dashboard/finance/"]').allInnerTexts()
  return links.map((t) => t.trim())
}

const EXPECTED: Partial<Record<RoleKey, { entries: string[]; finance: string[] | null }>> = {
  owner: {
    entries: [
      "Dashboard", "Sales Management", "Finance Management", "Customers", "GRN Management", "Supplier Management",
      "Service Management", "Reports", "Vehicle Models", "Settings", "Storefront Branding", "Help Center",
    ],
    finance: ["Finance Receivables", "Bank Deposits", "Commission Reports", "Finance Companies", "Insurance Companies"],
  },
  branchManager: {
    entries: ["Dashboard", "Sales Management", "Finance Management", "Customers", "GRN Management", "Supplier Management", "Reports", "Vehicle Models", "Help Center"],
    finance: ["Finance Receivables", "Bank Deposits"],
  },
  cashier: { entries: ["Dashboard", "Sales Management", "Customers", "Help Center"], finance: null },
  receivablesStaff: { entries: ["Dashboard", "Finance Management", "Help Center"], finance: ["Finance Receivables"] },
  noAccessStaff: { entries: ["Dashboard", "Customers", "Help Center"], finance: null },
}

test.describe("sidebar per role (including the Finance Management grouping)", () => {
  for (const role of Object.keys(EXPECTED) as RoleKey[]) {
    test(`${role} sees only its allowed entries`, async ({ browser }) => {
      const { page, close } = await pageAs(browser, role)
      expect(await sidebarEntries(page)).toEqual(EXPECTED[role]!.entries)
      const expectedFinance = EXPECTED[role]!.finance
      if (expectedFinance) {
        expect(await financeChildren(page)).toEqual(expectedFinance)
      } else {
        await expect(page.getByRole("button", { name: "Finance Management" })).toHaveCount(0)
      }
      await close()
    })
  }
})

const FORBIDDEN: Array<[RoleKey, string[]]> = [
  [
    "cashier",
    [
      "/dashboard/finance/receivables", "/dashboard/finance/bank-deposits", "/dashboard/finance/companies",
      "/dashboard/finance/commissions", "/dashboard/finance/insurance", "/dashboard/reports",
      "/dashboard/grn/create", "/dashboard/suppliers/list", "/dashboard/settings/users", "/dashboard/settings/audit-logs",
    ],
  ],
  ["noAccessStaff", ["/dashboard/finance/receivables", "/dashboard/finance/bank-deposits", "/dashboard/sales/new", "/dashboard/reports"]],
  ["receivablesStaff", ["/dashboard/finance/bank-deposits", "/dashboard/finance/commissions", "/dashboard/finance/companies", "/dashboard/sales/new"]],
  ["branchManager", ["/dashboard/finance/companies", "/dashboard/finance/commissions", "/dashboard/finance/insurance", "/dashboard/settings/permissions", "/dashboard/settings/audit-logs"]],
]

test.describe("direct URL access to forbidden pages is blocked", () => {
  for (const [role, urls] of FORBIDDEN) {
    test(`${role} is redirected away from ${urls.length} forbidden pages`, async ({ browser }) => {
      const { page, close } = await pageAs(browser, role)
      for (const url of urls) {
        await page.goto(url)
        // Streamed pages redirect on the client after the first paint, so wait for the URL to change.
        await expect
          .poll(() => new URL(page.url()).pathname, { message: `${role} must not stay on ${url}`, timeout: 20_000 })
          .not.toBe(url)
      }
      await close()
    })
  }

  test("allowed pages still open", async ({ browser }) => {
    const r = await pageAs(browser, "receivablesStaff")
    await r.page.goto("/dashboard/finance/receivables")
    await expect(r.page.getByRole("heading", { name: "Finance Receivables" })).toBeVisible()
    await r.close()
    const c = await pageAs(browser, "cashier")
    await c.page.goto("/dashboard/sales/new")
    await expect(c.page).toHaveURL(/sales\/new/)
    await c.close()
  })

  test("a signed-out visitor is sent to the login page", async ({ browser }) => {
    const context = await browser.newContext({ baseURL: "http://localhost:3001" })
    const page = await context.newPage()
    await page.goto("/dashboard/finance/receivables")
    await expect(page).toHaveURL(/\/login/)
    await context.close()
  })
})

test.describe("branch and tenant isolation", () => {
  test("a Branch A manager sees Branch A stock but not Branch B stock; the owner sees both", async ({ browser }) => {
    const a = await pageAs(browser, "branchManager")
    await a.page.goto("/dashboard/grn/stock")
    await expect(a.page.getByText("E2E-STOCK-CASH-01").first()).toBeVisible()
    await expect(a.page.getByText("E2E-STOCK-B-01")).toHaveCount(0)
    await a.close()

    const o = await pageAs(browser, "owner")
    await o.page.goto("/dashboard/grn/stock")
    await expect(o.page.getByText("E2E-STOCK-B-01").first()).toBeVisible()
    await expect(o.page.getByText("E2E-STOCK-CASH-01").first()).toBeVisible()
    await o.close()
  })

  test("a Branch A cashier cannot find Branch B stock in the POS vehicle search", async ({ browser }) => {
    const { page, close } = await pageAs(browser, "cashier")
    await page.goto("/dashboard/sales/new")
    const vehicle = page.getByRole("combobox", { name: "Available vehicle" })
    await vehicle.click()
    await vehicle.fill("E2E-STOCK-B-01")
    await expect(page.getByRole("option", { name: /E2E-STOCK-B-01/ })).toHaveCount(0)
    await vehicle.fill("E2E-STOCK-CASH-01")
    await expect(page.getByRole("option", { name: /E2E-STOCK-CASH-01/ }).first()).toBeVisible()
    await close()
  })

  test("E2E Motors users cannot see another dealership's data (tenant isolation)", async ({ browser }) => {
    test.skip(!fx.otherOrg?.chassisNumber, "No other dealership with vehicles exists to probe")
    const { chassisNumber, modelName, name } = fx.otherOrg!
    const { db } = await import("../db")
    const other = await db.vehicle.findFirstOrThrow({ where: { chassisNumber: chassisNumber! }, select: { id: true } })
    const { page, close } = await pageAs(browser, "owner")

    await page.goto("/dashboard/grn/stock")
    await expect(page.getByText("E2E-STOCK-CASH-01").first()).toBeVisible()
    await expect(page.getByText(chassisNumber!)).toHaveCount(0)

    await page.goto("/dashboard")
    await expect(page.getByText(name)).toHaveCount(0)

    // Opening the other dealership's bike by id must not show it.
    const response = await page.goto(`/dashboard/bikes/${other.id}`)
    const body = await page.locator("body").innerText()
    expect(body, "other tenant's chassis number must not be shown").not.toContain(chassisNumber!)
    expect(response?.status() === 404 || /not found|could not|no access|dashboard/i.test(body + page.url()) || !body.includes(modelName!)).toBeTruthy()

    // And not through the POS vehicle search either.
    await page.goto("/dashboard/sales/new")
    const vehicle = page.getByRole("combobox", { name: "Available vehicle" })
    await vehicle.click()
    await vehicle.fill(chassisNumber!)
    await expect(page.getByRole("option", { name: new RegExp(chassisNumber!) })).toHaveCount(0)
    await close()
  })
})
