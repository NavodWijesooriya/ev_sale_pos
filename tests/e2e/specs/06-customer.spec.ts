import { test, expect, loadFixtures, pageAs } from "../fixtures"
import { db } from "../db"

const fx = loadFixtures()
const existing = fx.customers.duplicateNic
const clashMessage = `A customer with this NIC already exists: ${existing.name}, 0771234567`

async function addCrmCustomer(page: import("@playwright/test").Page, name: string, phone: string, nic: string) {
  await page.goto("/dashboard/customers/crm")
  await page.locator("#crm-name").fill(name)
  await page.locator("#crm-phone").fill(phone)
  await page.locator("#crm-nic").fill(nic)
  await page.locator("#crm-lead-source").selectOption({ index: 1 })
  await page.getByRole("button", { name: "Add CRM Customer" }).click()
}

test.describe.serial("customer NIC", () => {
  test("a duplicate NIC is rejected with the existing customer's name and phone", async ({ browser }) => {
    const { page, close } = await pageAs(browser, "owner")
    await addCrmCustomer(page, "E2E Duplicate NIC Person", "0719998877", existing.nic)
    await expect(page.getByRole("alert").filter({ hasText: clashMessage })).toBeVisible()
    expect(await db.customer.count({ where: { organizationId: fx.orgId, nic: existing.nic } })).toBe(1)
    await close()
  })

  test("the NIC is normalised first: lower case and spaces still clash", async ({ browser }) => {
    const spaced = ` ${existing.nic.slice(0, 4)} ${existing.nic.slice(4, 9)} ${existing.nic.slice(9).toLowerCase()} `
    const { page, close } = await pageAs(browser, "owner")
    await addCrmCustomer(page, "E2E Spaced NIC Person", "0719998866", spaced)
    await expect(page.getByRole("alert").filter({ hasText: clashMessage })).toBeVisible()
    expect(await db.customer.count({ where: { organizationId: fx.orgId, name: "E2E Spaced NIC Person" } })).toBe(0)
    await close()
  })

  test("a new NIC is accepted and stored normalised", async ({ browser }) => {
    const { page, close } = await pageAs(browser, "owner")
    await addCrmCustomer(page, "E2E New NIC Person", "0715556677", "  800000001 v ")
    await expect(page.getByText(/CRM customer added/i)).toBeVisible()
    const saved = await db.customer.findFirstOrThrow({ where: { organizationId: fx.orgId, name: "E2E New NIC Person" } })
    expect(saved.nic).toBe("800000001V")
    await close()
  })

  test("the sale-side Register New Customer dialog rejects a duplicate NIC", async ({ browser }) => {
    const before = await db.customer.count({ where: { organizationId: fx.orgId } })
    const { page, close } = await pageAs(browser, "owner")
    await page.goto("/dashboard/sales/advances")
    await page.getByRole("button", { name: "Add Advance" }).click()
    await page.getByRole("button", { name: "New Customer" }).click()
    await page.locator("#quick-cust-name").fill("E2E Dialog Duplicate")
    await page.locator("#quick-cust-phone").fill("0712223344")
    await page.locator("#quick-cust-nic").fill(existing.nic.toLowerCase())
    await page.getByRole("button", { name: /Save & Select/ }).click()
    await expect(page.getByText(clashMessage)).toBeVisible()
    expect(await db.customer.count({ where: { organizationId: fx.orgId } })).toBe(before)

    // A fresh NIC through the same dialog works.
    await page.locator("#quick-cust-nic").fill("810000002V")
    await page.getByRole("button", { name: /Save & Select/ }).click()
    await expect(page.getByText(/created and selected/i)).toBeVisible()
    const created = await db.customer.findFirstOrThrow({ where: { organizationId: fx.orgId, name: "E2E Dialog Duplicate" } })
    expect(created.nic).toBe("810000002V")
    await close()
  })

  test("editing a customer to another customer's NIC is rejected", async ({ browser }) => {
    const other = fx.customers.cashSale
    const { page, close } = await pageAs(browser, "owner")
    await page.goto(`/dashboard/customers/${other.id}`)
    await page.getByRole("button", { name: "Edit Profile" }).click()
    await page.locator("#crm-nic").fill(existing.nic)
    await page.getByRole("button", { name: "Save Changes" }).click()
    await expect(page.getByRole("alert").filter({ hasText: clashMessage })).toBeVisible()
    expect((await db.customer.findUniqueOrThrow({ where: { id: other.id } })).nic).toBe(other.nic)

    // Saving the customer's own NIC unchanged is not a clash.
    await page.locator("#crm-nic").fill(other.nic.toLowerCase())
    await page.getByRole("button", { name: "Save Changes" }).click()
    await expect(page.getByText("Customer profile updated.")).toBeVisible()
    await close()
  })

  test("the database itself refuses a second customer with the same NIC", async () => {
    await expect(
      db.customer.create({
        data: { organizationId: fx.orgId, name: "E2E Raw Duplicate", phone: "0700000001", nic: existing.nic, category: "CRM", customerType: "CRM" },
      }),
    ).rejects.toMatchObject({ code: "P2002" })
  })
})
