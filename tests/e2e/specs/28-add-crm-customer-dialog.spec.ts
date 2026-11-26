import { test, expect, loadFixtures, pageAs } from "../fixtures"
import { db } from "../db"
import { fillLead, openAddCrmDialog } from "../helpers"

const fx = loadFixtures()
const NIC = "950000028V"
const NAME = "E2E Dialog Lead"

test.describe.serial("Add CRM customer dialog", () => {
  test("the button opens the add-customer dialog; nothing is saved by opening it", async ({ browser }) => {
    const { page, close } = await pageAs(browser, "owner")
    const dialog = await openAddCrmDialog(page)
    await expect(dialog.getByLabel("Full name *")).toBeVisible()
    // The form is no longer permanently on the page: it only exists inside the dialog.
    await dialog.getByRole("button", { name: "Cancel" }).click()
    await expect(page.getByRole("dialog")).toHaveCount(0)
    await expect(page.getByLabel("Full name *")).toHaveCount(0)
    await close()
  })

  test("a valid lead is saved: the dialog closes and the list shows it", async ({ browser }) => {
    const { page, close } = await pageAs(browser, "owner")
    await openAddCrmDialog(page)
    await fillLead(page, { name: NAME, phone: "0712345628", nic: NIC })
    await page.getByRole("dialog", { name: "Add CRM Customer" }).getByRole("button", { name: "Save CRM Customer" }).click()

    await expect(page.getByRole("dialog")).toHaveCount(0, { timeout: 60_000 })
    await expect(page.getByRole("row").filter({ hasText: NAME })).toBeVisible({ timeout: 60_000 })
    const saved = await db.customer.findFirstOrThrow({ where: { organizationId: fx.orgId, nic: NIC } })
    expect(saved.customerType).toBe("CRM")
    expect(saved.name).toBe(NAME)
    await close()
  })

  test("a duplicate NIC shows its error inside the dialog, which stays open", async ({ browser }) => {
    const { page, close } = await pageAs(browser, "owner")
    await openAddCrmDialog(page)
    // The previous lead is gone from the form: every opening starts empty.
    await expect(page.getByLabel("Full name *")).toHaveValue("")
    await fillLead(page, { name: "E2E Duplicate Lead", phone: "0712345629", nic: NIC })
    const dialog = page.getByRole("dialog", { name: "Add CRM Customer" })
    await dialog.getByRole("button", { name: "Save CRM Customer" }).click()

    await expect(dialog.getByRole("alert")).toContainText(NAME, { timeout: 60_000 })
    await expect(dialog).toBeVisible()
    expect(await db.customer.count({ where: { organizationId: fx.orgId, nic: NIC } })).toBe(1)
    // Fixing the NIC saves it.
    await dialog.getByLabel("NIC / Passport").fill("950000029V")
    await dialog.getByRole("button", { name: "Save CRM Customer" }).click()
    await expect(page.getByRole("dialog")).toHaveCount(0, { timeout: 60_000 })
    await expect(page.getByRole("row").filter({ hasText: "E2E Duplicate Lead" })).toBeVisible({ timeout: 60_000 })
    await close()
  })

  test("staff without the customer permission cannot use the page", async ({ browser }) => {
    const { page, close } = await pageAs(browser, "supplierViewer")
    await page.goto("/dashboard/customers/crm")
    await expect(page).not.toHaveURL(/customers\/crm/)
    await close()
  })
})
