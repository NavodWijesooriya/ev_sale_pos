import fs from "node:fs"
import type { Download, Page } from "@playwright/test"
import { test, expect, loadFixtures, pageAs } from "../fixtures"
import { db } from "../db"
import { parseMoney } from "../helpers"
import { paySupplier } from "../supplier"

const fx = loadFixtures()
const G = fx.supplierGrns

/** Minimal RFC 4180 reader for what lib/csv.ts writes (BOM, CRLF, quoted text, plain numbers). */
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

async function readCsv(download: Download) {
  const file = await download.path()
  expect(file).toBeTruthy()
  return { name: download.suggestedFilename(), rows: parseCsv(fs.readFileSync(file!, "utf8")) }
}

async function exportCsv(page: Page, scope = page.locator("main")) {
  const [download] = await Promise.all([
    page.waitForEvent("download", { timeout: 60_000 }),
    scope.getByRole("button", { name: "Export CSV" }).first().click(),
  ])
  return readCsv(download)
}

const num = (s: string) => Number(s)

test.describe.serial("CSV exports match the screen", () => {
  test("setup: a payment and two cheques exist for the supplier", async ({ browser }) => {
    const { page, close } = await pageAs(browser, "owner")
    await paySupplier(page, {
      supplierName: fx.supplier.name,
      method: "BankTransfer",
      amount: 30000,
      allocations: { [G.advTarget.grnNumber]: 30000 },
      reference: "TRF-CSV-1",
    })
    // All three payments go to one GRN no other spec touches (100,000 owed), so this spec stands alone.
    for (const number of ["CSV-CHQ-1", "CSV-CHQ-2"]) {
      await paySupplier(page, {
        supplierName: fx.supplier.name,
        method: "CHEQUE",
        amount: 20000,
        allocations: { [G.advTarget.grnNumber]: 20000 },
        cheque: { number, bank: "E2E Bank" },
      })
    }
    expect(await db.cheque.count({ where: { organizationId: fx.orgId, chequeNumber: { startsWith: "CSV-CHQ" } } })).toBe(2)
    await close()
  })

  test("Supplier outstanding: rows and totals equal the table and the card", async ({ browser }) => {
    const { page, close } = await pageAs(browser, "owner")
    await page.goto("/dashboard/suppliers/reports")
    await page.getByRole("tab", { name: "Outstanding" }).click()
    const description = await page.getByText(/Purchases Rs\. .* · Paid Rs\. .* · Outstanding Rs\./).first().innerText()
    const [purchases, paid, outstanding] = [...description.matchAll(/Rs\. ([\d,]+\.\d\d)/g)].map((m) => parseMoney(m[1]))
    const tableRows = await page.getByRole("tabpanel", { name: "Outstanding" }).locator("tbody tr").count()

    const { name, rows } = await exportCsv(page, page.getByRole("tabpanel", { name: "Outstanding" }))
    expect(name).toMatch(/^supplier_outstanding_\d{4}-\d{2}-\d{2}\.csv$/)
    expect(rows[0][0]).toBe("Supplier")
    const body = rows.slice(1, -1)
    expect(body).toHaveLength(tableRows)
    const total = rows[rows.length - 1]
    expect(total[0]).toBe("Total")
    expect([num(total[1]), num(total[2]), num(total[3])]).toEqual([purchases, paid, outstanding])
    // The supplier line carries the same figures as the database (other specs may also have paid this supplier).
    const sums = await db.gRN.aggregate({
      where: { organizationId: fx.orgId, supplierId: fx.supplier.id },
      _sum: { totalAmount: true, paidAmount: true, balanceAmount: true },
    })
    const mine = body.find((r) => r[0] === fx.supplier.name)!
    expect(num(mine[1])).toBe(sums._sum.totalAmount)
    expect(num(mine[2])).toBe(sums._sum.paidAmount)
    expect(num(mine[3])).toBe(sums._sum.balanceAmount)
    expect(sums._sum.paidAmount).toBeGreaterThanOrEqual(70_000)
    await close()
  })

  test("Supplier ledger: every line and the closing balance equal the screen", async ({ browser }) => {
    const { page, close } = await pageAs(browser, "owner")
    await page.goto(`/dashboard/suppliers/reports?supplierId=${fx.supplier.id}`)
    const panel = page.getByRole("tabpanel", { name: "Ledger" })
    await expect(panel.getByText(/Balance owed/)).toBeVisible({ timeout: 60_000 })
    const header = await panel.getByText(/Balance owed Rs\./).innerText()
    const [balance, advance] = [...header.matchAll(/Rs\. ([\d,]+\.\d\d)/g)].map((m) => parseMoney(m[1]))
    const lines = await panel.locator("tbody tr").count()

    const { name, rows } = await exportCsv(page, panel)
    expect(name).toMatch(/^supplier_ledger_e2e_supplier_\d{4}-\d{2}-\d{2}\.csv$/)
    expect(rows[0].slice(0, 3)).toEqual(["Date", "Type", "Reference"])
    // header + one line per ledger entry + closing balance + advance held
    expect(rows).toHaveLength(1 + lines + 2)
    expect(num(rows[rows.length - 2][6])).toBe(balance)
    expect(num(rows[rows.length - 1][6])).toBe(advance)
    // The debits (GRNs) and credits (payments) add up to the closing balance.
    const entries = rows.slice(1, -2)
    const owed = entries.reduce((s, r) => s + num(r[4] || "0") - num(r[5] || "0"), 0)
    expect(owed).toBeCloseTo(balance, 2)
    await close()
  })

  test("Supplier payment history: one row per payment shown", async ({ browser }) => {
    const { page, close } = await pageAs(browser, "owner")
    await page.goto("/dashboard/suppliers/reports")
    await page.getByRole("tab", { name: "Payment history" }).click()
    const panel = page.getByRole("tabpanel", { name: "Payment history" })
    await expect(panel.locator("tbody tr").first()).toBeVisible({ timeout: 60_000 })
    const shown = await panel.locator("tbody tr").count()
    const { rows } = await exportCsv(page, panel)
    expect(rows[0][0]).toBe("Payment")
    expect(rows.length - 1).toBe(shown)
    const payments = await db.supplierPayment.findMany({ where: { organizationId: fx.orgId, supplierId: fx.supplier.id } })
    expect(shown).toBe(payments.length)
    expect(rows.slice(1).reduce((s, r) => s + num(r[5]), 0)).toBe(payments.reduce((s, p) => s + p.amount, 0))
    await close()
  })

  test("Cheques: the export follows the status filter and its total equals the screen", async ({ browser }) => {
    const { page, close } = await pageAs(browser, "owner")
    await page.goto("/dashboard/suppliers/cheques")
    const summary = page.getByTestId("cheque-shown-summary")
    const active = await db.cheque.findMany({
      where: { organizationId: fx.orgId, status: { in: ["PENDING", "ISSUED", "PRESENTED"] } },
    })
    await expect(summary).toContainText(`Showing ${active.length} cheque`, { timeout: 60_000 })
    const shownTotal = parseMoney((await summary.innerText()).split("total")[1])
    expect(shownTotal).toBe(active.reduce((s, c) => s + c.amount, 0))

    const awaiting = await exportCsv(page)
    expect(awaiting.name).toMatch(/^supplier_cheques_active_/)
    expect(awaiting.rows[0][0]).toBe("Cheque no.")
    const listed = awaiting.rows.slice(1, -1).map((r) => r[0])
    expect(listed).toHaveLength(active.length)
    expect(listed).toEqual(expect.arrayContaining(["CSV-CHQ-1", "CSV-CHQ-2"]))
    expect(num(awaiting.rows[awaiting.rows.length - 1][5])).toBe(shownTotal)

    // Another filter, another export: the file follows the filter and its total follows the screen.
    await page.getByLabel("Filter by status").selectOption("ALL")
    const everything = await db.cheque.findMany({ where: { organizationId: fx.orgId } })
    await expect(summary).toContainText(`Showing ${everything.length} cheque`)
    const all = await exportCsv(page)
    expect(all.name).toMatch(/^supplier_cheques_all_/)
    expect(all.rows).toHaveLength(everything.length + 2)
    expect(num(all.rows[all.rows.length - 1][5])).toBe(parseMoney((await summary.innerText()).split("total")[1]))
    await close()
  })

  test("Bike stock: the export has the rows on screen, including the battery serial", async ({ browser }) => {
    const { page, close } = await pageAs(browser, "owner")
    await page.goto("/dashboard/grn/stock")
    const summary = page.getByTestId("stock-shown-summary")
    await expect(summary).toContainText("Showing", { timeout: 60_000 })
    const total = Number((await summary.innerText()).match(/of (\d+) bikes/)![1])
    const all = await exportCsv(page)
    expect(all.name).toMatch(/^bike_stock_\d{4}-\d{2}-\d{2}\.csv$/)
    expect(all.rows[0]).toEqual([
      "Unit GRN", "Chassis number", "GRN batch", "Model", "Color", "Motor number", "Charging serial", "Battery serial", "Year", "Showroom",
    ])
    expect(all.rows.length - 1).toBe(total)

    // With a search filter the export covers only the filtered bikes.
    await page.getByRole("searchbox").fill("E2E-STOCK-XFER")
    await expect(summary).toContainText("Showing 4 of")
    const filtered = await exportCsv(page)
    expect(filtered.rows.length - 1).toBe(4)
    expect(filtered.rows.slice(1).every((r) => r[1].startsWith("E2E-STOCK-XFER") && r[7] === `BAT-${r[1]}`)).toBe(true)
    await close()
  })
})
