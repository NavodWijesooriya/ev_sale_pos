import { expect, type Page } from "@playwright/test"

export const today = () => new Date().toISOString().slice(0, 10)

export interface PayOptions {
  supplierName: string
  method: "Cash" | "BankTransfer" | "CHEQUE" | "ADVANCE"
  amount?: number
  /** GRN number -> amount to allocate. Use `auto` for "Auto-allocate oldest first". */
  allocations?: Record<string, number>
  auto?: boolean
  reference?: string
  cheque?: { number: string; bank: string }
}

/** Open the Make supplier payment dialog and fill it in (does not submit). */
export async function fillPayDialog(page: Page, o: PayOptions) {
  await page.goto("/dashboard/suppliers/payments")
  await page.getByRole("button", { name: /Make payment/ }).first().click()
  const dialog = page.getByRole("dialog", { name: "Make supplier payment" })
  await expect(dialog).toBeVisible()
  await dialog.getByLabel("Supplier").selectOption({ label: o.supplierName })
  await dialog.getByLabel("Payment method").selectOption(o.method)
  if (o.method !== "ADVANCE") {
    await dialog.getByLabel("Amount (Rs.)").fill(String(o.amount ?? 0))
    await dialog.getByLabel("Payment date").fill(today())
  }
  if (o.method === "CHEQUE" && o.cheque) {
    await dialog.getByLabel("Cheque number").fill(o.cheque.number)
    await dialog.getByLabel("Bank").fill(o.cheque.bank)
    await dialog.getByLabel("Cheque date").fill(today())
  } else if (o.method === "BankTransfer" && o.reference) {
    await dialog.getByLabel("Transfer reference").fill(o.reference)
  }
  if (o.auto) await dialog.getByRole("button", { name: "Auto-allocate oldest first" }).click()
  for (const [grn, amount] of Object.entries(o.allocations ?? {})) {
    await dialog.getByLabel(`Amount for ${grn}`).fill(String(amount))
  }
  return dialog
}

/** Fill and submit; waits for the dialog to close (success). */
export async function paySupplier(page: Page, o: PayOptions) {
  const dialog = await fillPayDialog(page, o)
  await dialog.getByRole("button", { name: o.method === "ADVANCE" ? "Apply advance" : "Record payment" }).click()
  await expect(dialog).toBeHidden({ timeout: 60_000 })
}
