import { test, expect, loadFixtures, pageAs } from "../fixtures"
import { db } from "../db"

const fx = loadFixtures()

async function fillBike(page: import("@playwright/test").Page, index: number, chassis: string, motor: string, charging: string) {
  await page.locator(`#bike-${index}-chassis`).fill(chassis)
  await page.locator(`#bike-${index}-motor`).fill(motor)
  await page.locator(`#bike-${index}-charging`).fill(charging)
  await page.locator(`#bike-${index}-color`).selectOption({ index: 1 })
}

test.describe.serial("GRN", () => {
  const stamp = Date.now().toString(36).toUpperCase()
  const chassis = [`E2E-GRN-${stamp}-1`, `E2E-GRN-${stamp}-2`]

  async function stockCount() {
    return db.vehicle.count({ where: { organizationId: fx.orgId, branchId: fx.branchA.id, status: { in: ["InStock", "AVAILABLE"] } } })
  }

  test("creating a GRN with 2 bikes increases stock and lists the bikes", async ({ browser }) => {
    const before = await stockCount()
    const { page, close } = await pageAs(browser, "owner")
    await page.goto("/dashboard/grn/create")
    await page.getByLabel("Showroom *").selectOption({ label: fx.branchA.name })
    await page.getByLabel("Transport reference number").fill(`TR-${stamp}`)
    await fillBike(page, 0, chassis[0], `MOTOR-${stamp}-1`, `CHG-${stamp}-1`)
    await page.getByRole("button", { name: "Add bike" }).click()
    await fillBike(page, 1, chassis[1], `MOTOR-${stamp}-2`, `CHG-${stamp}-2`)
    await page.getByRole("button", { name: "Create GRN" }).click()
    // The success toast is short-lived, so assert the saved GRN instead.
    await expect
      .poll(() => db.gRN.count({ where: { organizationId: fx.orgId, transportRefNumber: `TR-${stamp}` } }), { timeout: 90_000 })
      .toBe(1)
    const grn = await db.gRN.findFirstOrThrow({
      where: { organizationId: fx.orgId, transportRefNumber: `TR-${stamp}` },
      include: { vehicles: true },
    })
    expect(grn.vehicles).toHaveLength(2)
    expect(grn.vehicles.map((v) => v.chassisNumber).sort()).toEqual([...chassis].sort())
    expect(grn.vehicles.every((v) => v.branchId === fx.branchA.id)).toBe(true)
    expect(await stockCount()).toBe(before + 2)

    await page.goto("/dashboard/grn/stock")
    await expect(page.getByText(chassis[0]).first()).toBeVisible()
    await expect(page.getByText(chassis[1]).first()).toBeVisible()
    await close()
  })

  test("a duplicate chassis number is rejected and no stock is added", async ({ browser }) => {
    const before = await stockCount()
    const grnsBefore = await db.gRN.count({ where: { organizationId: fx.orgId } })
    const { page, close } = await pageAs(browser, "owner")
    await page.goto("/dashboard/grn/create")
    await page.getByLabel("Showroom *").selectOption({ label: fx.branchA.name })
    await fillBike(page, 0, chassis[0], `MOTOR-${stamp}-X`, `CHG-${stamp}-X`)
    await page.getByRole("button", { name: "Create GRN" }).click()
    await expect(page.getByRole("alert").filter({ hasText: /already exist/i })).toBeVisible()
    expect(await stockCount()).toBe(before)
    expect(await db.gRN.count({ where: { organizationId: fx.orgId } })).toBe(grnsBefore)
    expect(await db.vehicle.count({ where: { chassisNumber: chassis[0] } })).toBe(1)
    await close()
  })

  test("the same chassis twice in one GRN is rejected", async ({ browser }) => {
    const dup = `E2E-GRN-${stamp}-DUP`
    const { page, close } = await pageAs(browser, "owner")
    await page.goto("/dashboard/grn/create")
    await page.getByLabel("Showroom *").selectOption({ label: fx.branchA.name })
    await fillBike(page, 0, dup, `MOTOR-${stamp}-D1`, `CHG-${stamp}-D1`)
    await page.getByRole("button", { name: "Add bike" }).click()
    await fillBike(page, 1, dup, `MOTOR-${stamp}-D2`, `CHG-${stamp}-D2`)
    await page.getByRole("button", { name: "Create GRN" }).click()
    await expect(page.getByRole("alert").first()).toBeVisible()
    expect(await db.vehicle.count({ where: { chassisNumber: dup } })).toBe(0)
    await close()
  })
})
