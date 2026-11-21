import { test, expect, loadFixtures, pageAs } from "../fixtures"
import { db } from "../db"
import { createSale } from "../helpers"
import { fillReceiveDialog, receivePayment } from "../finance"

const LOAN = 400000

test.describe.serial("finance receivables", () => {
  const fx = loadFixtures()
  const co = fx.financeCompany.name
  const inv: Record<string, string> = {}
  const sid: Record<string, string> = {}

  async function detail(key: string) {
    return db.financeDetail.findUniqueOrThrow({ where: { saleId: sid[key] } })
  }
  async function auditCount(action: string) {
    return db.auditLog.count({ where: { organizationId: fx.orgId, action } })
  }

  test("setup: S1 comes from the finance sale spec; create S2..S6 through the POS", async ({ browser }) => {
    test.setTimeout(600_000) // five sales through the real form
    const first = await db.sale.findFirstOrThrow({
      where: { organizationId: fx.orgId, paymentType: "FINANCE" },
      orderBy: { saleDate: "asc" },
    })
    inv.S1 = first.invoiceNumber
    sid.S1 = first.id
    const { page, close } = await pageAs(browser, "owner")
    const defs: Array<[string, keyof typeof fx.customers, string]> = [
      ["S2", "financeTwo", "E2E-STOCK-FIN-02"],
      ["S3", "financeThree", "E2E-STOCK-FIN-03"],
      ["S4", "financeFour", "E2E-STOCK-FIN-04"],
      ["S5", "financeFive", "E2E-STOCK-FIN-05"],
      ["S6", "financeSix", "E2E-STOCK-FIN-06"],
    ]
    for (const [key, customer, chassis] of defs) {
      const s = await createSale(page, {
        customerName: fx.customers[customer].name,
        chassis,
        paymentType: "FINANCE",
        financeCompany: co,
      })
      inv[key] = s.invoiceNumber
      sid[key] = s.saleId
      expect((await detail(key)).balanceAmount).toBe(LOAN)
    }
    await close()
  })

  test("a full bank transfer payment marks the sale Received", async ({ browser }) => {
    const { page, close } = await pageAs(browser, "owner")
    await receivePayment(page, {
      companyName: co,
      method: "BankTransfer",
      amount: LOAN,
      allocations: { [inv.S2]: LOAN },
      reference: "TRF-FULL-S2",
    })
    const d = await detail("S2")
    expect(d.status).toBe("Received")
    expect(d.balanceAmount).toBe(0)
    expect(d.receivedAmount).toBe(LOAN)
    expect(d.receivedAt).not.toBeNull()
    // It leaves the pending list.
    await page.goto("/dashboard/finance/receivables")
    await expect(page.getByRole("row").filter({ hasText: fx.customers.financeTwo.name })).toHaveCount(0)
    await close()
  })

  test("a partial payment marks the sale Partial with the right balance", async ({ browser }) => {
    const { page, close } = await pageAs(browser, "owner")
    await receivePayment(page, {
      companyName: co,
      method: "BankTransfer",
      amount: 150000,
      allocations: { [inv.S3]: 150000 },
      reference: "TRF-PART-S3",
    })
    const d = await detail("S3")
    expect(d.status).toBe("Partial")
    expect(d.receivedAmount).toBe(150000)
    expect(d.balanceAmount).toBe(250000)
    await page.goto("/dashboard/finance/receivables")
    await expect(page.getByRole("row").filter({ hasText: fx.customers.financeThree.name })).toContainText("Partial")
    await close()
  })

  test("one payment split across 2 sales with Auto-allocate oldest first", async ({ browser }) => {
    // Oldest pending first: S1 (400,000) then S3 (250,000 left). 500,000 -> S1 400,000 + S3 100,000.
    const { page, close } = await pageAs(browser, "owner")
    await receivePayment(page, { companyName: co, method: "BankTransfer", amount: 500000, auto: true, reference: "TRF-SPLIT" })
    const s1 = await detail("S1")
    const s3 = await detail("S3")
    expect(s1.status).toBe("Received")
    expect(s1.balanceAmount).toBe(0)
    expect(s3.status).toBe("Partial")
    expect(s3.balanceAmount).toBe(150000)
    const receipt = await db.financeReceipt.findFirstOrThrow({
      where: { organizationId: fx.orgId, referenceNo: "TRF-SPLIT" },
      include: { allocations: true },
    })
    expect(receipt.allocations).toHaveLength(2)
    expect(receipt.allocations.map((a) => a.amount).sort((x, y) => x - y)).toEqual([100000, 400000])
    await close()
  })

  test("over-allocation is blocked", async ({ browser }) => {
    const before = await db.financeReceipt.count({ where: { organizationId: fx.orgId } })
    const { page, close } = await pageAs(browser, "owner")
    // 500,000 against a sale that only owes 400,000.
    const dialog = await fillReceiveDialog(page, {
      companyName: co,
      method: "BankTransfer",
      amount: 500000,
      allocations: { [inv.S4]: 500000 },
    })
    // 1) The browser's own max check on the allocation input stops the submit.
    const allocation = dialog.getByLabel(`Amount for ${inv.S4}`)
    await dialog.getByRole("button", { name: "Record payment" }).click()
    expect(await allocation.evaluate((el: HTMLInputElement) => el.validity.rangeOverflow)).toBe(true)
    await expect(dialog).toBeVisible()
    // 2) Even with browser validation bypassed, the form's own check refuses it.
    await dialog.locator("form").evaluate((f: HTMLFormElement) => { f.noValidate = true })
    await dialog.getByRole("button", { name: "Record payment" }).click()
    await expect(page.getByText(/exceeds/i).first()).toBeVisible()
    await expect(dialog).toBeVisible()
    expect(await db.financeReceipt.count({ where: { organizationId: fx.orgId } })).toBe(before)
    // A 300,000 payment with 400,000 allocated is unbalanced: submit stays disabled.
    await dialog.getByLabel("Amount (Rs.)").fill("300000")
    await dialog.getByLabel(`Amount for ${inv.S4}`).fill("400000")
    await expect(dialog.getByRole("button", { name: "Record payment" })).toBeDisabled()
    await expect(dialog.getByText(/over-allocated/i)).toBeVisible()
    expect(await db.financeReceipt.count({ where: { organizationId: fx.orgId } })).toBe(before)
    expect((await detail("S4")).balanceAmount).toBe(LOAN)
    await close()
  })

  test("a cheque receipt does not reduce the balance until Clear; a bounce after clear reverses exactly once", async ({ browser }) => {
    const { page, close } = await pageAs(browser, "owner")
    await receivePayment(page, {
      companyName: co,
      method: "CHEQUE",
      amount: LOAN,
      allocations: { [inv.S5]: LOAN },
      cheque: { number: "CHQ-S5-001", bank: "E2E Bank" },
    })
    // Received but not applied.
    let d = await detail("S5")
    expect(d.balanceAmount).toBe(LOAN)
    expect(d.status).toBe("Pending")
    const receipt = await db.financeReceipt.findFirstOrThrow({
      where: { organizationId: fx.orgId, incomingCheque: { chequeNumber: "CHQ-S5-001" } },
    })
    expect(receipt.status).toBe("PENDING")

    await page.goto("/dashboard/finance/receivables")
    await page.getByRole("tab", { name: "Received cheques" }).click()
    const chequeRow = page.getByRole("row").filter({ hasText: receipt.receiptNumber })
    await expect(chequeRow).toContainText("RECEIVED")
    await chequeRow.getByRole("button", { name: "Presented" }).click()
    await expect(chequeRow).toContainText("PRESENTED", { timeout: 60_000 })
    d = await detail("S5")
    expect(d.balanceAmount).toBe(LOAN) // still not reduced when presented

    await chequeRow.getByRole("button", { name: "Clear" }).click()
    await expect(chequeRow).toContainText("CLEARED", { timeout: 60_000 })
    d = await detail("S5")
    expect(d.status).toBe("Received")
    expect(d.balanceAmount).toBe(0)
    expect(d.receivedAmount).toBe(LOAN)

    // Returned after clearing: the money is taken back once.
    await chequeRow.getByRole("button", { name: "Returned" }).click()
    await page.getByRole("dialog").getByRole("button", { name: "Confirm" }).click()
    await expect(chequeRow).toContainText("BOUNCED", { timeout: 60_000 })
    d = await detail("S5")
    expect(d.status).toBe("Pending")
    expect(d.balanceAmount).toBe(LOAN)
    expect(d.receivedAmount).toBe(0) // exactly once: not negative
    // No action buttons remain, so it cannot bounce a second time.
    await expect(chequeRow.getByRole("button")).toHaveCount(0)
    await close()
  })

  test("a cheque bounced before clearing changes no balance", async ({ browser }) => {
    const { page, close } = await pageAs(browser, "owner")
    await receivePayment(page, {
      companyName: co,
      method: "CHEQUE",
      amount: LOAN,
      allocations: { [inv.S6]: LOAN },
      cheque: { number: "CHQ-S6-001", bank: "E2E Bank" },
    })
    const receipt = await db.financeReceipt.findFirstOrThrow({
      where: { organizationId: fx.orgId, incomingCheque: { chequeNumber: "CHQ-S6-001" } },
    })
    await page.goto("/dashboard/finance/receivables")
    await page.getByRole("tab", { name: "Received cheques" }).click()
    const row = page.getByRole("row").filter({ hasText: receipt.receiptNumber })
    await row.getByRole("button", { name: "Bounced" }).click()
    await page.getByRole("dialog").getByRole("button", { name: "Confirm" }).click()
    await expect(row).toContainText("BOUNCED", { timeout: 60_000 })
    const d = await detail("S6")
    expect(d.balanceAmount).toBe(LOAN)
    expect(d.receivedAmount).toBe(0)
    await close()
  })

  test("Reverse on a transfer receipt restores the balances (once)", async ({ browser }) => {
    const { page, close } = await pageAs(browser, "owner")
    await page.goto("/dashboard/finance/receivables")
    await page.getByRole("tab", { name: "Receipts" }).click()
    const receipt = await db.financeReceipt.findFirstOrThrow({ where: { organizationId: fx.orgId, referenceNo: "TRF-FULL-S2" } })
    const row = page.getByRole("row").filter({ hasText: receipt.receiptNumber })
    await row.getByRole("button", { name: "Reverse" }).click()
    await page.getByRole("dialog").getByLabel("Reason (optional)").fill("E2E reversal")
    await page.getByRole("dialog").getByRole("button", { name: "Confirm" }).click()
    await expect(row).toContainText("REVERSED", { timeout: 60_000 })
    const d = await detail("S2")
    expect(d.status).toBe("Pending")
    expect(d.balanceAmount).toBe(LOAN)
    expect(d.receivedAmount).toBe(0)
    await expect(row.getByRole("button", { name: "Reverse" })).toHaveCount(0)
    await close()
  })

  test("audit log entries exist for each of these actions", async ({ browser }) => {
    // 5 receipts recorded (S2 full, S3 partial, split, S5 cheque, S6 cheque); the blocked attempt left none.
    expect(await auditCount("FINANCE_RECEIPT_RECORDED")).toBe(5)
    expect(await auditCount("FINANCE_RECEIPT_REVERSED")).toBe(1)
    expect(await auditCount("FINANCE_CHEQUE_PRESENTED")).toBe(1)
    expect(await auditCount("FINANCE_CHEQUE_CLEARED")).toBe(1)
    expect(await auditCount("FINANCE_CHEQUE_BOUNCED")).toBe(2)

    const { page, close } = await pageAs(browser, "owner")
    for (const [action, label] of [
      ["FINANCE_RECEIPT_RECORDED", "Finance payment received"],
      ["FINANCE_RECEIPT_REVERSED", "Finance payment reversed"],
      ["FINANCE_CHEQUE_CLEARED", "Finance cheque cleared"],
      ["FINANCE_CHEQUE_BOUNCED", "Finance cheque bounced"],
    ] as const) {
      await page.goto(`/dashboard/settings/audit-logs?action=${action}`)
      await expect(page.getByRole("cell", { name: label }).first()).toBeVisible()
    }
    await close()
  })
})
