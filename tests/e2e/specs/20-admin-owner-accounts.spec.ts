import type { Browser, Page, Request } from "@playwright/test"
import { test, expect, loadFixtures, pageAs } from "../fixtures"
import { db } from "../db"
import { authUserByEmail, isBanned } from "../supabase"

const fx = loadFixtures()
const OTHER = fx.otherOrg!.name
const LAB = fx.labOrg!.name
const otherOwner = fx.users.otherOwner
const labA = fx.users.labOwnerA
const labB = fx.users.labOwnerB

async function openOwners(page: Page, dealership: string) {
  await page.goto("/admin-portal")
  await page.getByRole("button", { name: `Show owners of ${dealership}` }).click()
  return page.getByLabel(`Owners of ${dealership}`)
}

/** A real sign-in attempt through the login page in a clean browser. */
async function tryLogin(browser: Browser, email: string, password: string) {
  const context = await browser.newContext({ baseURL: "http://localhost:3001" })
  const page = await context.newPage()
  await page.goto("/login")
  await page.getByLabel("Work email").fill(email)
  await page.getByRole("textbox", { name: "Password" }).fill(password)
  await page.getByRole("button", { name: /sign in/i }).click()
  return { page, context }
}

const user = (email: string) => db.user.findUnique({ where: { email } })
const audits = (action: string) => db.auditLog.count({ where: { action, userName: { contains: "Platform Admin" } } })

