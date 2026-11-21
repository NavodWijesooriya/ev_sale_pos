import { randomBytes } from "node:crypto"
import type { Browser, Page } from "@playwright/test"
import { test, expect, loadFixtures, pageAs } from "../fixtures"
import { db } from "../db"

const fx = loadFixtures()
const domain = fx.users.owner.email.split("@")[1]
const STAFF = {
  name: `E2E New Staff ${randomBytes(2).toString("hex")}`,
  // Unique per run so the spec can be repeated without reseeding (the seed removes every user on the e2e domain).
  email: `newstaff-${randomBytes(3).toString("hex")}@${domain}`,
  password: `E2e-New-${randomBytes(6).toString("hex")}!`,
}

/** Sign in through the real login page in a fresh browser context. */
async function login(browser: Browser, email: string, password: string) {
  const context = await browser.newContext({ baseURL: "http://localhost:3001" })
  const page = await context.newPage()
  await page.goto("/login")
  await page.getByLabel("Work email").fill(email)
  await page.getByRole("textbox", { name: "Password" }).fill(password)
  await page.getByRole("button", { name: /sign in/i }).click()
  return { page, context }
}

async function sidebarHas(page: Page, name: string | RegExp) {
  return (await page.getByRole("navigation").getByText(name).count()) > 0
}

async function staffRow() {
  return db.user.findUniqueOrThrow({ where: { email: STAFF.email } })
}

test.describe.serial("settings and permissions", () => {
  test("the owner creates a staff user; they log in with the default sales permissions", async ({ browser }) => {
    const { page, close } = await pageAs(browser, "owner")
    await page.goto("/dashboard/settings/users")
    await page.getByRole("button", { name: "Add Staff" }).click()
    const dialog = page.getByRole("dialog", { name: "Add New Staff Member" })
    await dialog.getByLabel("Full Name *").fill(STAFF.name)
    await dialog.getByLabel("Email Address *").fill(STAFF.email)
    await dialog.getByLabel("Password *").fill(STAFF.password)
    await dialog.getByRole("button", { name: "Create Staff Account" }).click()
    await expect
      .poll(() => db.user.count({ where: { email: STAFF.email } }), { timeout: 90_000 })
      .toBe(1)
    const created = await staffRow()
    expect(created.organizationId).toBe(fx.orgId)
    expect(created.isActive).toBe(true)
    expect([...created.permissions].sort()).toEqual(["CREATE_SALE", "MANAGE_CUSTOMERS"])
    expect(await db.auditLog.count({ where: { organizationId: fx.orgId, action: "STAFF_CREATED" } })).toBeGreaterThanOrEqual(1)
    await close()

    const staff = await login(browser, STAFF.email, STAFF.password)
    await staff.page.waitForURL(/\/dashboard/, { timeout: 60_000 })
    expect(await sidebarHas(staff.page, "Sales Management")).toBe(true)
    expect(await sidebarHas(staff.page, "Finance Management")).toBe(false)
    await staff.page.goto("/dashboard/finance/receivables")
    await expect.poll(() => new URL(staff.page.url()).pathname, { timeout: 30_000 }).not.toBe("/dashboard/finance/receivables")
    await staff.context.close()
  })

  test("granting a permission in the matrix changes the sidebar and server access after re-login", async ({ browser }) => {
    const { page, close } = await pageAs(browser, "owner")
    await page.goto("/dashboard/settings/permissions")
    await page.getByLabel(`Finance receivables for ${STAFF.name}`).check()
    await page.getByRole("button", { name: "Save changes" }).click()
    await expect
      .poll(async () => (await staffRow()).permissions.includes("MANAGE_FINANCE_RECEIVABLES"), { timeout: 90_000 })
      .toBe(true)
    await close()

    const staff = await login(browser, STAFF.email, STAFF.password)
    await staff.page.waitForURL(/\/dashboard/, { timeout: 60_000 })
    expect(await sidebarHas(staff.page, "Finance Management")).toBe(true)
    await staff.page.goto("/dashboard/finance/receivables")
    await expect(staff.page.getByRole("heading", { name: "Finance Receivables" })).toBeVisible({ timeout: 60_000 })
    await staff.context.close()
  })

  test("revoking the permission removes the access again", async ({ browser }) => {
    const { page, close } = await pageAs(browser, "owner")
    await page.goto("/dashboard/settings/permissions")
    await page.getByLabel(`Finance receivables for ${STAFF.name}`).uncheck()
    await page.getByRole("button", { name: "Save changes" }).click()
    await expect
      .poll(async () => (await staffRow()).permissions.includes("MANAGE_FINANCE_RECEIVABLES"), { timeout: 90_000 })
      .toBe(false)
    await close()

    const staff = await login(browser, STAFF.email, STAFF.password)
    await staff.page.waitForURL(/\/dashboard/, { timeout: 60_000 })
    expect(await sidebarHas(staff.page, "Finance Management")).toBe(false)
    await staff.page.goto("/dashboard/finance/receivables")
    await expect.poll(() => new URL(staff.page.url()).pathname, { timeout: 30_000 }).not.toBe("/dashboard/finance/receivables")
    await staff.context.close()
  })

  test("permission changes appear in the audit log", async ({ browser }) => {
    // Granted once and revoked once for this staff member.
    const entries = await db.auditLog.findMany({
      where: { organizationId: fx.orgId, action: "STAFF_PERMISSIONS_CHANGED" },
      orderBy: { createdAt: "asc" },
    })
    expect(entries.length).toBeGreaterThanOrEqual(2)
    expect(entries.some((e) => /Finance receivables/i.test(e.description) && /grant|\+|added/i.test(e.description))).toBe(true)

    const { page, close } = await pageAs(browser, "owner")
    await page.goto("/dashboard/settings/audit-logs?action=STAFF_PERMISSIONS_CHANGED")
    await expect(page.getByRole("cell", { name: "Staff permissions changed" }).first()).toBeVisible({ timeout: 60_000 })
    await expect(page.getByText(/Finance receivables/i).first()).toBeVisible()
    await close()
  })

  test("deactivating a user stops them logging in", async ({ browser }) => {
    const { page, close } = await pageAs(browser, "owner")
    await page.goto("/dashboard/settings/users")
    await page.getByRole("switch", { name: `Toggle access for ${STAFF.name}` }).click()
    await expect.poll(async () => (await staffRow()).isActive, { timeout: 90_000 }).toBe(false)
    expect(await db.auditLog.count({ where: { organizationId: fx.orgId, action: "STAFF_STATUS_CHANGED" } })).toBeGreaterThanOrEqual(1)
    await close()

    const staff = await login(browser, STAFF.email, STAFF.password)
    // The login is refused: the user is not taken to the dashboard.
    await expect(staff.page.getByRole("alert").or(staff.page.getByText(/blocked|deactivated|not active|disabled|no longer/i)).first()).toBeVisible({
      timeout: 60_000,
    })
    expect(new URL(staff.page.url()).pathname).toBe("/login")
    await staff.context.close()
  })

  test("staff cannot open Settings → Permissions, Commissions or Audit Logs", async ({ browser }) => {
    for (const role of ["branchManager", "cashier", "receivablesStaff"] as const) {
      const { page, close } = await pageAs(browser, role)
      for (const url of ["/dashboard/settings/permissions", "/dashboard/settings/commissions", "/dashboard/settings/audit-logs"]) {
        await page.goto(url)
        await expect
          .poll(() => new URL(page.url()).pathname, { message: `${role} must not stay on ${url}`, timeout: 30_000 })
          .not.toBe(url)
      }
      await close()
    }
  })
})
