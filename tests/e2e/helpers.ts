import { expect, type Locator, type Page } from "@playwright/test"
import { db } from "./db"

/** Pick an option in a base-ui Select by clicking its trigger, then the option. */
export async function chooseOption(page: Page, trigger: Locator, optionName: string | RegExp) {
  await trigger.click()
  await page.getByRole("option", { name: optionName }).first().click()
}

export const lkr = (n: number) => n.toLocaleString("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })

/** Parse "Rs. 1,234.50" / "LKR 1,234" style text into a number. */
export function parseMoney(text: string): number {
  const m = text.replace(/,/g, "").match(/-?\d+(\.\d+)?/)
  if (!m) throw new Error(`No amount in "${text}"`)
  return Number(m[0])
}

export interface SaleOptions {
  customerName: string
  chassis: string
  paymentType: "CASH" | "FINANCE"
  insurance?: "FULL_DEALER" | "CUSTOMER_OWN" | "NONE"
  insuranceCompany?: string
  financeCompany?: string
  /** Finance sales: loan amount (down payment = price - loan). */
  financeAmount?: number
  /** Tick the "Third-party insurance" box. */
  thirdPartyInsurance?: boolean
  /** Optional TIN number typed on the sale form. */
  tinNumber?: string
}

/** Fill the POS form for a sale without submitting it. */
export async function fillSaleForm(page: Page, o: SaleOptions) {
  await page.goto("/dashboard/sales/new")
  const customer = page.getByRole("combobox", { name: "Customer" })
  await customer.click()
  await customer.fill(o.customerName)
  await page.getByRole("option", { name: new RegExp(o.customerName) }).first().click()

  const vehicle = page.getByRole("combobox", { name: "Available vehicle" })
  await vehicle.click()
  await vehicle.fill(o.chassis)
  await page.getByRole("option", { name: new RegExp(o.chassis) }).first().click()

  if (o.paymentType === "FINANCE") {
    await page.getByRole("button", { name: /Finance Sale \(Leasing\)/ }).click()
    if (o.financeCompany) {
      await chooseOption(page, page.locator("#sale-finance-company"), new RegExp(o.financeCompany))
    }
    if (o.financeAmount !== undefined) {
      await page.locator("#sale-finance-amount").fill(String(o.financeAmount))
      // The form keeps down payment + loan = vehicle total; "Auto Balance" fixes the down payment.
      const balance = page.getByRole("button", { name: "Auto Balance" })
      if (await balance.isVisible().catch(() => false)) await balance.click()
    }
  }

  if (o.thirdPartyInsurance) await page.getByText(/Add third-party insurance/).click()
  if (o.tinNumber) await page.locator("#sale-tin-number").fill(o.tinNumber)

  if (o.insurance) {
    await chooseOption(page, page.locator("#sale-insurance-type"), {
      NONE: /No insurance/,
      FULL_DEALER: /Full insurance/,
      CUSTOMER_OWN: /own insurance/,
    }[o.insurance])
    if (o.insurance === "FULL_DEALER" && o.insuranceCompany) {
      await chooseOption(page, page.locator("#sale-insurance-company"), new RegExp(o.insuranceCompany))
    }
  }

}

/** Complete a sale through the real POS form. Returns saleId and invoice number. */
export async function createSale(page: Page, o: SaleOptions): Promise<{ saleId: string; invoiceNumber: string }> {
  await fillSaleForm(page, o)
  await page.getByRole("button", { name: /Complete Sale/ }).click()
  await page.waitForURL(/\/dashboard\/sales\/[^/]+\/invoice/, { timeout: 60_000 })
  const saleId = page.url().match(/sales\/([^/]+)\/invoice/)![1]
  // The invoice page prints a shortened number, so read the real one from the database.
  const { invoiceNumber } = await db.sale.findUniqueOrThrow({ where: { id: saleId }, select: { invoiceNumber: true } })
  expect(invoiceNumber).toMatch(/^INV-/)
  return { saleId, invoiceNumber }
}

/**
 * Calls a server action straight from the browser session, the way a hand-made request would, bypassing the screen.
 * Used to prove that a rule is enforced on the server and not only hidden in the UI.
 * `page` must be signed in and already on a page of the app that loads the action's client reference.
 */
export async function callServerAction(page: Page, actionName: string, args: unknown[]): Promise<string> {
  const scripts: string[] = await page.evaluate(() =>
    performance
      .getEntriesByType("resource")
      .map((entry) => entry.name)
      .filter((name) => name.includes("/_next/static/") && name.endsWith(".js")),
  )
  let actionId = ""
  for (const url of scripts) {
    const body = await (await page.request.get(url)).text()
    // Next lists every server action of a module as {"<id>":{"name":"<function>"}} next to its client reference.
    const match = new RegExp(`"([0-9a-f]{32,})":\\{"name":"${actionName}"`).exec(body)
    if (match) {
      actionId = match[1]
      break
    }
  }
  if (!actionId) throw new Error(`Server action ${actionName} was not found in the loaded scripts.`)
  const response = await page.request.post(page.url(), {
    headers: { "Next-Action": actionId, "Content-Type": "text/plain;charset=UTF-8", Accept: "text/x-component" },
    data: JSON.stringify(args),
  })
  return response.text()
}