test.describe.serial("platform admin manages dealership owners", () => {
  let disableRequest: { url: string; headers: Record<string, string>; body: string } | null = null

  test("the dealership list shows each dealership's owners", async ({ browser }) => {
    const { page, close } = await pageAs(browser, "platformAdmin")
    const owners = await openOwners(page, OTHER)
    const row = owners.getByRole("row").filter({ hasText: otherOwner.email })
    await expect(row).toBeVisible({ timeout: 60_000 })
    await expect(row).toContainText(otherOwner.name)
    await expect(row).toContainText("Active")
    await expect(row).toContainText(/\d{4}/) // created date
    // The lab dealership has two owners.
    const lab = await openOwners(page, LAB)
    await expect(lab.getByRole("row").filter({ hasText: labA.email })).toBeVisible({ timeout: 60_000 })
    await expect(lab.getByRole("row").filter({ hasText: labB.email })).toBeVisible()
    await close()
  })

  test("disable blocks sign-in and kicks out the open session; enable restores it", async ({ browser }) => {
    // The owner is signed in (saved session) before being disabled.
    const owner = await pageAs(browser, "otherOwner")
    await owner.page.goto("/dashboard")
    await expect(owner.page).toHaveURL(/\/dashboard/)

    const admin = await pageAs(browser, "platformAdmin")
    admin.page.on("request", (request: Request) => {
      const headers = request.headers()
      if (request.method() === "POST" && headers["next-action"] && /"active":false/.test(request.postData() ?? "")) {
        disableRequest = { url: request.url(), headers, body: request.postData() ?? "" }
      }
    })
    const owners = await openOwners(admin.page, OTHER)
    const row = owners.getByRole("row").filter({ hasText: otherOwner.email })
    await row.getByRole("button", { name: "Disable" }).click()
    // This is the only owner of an active dealership: the dialog warns, and the button says so.
    const dialog = admin.page.getByRole("dialog")
    await expect(dialog.getByRole("alert")).toContainText("last active owner")
    await dialog.getByRole("button", { name: "Disable anyway" }).click()

    await expect.poll(async () => (await user(otherOwner.email))?.isActive, { timeout: 90_000 }).toBe(false)
    expect(isBanned(await authUserByEmail(otherOwner.email))).toBe(true)
    await expect(row).toContainText("Disabled", { timeout: 60_000 })
    expect(await audits("OWNER_ACCOUNT_DISABLED")).toBe(1)

    // Their open session stops working at once...
    await owner.page.goto("/dashboard")
    await expect.poll(() => new URL(owner.page.url()).pathname, { timeout: 30_000 }).toBe("/login")
    await owner.close()
    // ...and a fresh sign-in is refused.
    const attempt = await tryLogin(browser, otherOwner.email, otherOwner.password)
    await expect(attempt.page.getByRole("alert").first()).toBeVisible({ timeout: 60_000 })
    expect(new URL(attempt.page.url()).pathname).toBe("/login")
    await attempt.context.close()

    // Enable: the account works again.
    await row.getByRole("button", { name: "Enable" }).click()
    await expect.poll(async () => (await user(otherOwner.email))?.isActive, { timeout: 90_000 }).toBe(true)
    expect(isBanned(await authUserByEmail(otherOwner.email))).toBe(false)
    expect(await audits("OWNER_ACCOUNT_ENABLED")).toBe(1)
    const again = await tryLogin(browser, otherOwner.email, otherOwner.password)
    await again.page.waitForURL(/\/dashboard/, { timeout: 90_000 })
    await again.context.close()
    await admin.close()
    expect(disableRequest).not.toBeNull()
  })

  test("delete with no history removes the owner and the login", async ({ browser }) => {
    expect(await user(labB.email)).not.toBeNull()
    expect(await authUserByEmail(labB.email)).not.toBeNull()
    const { page, close } = await pageAs(browser, "platformAdmin")
    const owners = await openOwners(page, LAB)
    const row = owners.getByRole("row").filter({ hasText: labB.email })
    await row.getByRole("button", { name: "Delete" }).click()
    const dialog = page.getByRole("dialog")
    // Deleting needs the email typed exactly.
    const confirm = dialog.getByRole("button", { name: "Delete owner" })
    await expect(confirm).toBeDisabled()
    await dialog.getByLabel(/Type the owner/).fill("someone.else@example.com")
    await expect(confirm).toBeDisabled()
    await dialog.getByLabel(/Type the owner/).fill(labB.email)
    await expect(confirm).toBeEnabled()
    await confirm.click()

    await expect.poll(() => user(labB.email), { timeout: 90_000 }).toBeNull()
    // The action removes the database row first and the Supabase login after it, so wait for the login too.
    await expect.poll(() => authUserByEmail(labB.email), { timeout: 60_000 }).toBeNull()
    expect(await audits("OWNER_ACCOUNT_DELETED")).toBe(1)
    await expect(owners.getByRole("row").filter({ hasText: labB.email })).toHaveCount(0, { timeout: 60_000 })
    await close()
  })

  test("delete with history disables the owner instead and keeps every record", async ({ browser }) => {
    const salesBefore = await db.sale.count({ where: { organizationId: fx.labOrg!.id } })
    expect(salesBefore).toBe(1)
    const { page, close } = await pageAs(browser, "platformAdmin")
    const owners = await openOwners(page, LAB)
    const row = owners.getByRole("row").filter({ hasText: labA.email })
    await row.getByRole("button", { name: "Delete" }).click()
    const dialog = page.getByRole("dialog")
    // Owner B is gone, so A is now the last active owner: the dialog says so.
    await expect(dialog.getByRole("alert")).toContainText("last active owner")
    await dialog.getByLabel(/Type the owner/).fill(labA.email)
    await dialog.getByRole("button", { name: "Delete owner" }).click()

    await expect(page.getByText(/disabled instead of deleted to keep those records/i).first()).toBeVisible({ timeout: 90_000 })
    const kept = await user(labA.email)
    expect(kept).not.toBeNull()
    expect(kept!.isActive).toBe(false)
    expect(isBanned(await authUserByEmail(labA.email))).toBe(true)
    expect(await db.sale.count({ where: { organizationId: fx.labOrg!.id, userId: kept!.id } })).toBe(salesBefore)
    await expect(owners.getByRole("row").filter({ hasText: labA.email })).toContainText("Disabled", { timeout: 60_000 })
    await close()
  })

  test("callers who are not platform admins are rejected", async ({ browser }) => {
    // A dealership owner cannot even open the platform portal.
    const tenant = await pageAs(browser, "owner")
    await tenant.page.goto("/admin-portal")
    await expect.poll(() => new URL(tenant.page.url()).pathname, { timeout: 30_000 }).toMatch(/\/admin-portal\/login|\/login/)

    // Replaying the real "disable owner" server action with the dealership owner's session is refused,
    // and so is replaying it with no session at all. The target owner stays active.
    expect(disableRequest).not.toBeNull()
    expect((await user(otherOwner.email))?.isActive).toBe(true)
    const response = await tenant.page.context().request.post(disableRequest!.url, {
      headers: {
        "next-action": disableRequest!.headers["next-action"],
        "content-type": disableRequest!.headers["content-type"] ?? "text/plain;charset=UTF-8",
        accept: "text/x-component",
      },
      data: disableRequest!.body,
    })
    expect(await response.text()).toMatch(/Unauthorized/)
    expect((await user(otherOwner.email))?.isActive).toBe(true)
    await tenant.close()

    const anonymous = await browser.newContext({ baseURL: "http://localhost:3001" })
    const response2 = await anonymous.request.post(disableRequest!.url, {
      headers: {
        "next-action": disableRequest!.headers["next-action"],
        "content-type": disableRequest!.headers["content-type"] ?? "text/plain;charset=UTF-8",
        accept: "text/x-component",
      },
      data: disableRequest!.body,
    })
    expect(await response2.text()).toMatch(/Unauthorized/)
    expect((await user(otherOwner.email))?.isActive).toBe(true)
    await anonymous.close()
  })
})
