import type { Page } from "@playwright/test"
import { test, expect, loadFixtures, pageAs } from "../fixtures"
import { db } from "../db"
import { createSale } from "../helpers"

const fx = loadFixtures()
const CHASSIS = "E2E-STOCK-COMM-02"
const PLATE = "WP E2E-1234"

/** The DMT tracker table on the Reports overview: rows are bikes whose DMT is not Completed. */
async function trackerRow(page: Page) {
  await page.goto("/dashboard/reports")
  await expect(page.getByText("Department of Motor Traffic (DMT) Registration Tracker")).toBeVisible({ timeout: 60_000 })
  return page.getByRole("row").filter({ hasText: CHASSIS })
}

async function dmt(saleId: string) {
  return db.dMTRegistration.findUniqueOrThrow({ where: { saleId } })
}

async function save(page: Page, saleId: string, expected: Partial<{ status: string; numberPlateStatus: string }>) {
  await page.getByRole("button", { name: /Save progress/ }).click()
  await expect
    .poll(async () => {
      const d = await dmt(saleId)
      return [expected.status ? d.status : "", expected.numberPlateStatus ? d.numberPlateStatus : ""].join("|")
    }, { timeout: 90_000 })
    .toBe([expected.status ?? "", expected.numberPlateStatus ?? ""].join("|"))
}

test.describe.serial("DMT / RMV workflow", () => {
  let saleId = ""
  let bikePath = ""

  test("after a sale the DMT record is Pending and shows in the Pending DMT report and the RMV registry", async ({ browser }) => {
    const { page, close } = await pageAs(browser, "owner")
    // Reuse the sale the commission spec made for this bike, or make one when this spec runs alone.
    const existing = await db.sale.findFirst({ where: { vehicle: { chassisNumber: CHASSIS } } })
    const sale = existing
      ? { saleId: existing.id }
      : await createSale(page, { customerName: fx.customers.commInsurance.name, chassis: CHASSIS, paymentType: "CASH" })
    saleId = sale.saleId
    const vehicle = await db.vehicle.findUniqueOrThrow({ where: { chassisNumber: CHASSIS } })
    bikePath = `/dashboard/bikes/${vehicle.id}`

    const record = await dmt(saleId)
    expect(record.status).toBe("Pending")
    expect(record.numberPlateStatus).toBe("PENDING")
    expect([record.hasMTA2, record.hasNIC, record.hasPhotos, record.hasTIN]).toEqual([false, false, false, false])

    const row = await trackerRow(page)
    await expect(row).toContainText("Pending")
    await expect(row).toContainText("Missing: MTA2 Transfer Form")

    await page.goto("/dashboard/customers/rmv")
    await page.getByPlaceholder(/Search by customer/).fill(CHASSIS)
    // Only this bike's card is left; its plate has not been issued yet.
    await expect(page.getByText(`Chassis: ${CHASSIS}`)).toBeVisible()
    await expect(page.getByText(/Number Plates*Pending/)).toBeVisible()
    await close()
  })

  test("the number plate cannot be issued without the earlier steps or a registration number", async ({ browser }) => {
    const { page, close } = await pageAs(browser, "owner")
    await page.goto(bikePath)
    // The plate step is locked until the documents are submitted to RMV.
    await expect(page.getByLabel("3. Number plate")).toBeDisabled()
    await expect(page.getByLabel("Documents submitted to RMV")).toBeDisabled()
    await close()
  })

  test("tick MTA2, NIC, Photos and TIN: status becomes DocumentsCollected", async ({ browser }) => {
    const { page, close } = await pageAs(browser, "owner")
    await page.goto(bikePath)
    for (const label of ["MTA2 form", "NIC copy", "Photos", "TIN"]) await page.getByLabel(label, { exact: true }).check()
    await save(page, saleId, { status: "DocumentsCollected" })
    const d = await dmt(saleId)
    expect([d.hasMTA2, d.hasNIC, d.hasPhotos, d.hasTIN]).toEqual([true, true, true, true])
    // Still on the pending report (not completed yet).
    await expect(await trackerRow(page)).toBeVisible()
    await close()
  })

  test("submit to RMV and start the number plate: Processing / plate PROCESSING", async ({ browser }) => {
    const { page, close } = await pageAs(browser, "owner")
    await page.goto(bikePath)
    await page.getByLabel("Documents submitted to RMV").check()
    await page.getByLabel("3. Number plate").selectOption("PROCESSING")
    await save(page, saleId, { status: "Processing", numberPlateStatus: "PROCESSING" })
    await close()
  })

  test("an issued plate needs a registration number; with it and the book received the DMT is Completed", async ({ browser }) => {
    const { page, close } = await pageAs(browser, "owner")
    await page.goto(bikePath)
    await page.getByLabel("3. Number plate").selectOption("ISSUED")
    await page.getByRole("button", { name: /Save progress/ }).click()
    await expect(page.getByText(/Enter the registration number before marking the number plate as issued/i).first()).toBeVisible({
      timeout: 60_000,
    })
    expect((await dmt(saleId)).numberPlateStatus).toBe("PROCESSING")

    await page.getByLabel("Registration number").fill(PLATE.toLowerCase())
    await page.getByLabel("4. Registration book received").check()
    await save(page, saleId, { status: "Completed", numberPlateStatus: "ISSUED" })

    const d = await dmt(saleId)
    expect(d.registrationNumber).toBe(PLATE)
    expect(d.isBookOk).toBe(true)
    const vehicle = await db.vehicle.findUniqueOrThrow({ where: { chassisNumber: CHASSIS } })
    expect(vehicle.registrationNumber).toBe(PLATE)
    expect(await db.auditLog.count({ where: { organizationId: fx.orgId, action: "DMT_UPDATED", entityId: saleId } })).toBe(3) // one per successful save (the refused attempt writes nothing)
    await close()
  })

  test("a completed DMT disappears from the Pending DMT report and the RMV registry shows the plate", async ({ browser }) => {
    const { page, close } = await pageAs(browser, "owner")
    await page.goto("/dashboard/reports")
    await expect(page.getByText("Department of Motor Traffic (DMT) Registration Tracker")).toBeVisible({ timeout: 60_000 })
    await expect(page.getByRole("row").filter({ hasText: CHASSIS })).toHaveCount(0)

    await page.goto("/dashboard/customers/rmv")
    await page.getByPlaceholder(/Search by customer/).fill(CHASSIS)
    await expect(page.getByText(`Chassis: ${CHASSIS}`)).toBeVisible({ timeout: 30_000 })
    // The plate number sits in the card's "Plate No" field.
    await expect(page.getByRole("textbox", { name: /Plate No/ })).toHaveValue(PLATE)
    await close()
  })
})
