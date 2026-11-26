import fs from "node:fs"
import type { Page } from "@playwright/test"
import { test, expect, loadFixtures, pageAs } from "../fixtures"
import { db } from "../db"
import { createSale } from "../helpers"

const fx = loadFixtures()
const C = fx.customers

/** Minimal RFC 4180 reader for what lib/csv.ts writes. */
function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ""
  let quoted = false
  const src = text.replace(/^﻿/, "")
  for (let i = 0; i < src.length; i++) {
    const ch = src[i]
    if (quoted) {
      if (ch === '"' && src[i + 1] === '"') {
        cell += '"'
        i++
      } else if (ch === '"') quoted = false
      else cell += ch
    } else if (ch === '"') quoted = true
    else if (ch === ",") {
      row.push(cell)
      cell = ""
    } else if (ch === "\r" || ch === "\n") {
      if (ch === "\r" && src[i + 1] === "\n") i++
      row.push(cell)
      rows.push(row)
      row = []
      cell = ""
    } else cell += ch
  }
  if (cell !== "" || row.length) {
    row.push(cell)
    rows.push(row)
  }
  return rows
}

async function exportCsv(page: Page) {
  const [download] = await Promise.all([
    page.waitForEvent("download", { timeout: 60_000 }),
    page.getByRole("button", { name: "Export CSV" }).click(),
  ])
  return parseCsv(fs.readFileSync((await download.path())!, "utf8"))
}

