import { expect, type Page } from "@playwright/test"

const today = () => new Date().toISOString().slice(0, 10)

export interface ReceiveOptions {
  method: "BankTransfer" | "CHEQUE" | "Cash"
  amount: number
  /** Invoice number -> amount to allocate. Omit and set `auto` to use "Auto-allocate oldest first". */
  allocations?: Record<string, number>
  auto?: boolean
  companyName: string
  cheque?: { number: string; bank: string }
  reference?: string
}

/** Open the Receive payment dialog from the page header and fill it (does not submit). */
export async function fillReceiveDialog(page: Page, o: ReceiveOptions) {
  await page.goto("/dashboard/finance/receivables")
  await page.getByRole("button", { name: "Receive payment", exact: true }).click()
  const dialog = page.getByRole("dialog", { name: "Receive finance payment" })
  await expect(dialog).toBeVisible()
  await dialog.getByLabel("Finance company").selectOption({ label: o.companyName })
  await dialog.getByLabel("Payment method").selectOption(o.method)
  await dialog.getByLabel("Amount (Rs.)").fill(String(o.amount))
  await dialog.getByLabel("Payment date").fill(today())
  if (o.method === "CHEQUE" && o.cheque) {
    await dialog.getByLabel("Cheque number").fill(o.cheque.number)
    await dialog.getByLabel("Bank").fill(o.cheque.bank)
    await dialog.getByLabel("Cheque date").fill(today())
  } else if (o.reference) {
    await dialog.getByLabel(/Reference/).fill(o.reference)
  }
  if (o.auto) {
    await dialog.getByRole("button", { name: "Auto-allocate oldest first" }).click()
  }
  for (const [invoice, amount] of Object.entries(o.allocations ?? {})) {
    await dialog.getByLabel(`Amount for ${invoice}`).fill(String(amount))
  }
  return dialog
}

/** Fill and submit the dialog; waits for the success toast. */
export async function receivePayment(page: Page, o: ReceiveOptions) {
  const dialog = await fillReceiveDialog(page, o)
  await dialog.getByRole("button", { name: "Record payment" }).click()
  await expect(page.getByText(/recorded|received/i).first()).toBeVisible()
  await expect(dialog).toBeHidden()
}
