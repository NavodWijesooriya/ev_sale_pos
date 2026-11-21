import { test, expect, loadFixtures, pageAs } from "../fixtures"
import { db } from "../db"

const fx = loadFixtures()

test.describe("customer", () => {
  // KNOWN APP BUG: createCRMCustomer (app/actions/customer.ts) only checks name/phone/email and never looks
  // for an existing customer with the same NIC, and Customer.nic has no unique constraint. A duplicate NIC
  // is therefore saved. test.fail() keeps the suite green while the bug exists and turns red once it is fixed.
  test.fail("a duplicate NIC is rejected", async ({ browser }) => {
    const nic = fx.customers.duplicateNic.nic
    const before = await db.customer.count({ where: { organizationId: fx.orgId, nic } })
    expect(before).toBe(1)

    const { page, close } = await pageAs(browser, "owner")
    await page.goto("/dashboard/customers/crm")
    await page.locator("#crm-name").fill("E2E Duplicate NIC Person")
    await page.locator("#crm-phone").fill("0719998877")
    await page.locator("#crm-nic").fill(nic)
    await page.locator("#crm-lead-source").selectOption({ index: 1 })
    await page.getByRole("button", { name: "Add CRM Customer" }).click()

    await expect(page.getByRole("alert").filter({ hasText: /NIC|already/i })).toBeVisible()
    expect(await db.customer.count({ where: { organizationId: fx.orgId, nic } })).toBe(1)
    await close()
  })

  test("a customer with a new NIC can be added (control case)", async ({ browser }) => {
    const nic = `E2E-NEW-${Date.now().toString(36).toUpperCase()}`
    const { page, close } = await pageAs(browser, "owner")
    await page.goto("/dashboard/customers/crm")
    await page.locator("#crm-name").fill("E2E New NIC Person")
    await page.locator("#crm-phone").fill("0715556677")
    await page.locator("#crm-nic").fill(nic)
    await page.locator("#crm-lead-source").selectOption({ index: 1 })
    await page.getByRole("button", { name: "Add CRM Customer" }).click()
    await expect(page.getByText(/CRM customer added/i)).toBeVisible()
    expect(await db.customer.count({ where: { organizationId: fx.orgId, nic } })).toBe(1)
    await close()
  })
})
