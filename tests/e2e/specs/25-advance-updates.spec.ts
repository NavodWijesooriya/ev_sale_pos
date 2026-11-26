import { test, expect, loadFixtures, loginAndSave, pageAs } from "../fixtures"
import { db } from "../db"
import { callServerAction, createSale } from "../helpers"

const fx = loadFixtures()
const C = fx.customers

async function cashierUser() {
  return db.user.findUniqueOrThrow({ where: { email: fx.users.cashier.email } })
}

test.describe.serial("advance payments: model booking, staff, refund permission, date filters", () => {
  let modelAdvanceId = ""

  test("staff books an advance for a model that is not in stock", async ({ browser }) => {
    const model = await db.vehicleModel.findFirstOrThrow({ where: { organizationId: fx.orgId, modelName: "Bike B2" } })
    expect(await db.vehicle.count({ where: { organizationId: fx.orgId, vehicleModelId: model.id, status: "AVAILABLE" } })).toBe(0)

    const { page, close } = await pageAs(browser, "cashier")
    await page.goto("/dashboard/sales/advances")
    await page.getByRole("button", { name: "Add Advance" }).click()
    const dialog = page.getByRole("dialog", { name: "Record Advance Payment" })
    const customer = dialog.getByRole("combobox", { name: "Customer *" })
    await customer.click()
    await customer.fill(C.advModel.name)
    await dialog.getByRole("option", { name: new RegExp(C.advModel.name) }).first().click()
    await dialog.locator("#adv-model").click()
    await page.getByRole("option", { name: /E2E Bike B2/ }).click()
    await dialog.getByLabel("Advance Amount (Rs.) *").fill("40000")
    await dialog.getByRole("button", { name: "Record Advance" }).click()

    await expect
      .poll(() => db.advancePayment.count({ where: { organizationId: fx.orgId, customerId: C.advModel.id } }), { timeout: 90_000 })
      .toBe(1)
    const advance = await db.advancePayment.findFirstOrThrow({ where: { organizationId: fx.orgId, customerId: C.advModel.id } })
    modelAdvanceId = advance.id
    expect(advance.vehicleId).toBeNull()
    expect(advance.vehicleModelId).toBe(model.id)
    expect(advance.bikeModel).toBe("E2E Bike B2")
    expect(advance.status).toBe("PENDING")
    // The staff member who added it is saved automatically.
    expect(advance.staffId).toBe((await cashierUser()).id)
    await close()
  })

  test("the advance list and the advance report show who added it", async ({ browser }) => {
    const { page, close } = await pageAs(browser, "owner")
    await page.goto("/dashboard/sales/advances")
    const row = page.getByRole("row").filter({ hasText: C.advModel.name })
    await expect(row.getByTestId("advance-staff")).toHaveText("E2E Cashier")
    await expect(row).toContainText("E2E Bike B2")
    await expect(row).toContainText("Model booking")

    await page.goto("/dashboard/sales/advances/reports")
    await expect(page.getByRole("columnheader", { name: "Added By" })).toBeVisible({ timeout: 60_000 })
    const reportRow = page.getByRole("row").filter({ hasText: C.advModel.name })
    await expect(reportRow.getByTestId("advance-staff")).toHaveText("E2E Cashier")
    await close()
  })

  test("a later sale links the advance to the bike that was actually sold", async ({ browser }) => {
    const { page, close } = await pageAs(browser, "owner")
    const sale = await createSale(page, { customerName: C.advModel.name, chassis: "E2E-STOCK-ADVM-01", paymentType: "CASH" })
    const row = await db.sale.findUniqueOrThrow({ where: { id: sale.saleId } })
    expect(row.advancePaymentId).toBe(modelAdvanceId)
    expect(row.advanceDeducted).toBe(40_000)
    const advance = await db.advancePayment.findUniqueOrThrow({ where: { id: modelAdvanceId } })
    expect(advance.status).toBe("USED")
    expect(advance.vehicleId).toBe(row.vehicleId)
    await close()
  })

  test("refund needs owner permission: hidden for staff, refused by the server, then allowed once granted", async ({ browser }) => {
    const owner = await db.user.findFirstOrThrow({ where: { organizationId: fx.orgId, role: "OrgAdmin" } })
    const advance = await db.advancePayment.create({
      data: {
        organizationId: fx.orgId,
        customerId: C.advModel.id,
        nicNumber: C.advModel.nic,
        bikeModel: "Refund permission probe",
        amount: 15_000,
        branchId: fx.branchA.id,
        staffId: owner.id,
        paymentMethod: "Cash",
        paymentDetails: "Cash",
        status: "PENDING",
      },
    })

    // Without the permission the cashier does not even see the action ...
    const staff = await pageAs(browser, "cashier")
    await staff.page.goto("/dashboard/sales/advances")
    const row = staff.page.getByRole("row").filter({ hasText: "Refund permission probe" })
    await row.getByRole("button", { name: "Open menu" }).click()
    await expect(staff.page.getByRole("menuitem", { name: "Transfer Advance" })).toBeVisible()
    await expect(staff.page.getByRole("menuitem", { name: "Refund Advance" })).toHaveCount(0)
    await staff.page.keyboard.press("Escape")

    // ... and a hand-made request is refused by the server.
    const refused = await callServerAction(staff.page, "refundAdvancePayment", [advance.id, { paymentMethod: "Cash" }])
    expect(refused).toContain('"success":false')
    expect(refused).toContain("Only the dealership owner")
    expect((await db.advancePayment.findUniqueOrThrow({ where: { id: advance.id } })).status).toBe("PENDING")
    await staff.close()

    // The owner grants "Refund advances" in the permission matrix.
    const ownerSession = await pageAs(browser, "owner")
    await ownerSession.page.goto("/dashboard/settings/permissions")
    await ownerSession.page.getByLabel("Refund advances for E2E Cashier").check()
    await ownerSession.page.getByRole("button", { name: "Save changes" }).click()
    await expect
      .poll(async () => (await cashierUser()).permissions.includes("REFUND_ADVANCES"), { timeout: 90_000 })
      .toBe(true)
    await ownerSession.close()

    // After signing in again the cashier can refund.
    await loginAndSave(browser, "cashier")
    const granted = await pageAs(browser, "cashier")
    await granted.page.goto("/dashboard/sales/advances")
    const grantedRow = granted.page.getByRole("row").filter({ hasText: "Refund permission probe" })
    await grantedRow.getByRole("button", { name: "Open menu" }).click()
    await expect(granted.page.getByRole("menuitem", { name: "Refund Advance" })).toBeVisible()
    const allowed = await callServerAction(granted.page, "refundAdvancePayment", [advance.id, { paymentMethod: "Cash" }])
    expect(allowed).toContain('"success":true')
    expect((await db.advancePayment.findUniqueOrThrow({ where: { id: advance.id } })).status).toBe("REFUNDED")
    await granted.close()

    // Take the permission away again.
    await db.user.update({
      where: { id: (await cashierUser()).id },
      data: { permissions: (await cashierUser()).permissions.filter((p) => p !== "REFUND_ADVANCES") },
    })
  })

  test("advance reports filter by a single date or a From-To range", async ({ browser }) => {
    const owner = await db.user.findFirstOrThrow({ where: { organizationId: fx.orgId, role: "OrgAdmin" } })
    const make = (name: string, date: string) =>
      db.advancePayment.create({
        data: {
          organizationId: fx.orgId,
          customerId: C.advModel.id,
          nicNumber: C.advModel.nic,
          bikeModel: name,
          amount: 1_000,
          advanceDate: new Date(`${date}T00:00:00.000Z`),
          branchId: fx.branchA.id,
          staffId: owner.id,
          paymentMethod: "Cash",
          paymentDetails: name,
          status: "PENDING",
        },
      })
    await make("Report model Mar5", "2026-03-05")
    await make("Report model Mar7", "2026-03-07")
    await make("Report model Mar9", "2026-03-09")

    const { page, close } = await pageAs(browser, "owner")
    await page.goto("/dashboard/sales/advances/reports")
    const rowFor = (name: string) => page.getByRole("row").filter({ hasText: name })
    await expect(rowFor("Report model Mar5")).toBeVisible({ timeout: 60_000 })

    await page.locator("#advance-report-date").fill("2026-03-07")
    await expect(rowFor("Report model Mar7")).toBeVisible()
    await expect(rowFor("Report model Mar5")).toHaveCount(0)
    await expect(rowFor("Report model Mar9")).toHaveCount(0)

    await page.locator("#advance-report-from").fill("2026-03-05")
    await page.locator("#advance-report-to").fill("2026-03-07")
    await expect(rowFor("Report model Mar5")).toBeVisible()
    await expect(rowFor("Report model Mar7")).toBeVisible()
    await expect(rowFor("Report model Mar9")).toHaveCount(0)

    // The refunds history takes the same kind of filter.
    await page.getByRole("tab", { name: "Refunds History" }).click()
    await expect(page.locator("#refund-report-date")).toBeVisible()
    await page.locator("#refund-report-date").fill("2020-01-01")
    await expect(page.getByText("No refunded advances match these dates.")).toBeVisible()
    await close()
  })
})
