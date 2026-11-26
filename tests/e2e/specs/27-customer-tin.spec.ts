import { test, expect, loadFixtures, pageAs } from "../fixtures"
import { db } from "../db"
import { fillLead, fillSaleForm, openAddCrmDialog } from "../helpers"

const fx = loadFixtures()
const NAME = "E2E Customer TIN Lead"
const NIC = "960000027V"

test.describe.serial("TIN on CRM customers", () => {
  let customerId = ""

  test("the Add CRM Customer dialog saves an optional TIN; an invalid one is refused inside the dialog", async ({ browser }) => {
    const { page, close } = await pageAs(browser, "owner")
    await openAddCrmDialog(page)
    const dialog = await fillLead(page, { name: NAME, phone: "0712345627", nic: NIC, tin: "x!" })
    await dialog.getByRole("button", { name: "Save CRM Customer" }).click()
    await expect(dialog.getByRole("alert")).toContainText("TIN must be 5 to 20 letters, numbers or dashes.", { timeout: 60_000 })
    expect(await db.customer.count({ where: { organizationId: fx.orgId, nic: NIC } })).toBe(0)

    await dialog.getByLabel(/TIN number/).fill("crm-tin-001")
    await dialog.getByRole("button", { name: "Save CRM Customer" }).click()
    await expect(page.getByRole("dialog")).toHaveCount(0, { timeout: 60_000 })
    const saved = await db.customer.findFirstOrThrow({ where: { organizationId: fx.orgId, nic: NIC } })
    customerId = saved.id
    expect(saved.tinNumber).toBe("CRM-TIN-001")
    await close()
  })

  test("the TIN shows on the customer profile and can be changed in the edit form", async ({ browser }) => {
    const { page, close } = await pageAs(browser, "owner")
    await page.goto(`/dashboard/customers/${customerId}`)
    await expect(page.getByTestId("profile-tin")).toContainText("CRM-TIN-001", { timeout: 60_000 })

    await page.getByRole("button", { name: "Edit Profile" }).click()
    const dialog = page.getByRole("dialog", { name: "Edit Customer Profile" })
    await expect(dialog.getByLabel(/TIN number/)).toHaveValue("CRM-TIN-001", { timeout: 60_000 })
    await dialog.getByLabel(/TIN number/).fill("new-tin-002")
    await dialog.getByRole("button", { name: "Save Changes" }).click()
    await expect
      .poll(async () => (await db.customer.findUniqueOrThrow({ where: { id: customerId } })).tinNumber, { timeout: 60_000 })
      .toBe("NEW-TIN-002")
    await expect(page.getByTestId("profile-tin")).toContainText("NEW-TIN-002", { timeout: 60_000 })

    // Clearing it removes the TIN.
    await page.getByRole("button", { name: "Edit Profile" }).click()
    await dialog.getByLabel(/TIN number/).fill("")
    await dialog.getByRole("button", { name: "Save Changes" }).click()
    await expect
      .poll(async () => (await db.customer.findUniqueOrThrow({ where: { id: customerId } })).tinNumber, { timeout: 60_000 })
      .toBeNull()
    // Put one back for the next tests.
    await db.customer.update({ where: { id: customerId }, data: { tinNumber: "NEW-TIN-002" } })
    await close()
  })

  test("New Sale prefills the customer's TIN; a different TIN is kept on the sale only", async ({ browser }) => {
    const { page, close } = await pageAs(browser, "owner")
    await fillSaleForm(page, { customerName: NAME, chassis: "E2E-STOCK-CTIN-01", paymentType: "CASH" })
    const tin = page.locator("#sale-tin-number")
    await expect(tin).toHaveValue("NEW-TIN-002")

    await tin.fill("SALE-TIN-9")
    await page.getByRole("button", { name: /Complete Sale/ }).click()
    await page.waitForURL(/\/dashboard\/sales\/[^/]+\/invoice/, { timeout: 60_000 })
    const saleId = page.url().match(/sales\/([^/]+)\/invoice/)![1]
    expect((await db.sale.findUniqueOrThrow({ where: { id: saleId } })).tinNumber).toBe("SALE-TIN-9")
    // The invoice prints the TIN saved on the sale, and the customer's own TIN is untouched.
    await expect(page.getByTestId("invoice-tin")).toHaveText("SALE-TIN-9")
    expect((await db.customer.findUniqueOrThrow({ where: { id: customerId } })).tinNumber).toBe("NEW-TIN-002")
    await close()
  })

  test("Advance Payment prefills the customer's TIN too, and it stays editable", async ({ browser }) => {
    const { page, close } = await pageAs(browser, "owner")
    await page.goto("/dashboard/sales/advances")
    await page.getByRole("button", { name: "Add Advance" }).click()
    const dialog = page.getByRole("dialog", { name: "Record Advance Payment" })
    const customer = dialog.getByRole("combobox", { name: "Customer *" })
    await customer.click()
    await customer.fill(NAME)
    await dialog.getByRole("option", { name: new RegExp(NAME) }).first().click()
    const tin = dialog.getByLabel(/TIN Number/)
    await expect(tin).toHaveValue("NEW-TIN-002")
    await tin.fill("ADV-OWN-77")
    await dialog.getByLabel("Advance Amount (Rs.) *").fill("12000")
    await dialog.getByRole("button", { name: "Record Advance" }).click()
    await expect
      .poll(() => db.advancePayment.count({ where: { organizationId: fx.orgId, customerId } }), { timeout: 90_000 })
      .toBe(1)
    const advance = await db.advancePayment.findFirstOrThrow({ where: { organizationId: fx.orgId, customerId } })
    expect(advance.tinNumber).toBe("ADV-OWN-77")
    expect((await db.customer.findUniqueOrThrow({ where: { id: customerId } })).tinNumber).toBe("NEW-TIN-002")
    await close()
  })
})