test.describe.serial("sales history: date filters, bike model and CSV", () => {
  const sales: Record<"march10" | "march12" | "recent", { saleId: string; invoiceNumber: string }> = {} as never

  test("set up three sales on different days", async ({ browser }) => {
    const { page, close } = await pageAs(browser, "owner")
    sales.march10 = await createSale(page, { customerName: C.histBuyer.name, chassis: "E2E-STOCK-HIST-02", paymentType: "CASH" })
    sales.march12 = await createSale(page, { customerName: C.histBuyer.name, chassis: "E2E-STOCK-HIST-03", paymentType: "CASH" })
    sales.recent = await createSale(page, { customerName: C.histBuyer.name, chassis: "E2E-STOCK-HIST-04", paymentType: "CASH" })
    // 06:00 UTC is 11:30 in Colombo, the same calendar day.
    await db.sale.update({ where: { id: sales.march10.saleId }, data: { saleDate: new Date("2026-03-10T06:00:00Z") } })
    await db.sale.update({ where: { id: sales.march12.saleId }, data: { saleDate: new Date("2026-03-12T06:00:00Z") } })
    await close()
  })

  test("the table shows the bike model column and all sales without a date filter", async ({ browser }) => {
    const { page, close } = await pageAs(browser, "owner")
    await page.goto("/dashboard/sales/history")
    await expect(page.getByRole("columnheader", { name: "Bike Model" })).toBeVisible({ timeout: 60_000 })
    for (const sale of Object.values(sales)) {
      const row = page.getByRole("row").filter({ hasText: sale.invoiceNumber })
      await expect(row).toBeVisible()
      await expect(row.getByTestId("sale-model")).toHaveText("E2E Scooter S1")
    }
    await close()
  })

  test("a single date shows only that day's sales", async ({ browser }) => {
    const { page, close } = await pageAs(browser, "owner")
    await page.goto("/dashboard/sales/history")
    await page.locator("#sales-history-date").fill("2026-03-10")
    await expect(page.getByRole("row").filter({ hasText: sales.march10.invoiceNumber })).toBeVisible()
    await expect(page.getByRole("row").filter({ hasText: sales.march12.invoiceNumber })).toHaveCount(0)
    await expect(page.getByRole("row").filter({ hasText: sales.recent.invoiceNumber })).toHaveCount(0)
    await close()
  })

  test("a From-To range is inclusive; From alone and To alone work too", async ({ browser }) => {
    const { page, close } = await pageAs(browser, "owner")
    await page.goto("/dashboard/sales/history")
    await page.locator("#sales-history-from").fill("2026-03-10")
    await page.locator("#sales-history-to").fill("2026-03-12")
    await expect(page.getByRole("row").filter({ hasText: sales.march10.invoiceNumber })).toBeVisible()
    await expect(page.getByRole("row").filter({ hasText: sales.march12.invoiceNumber })).toBeVisible()
    await expect(page.getByRole("row").filter({ hasText: sales.recent.invoiceNumber })).toHaveCount(0)

    // To alone: everything up to and including 11 March.
    await page.locator("#sales-history-from").fill("")
    await page.locator("#sales-history-to").fill("2026-03-11")
    await expect(page.getByRole("row").filter({ hasText: sales.march10.invoiceNumber })).toBeVisible()
    await expect(page.getByRole("row").filter({ hasText: sales.march12.invoiceNumber })).toHaveCount(0)

    // From alone: 11 March onwards.
    await page.locator("#sales-history-to").fill("")
    await page.locator("#sales-history-from").fill("2026-03-11")
    await expect(page.getByRole("row").filter({ hasText: sales.march10.invoiceNumber })).toHaveCount(0)
    await expect(page.getByRole("row").filter({ hasText: sales.march12.invoiceNumber })).toBeVisible()
    await expect(page.getByRole("row").filter({ hasText: sales.recent.invoiceNumber })).toBeVisible()

    // Picking a single date replaces the range.
    await page.locator("#sales-history-date").fill("2026-03-12")
    await expect(page.locator("#sales-history-from")).toHaveValue("")
    await expect(page.getByRole("row").filter({ hasText: sales.recent.invoiceNumber })).toHaveCount(0)
    await expect(page.getByRole("row").filter({ hasText: sales.march12.invoiceNumber })).toBeVisible()
    await close()
  })

  test("a range that is back to front shows a message and no sales", async ({ browser }) => {
    const { page, close } = await pageAs(browser, "owner")
    await page.goto("/dashboard/sales/history")
    // The date inputs limit each other in the picker; type past the limit to prove the data guard too.
    await page.locator("#sales-history-to").fill("2026-03-01")
    await page.locator("#sales-history-from").fill("2026-03-20")
    await expect(page.getByText("The From date must be on or before the To date.")).toBeVisible()
    await expect(page.getByRole("row").filter({ hasText: sales.march10.invoiceNumber })).toHaveCount(0)
    await close()
  })

  test("the CSV export follows the filter", async ({ browser }) => {
    const { page, close } = await pageAs(browser, "owner")
    await page.goto("/dashboard/sales/history")
    await expect(page.getByRole("columnheader", { name: "Bike Model" })).toBeVisible({ timeout: 60_000 })

    // Filtered to the 10-12 March range: two sales, with the bike model column.
    await page.locator("#sales-history-from").fill("2026-03-10")
    await page.locator("#sales-history-to").fill("2026-03-12")
    await expect(page.getByRole("row").filter({ hasText: sales.recent.invoiceNumber })).toHaveCount(0)
    const filtered = await exportCsv(page)
    expect(filtered[0]).toContain("Bike Model")
    const invoices = filtered.slice(1).map((row) => row[0])
    expect(invoices).toContain(sales.march10.invoiceNumber)
    expect(invoices).toContain(sales.march12.invoiceNumber)
    expect(invoices).not.toContain(sales.recent.invoiceNumber)
    const modelIndex = filtered[0].indexOf("Bike Model")
    expect(filtered.find((row) => row[0] === sales.march10.invoiceNumber)![modelIndex]).toBe("E2E Scooter S1")
    const dateIndex = filtered[0].indexOf("Date")
    expect(filtered.find((row) => row[0] === sales.march10.invoiceNumber)![dateIndex]).toBe("2026-03-10")

    // Single date: exactly that day.
    await page.locator("#sales-history-date").fill("2026-03-12")
    await expect(page.getByRole("row").filter({ hasText: sales.march10.invoiceNumber })).toHaveCount(0)
    const single = await exportCsv(page)
    const singleInvoices = single.slice(1).map((row) => row[0])
    expect(singleInvoices).toEqual([sales.march12.invoiceNumber])

    // Cleared: the recent sale is back.
    await page.getByRole("button", { name: "Clear dates" }).click()
    const all = await exportCsv(page)
    expect(all.slice(1).map((row) => row[0])).toContain(sales.recent.invoiceNumber)
    await close()
  })
})
