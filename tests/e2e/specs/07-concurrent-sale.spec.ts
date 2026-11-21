import { test, expect, loadFixtures, pageAs } from "../fixtures"
import { db } from "../db"
import { fillSaleForm } from "../helpers"

const fx = loadFixtures()
const CHASSIS = "E2E-STOCK-RACE-01"

test("two sessions selling the same bike at the same moment: exactly one succeeds", async ({ browser }) => {
  test.setTimeout(300_000)
  const a = await pageAs(browser, "owner")
  const b = await pageAs(browser, "cashier")

  // Both sessions prepare a complete sale of the same bike for different customers.
  await Promise.all([
    fillSaleForm(a.page, { customerName: fx.customers.raceOne.name, chassis: CHASSIS, paymentType: "CASH" }),
    fillSaleForm(b.page, { customerName: fx.customers.raceTwo.name, chassis: CHASSIS, paymentType: "CASH" }),
  ])

  // Submit both together.
  const submit = (page: typeof a.page) => page.getByRole("button", { name: /Complete Sale/ }).click()
  await Promise.all([submit(a.page), submit(b.page)])

  // Wait until both have an outcome: an invoice page, or an error toast.
  const outcome = async (page: typeof a.page) => {
    const done = await Promise.race([
      page.waitForURL(/\/dashboard\/sales\/[^/]+\/invoice/, { timeout: 90_000 }).then(() => "sold" as const),
      page
        .getByText(/no longer available|just sold or reserved|cannot be sold/i)
        .first()
        .waitFor({ timeout: 90_000 })
        .then(() => "rejected" as const),
    ])
    return done
  }
  const results = await Promise.all([outcome(a.page), outcome(b.page)])

  expect(results.filter((r) => r === "sold")).toHaveLength(1)
  expect(results.filter((r) => r === "rejected")).toHaveLength(1)

  const vehicle = await db.vehicle.findUniqueOrThrow({ where: { chassisNumber: CHASSIS } })
  expect(vehicle.status).toBe("Sold")
  const sales = await db.sale.findMany({ where: { vehicleId: vehicle.id } })
  expect(sales).toHaveLength(1)
  // The losing customer got no sale and nothing else was written for them.
  const loser = [fx.customers.raceOne, fx.customers.raceTwo].find((c) => c.id !== sales[0].customerId)!
  expect(await db.sale.count({ where: { customerId: loser.id } })).toBe(0)

  await a.close()
  await b.close()
})
