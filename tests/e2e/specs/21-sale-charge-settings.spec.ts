import { test, expect, loadFixtures, pageAs } from "../fixtures"
import { db } from "../db"

const fx = loadFixtures()

async function settingsRow() {
  return db.commissionSettings.findUnique({ where: { organizationId: fx.orgId } })
}

test.describe.serial("owner sale charge settings", () => {
  test("the defaults are RMV 14,300 (Finance), 10,300 (Cash) and third-party insurance 1,200", async ({ browser }) => {
    const row = await settingsRow()
    // No row yet means the defaults apply.
    expect(row?.rmvChargeFinance ?? 14_300).toBe(14_300)
    expect(row?.rmvChargeCash ?? 10_300).toBe(10_300)
    expect(row?.thirdPartyInsuranceAmount ?? 1_200).toBe(1_200)

    const { page, close } = await pageAs(browser, "owner")
    await page.goto("/dashboard/settings/sale-charges")
    await expect(page.getByRole("heading", { name: "Sale Charges" })).toBeVisible({ timeout: 60_000 })
    await expect(page.getByLabel(/RMV charge: Finance sales/)).toHaveValue("14300")
    await expect(page.getByLabel(/RMV charge: Cash sales/)).toHaveValue("10300")
    await expect(page.getByLabel(/Third-party insurance amount/)).toHaveValue("1200")
    await close()
  })

  test("the owner saves new amounts; they are stored and audited", async ({ browser }) => {
    const before = await db.auditLog.count({ where: { organizationId: fx.orgId, action: "SALE_CHARGE_SETTINGS_CHANGED" } })
    const { page, close } = await pageAs(browser, "owner")
    await page.goto("/dashboard/settings/sale-charges")
    await page.getByLabel(/RMV charge: Finance sales/).fill("15000")
    await page.getByLabel(/RMV charge: Cash sales/).fill("11000")
    await page.getByLabel(/Third-party insurance amount/).fill("1500")
    await page.getByRole("button", { name: "Save sale charges" }).click()
    await expect.poll(async () => (await settingsRow())?.rmvChargeFinance, { timeout: 60_000 }).toBe(15_000)
    const row = await settingsRow()
    expect(row?.rmvChargeCash).toBe(11_000)
    expect(row?.thirdPartyInsuranceAmount).toBe(1_500)
    const audits = await db.auditLog.findMany({
      where: { organizationId: fx.orgId, action: "SALE_CHARGE_SETTINGS_CHANGED" },
      orderBy: { createdAt: "desc" },
    })
    expect(audits.length).toBe(before + 1)
    expect(audits[0].description).toContain("14300 -> 15000")
    expect(audits[0].userName).toBe("E2E Owner")
    await close()
  })

  test("a negative amount is rejected and nothing changes", async ({ browser }) => {
    const { page, close } = await pageAs(browser, "owner")
    await page.goto("/dashboard/settings/sale-charges")
    await page.getByLabel(/Third-party insurance amount/).fill("-5")
    await page.getByRole("button", { name: "Save sale charges" }).click()
    // HTML validation keeps the form from submitting, so the stored value stays as saved.
    await page.waitForTimeout(1_000)
    expect((await settingsRow())?.thirdPartyInsuranceAmount).toBe(1_500)
    await close()
  })

  test("staff cannot open the settings page or see the menu entry", async ({ browser }) => {
    const { page, close } = await pageAs(browser, "cashier")
    await page.goto("/dashboard/settings/sale-charges")
    await expect.poll(() => new URL(page.url()).pathname, { timeout: 30_000 }).not.toBe("/dashboard/settings/sale-charges")
    expect(await page.getByRole("navigation").getByText("Sale Charges").count()).toBe(0)
    await close()
  })

  test("restore the default amounts", async ({ browser }) => {
    const { page, close } = await pageAs(browser, "owner")
    await page.goto("/dashboard/settings/sale-charges")
    await page.getByLabel(/RMV charge: Finance sales/).fill("14300")
    await page.getByLabel(/RMV charge: Cash sales/).fill("10300")
    await page.getByLabel(/Third-party insurance amount/).fill("1200")
    await page.getByRole("button", { name: "Save sale charges" }).click()
    await expect.poll(async () => (await settingsRow())?.rmvChargeFinance, { timeout: 60_000 }).toBe(14_300)
    expect((await settingsRow())?.rmvChargeCash).toBe(10_300)
    expect((await settingsRow())?.thirdPartyInsuranceAmount).toBe(1_200)
    await close()
  })
})
