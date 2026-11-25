import type { Page } from "@playwright/test"
import { test, expect, loadFixtures, pageAs } from "../fixtures"
import { db } from "../db"
import { chooseOption } from "../helpers"

const fx = loadFixtures()
const C = fx.customers

async function seedAdvance(amount: number) {
  const staff = await db.user.findFirstOrThrow({ where: { organizationId: fx.orgId, role: "OrgAdmin" } })
  return db.advancePayment.create({
    data: {
      organizationId: fx.orgId,
      customerId: C.advFrom.id,
      nicNumber: C.advFrom.nic,
      bikeModel: "General advance",
      amount,
      branchId: fx.branchA.id,
      staffId: staff.id,
      paymentMethod: "Cash",
      paymentDetails: "Cash",
      status: "PENDING",
    },
  })
}

async function openTransferDialog(page: Page, customerName: string) {
  await page.goto("/dashboard/sales/advances")
  const row = page.getByRole("row").filter({ hasText: customerName }).filter({ hasText: "Pending" })
  await row.getByRole("button", { name: "Open menu" }).click()
  await page.getByRole("menuitem", { name: "Transfer Advance" }).click()
  const dialog = page.getByRole("dialog", { name: "Transfer Advance Balance" })
  await expect(dialog).toBeVisible()
  return dialog
}

test.describe.serial("advance transfer from the table dialog needs NIC verification", () => {
  let advanceId = ""

  test("the server refuses a transfer to another customer without a matching NIC on both sides", async ({ browser }) => {
    const advance = await seedAdvance(40000)
    advanceId = advance.id
    const { page, close } = await pageAs(browser, "owner")
    const dialog = await openTransferDialog(page, C.advFrom.name)
    await chooseOption(page, dialog.getByRole("combobox", { name: "Destination Customer" }), new RegExp(C.advTo.name))
    // The NIC verification fields appear once the destination is another customer.
    await expect(dialog.getByLabel(/Advance holder NIC/)).toBeVisible()
    await expect(dialog.getByLabel("Receiving customer NIC")).toBeVisible()

    const submit = dialog.getByRole("button", { name: "Confirm Advance Transfer" })
    const unchanged = async () => {
      const row = await db.advancePayment.findUniqueOrThrow({ where: { id: advanceId } })
      expect(row.status).toBe("PENDING")
      expect(row.amount).toBe(40000)
      expect(await db.advanceTransfer.count({ where: { fromAdvanceId: advanceId } })).toBe(0)
    }

    // 1. Nothing typed.
    await submit.click()
    await expect(page.getByText(/advance holder's full NIC/i).first()).toBeVisible({ timeout: 60_000 })
    await unchanged()

    // 2. The holder's NIC is right, the receiving NIC is wrong.
    await dialog.getByLabel(/Advance holder NIC/).fill(C.advFrom.nic)
    await dialog.getByLabel("Receiving customer NIC").fill("910999999")
    await submit.click()
    await expect(page.getByText(/receiving customer's full NIC/i).first()).toBeVisible({ timeout: 60_000 })
    await unchanged()

    // 3. The receiving NIC is right, the holder's NIC is somebody else's.
    await dialog.getByLabel(/Advance holder NIC/).fill(C.advTo.nic)
    await dialog.getByLabel("Receiving customer NIC").fill(C.advTo.nic)
    await submit.click()
    await expect(page.getByText(/advance holder's full NIC/i).first()).toBeVisible({ timeout: 60_000 })
    await unchanged()

    // 4. Too short to verify anyone.
    await dialog.getByLabel(/Advance holder NIC/).fill("910")
    await dialog.getByLabel("Receiving customer NIC").fill("910")
    await submit.click()
    await expect(page.getByText(/advance holder's full NIC/i).first()).toBeVisible({ timeout: 60_000 })
    await unchanged()

    // 5. A long part of each NIC is still not the NIC: only the full NIC verifies.
    await dialog.getByLabel(/Advance holder NIC/).fill(C.advFrom.nic.slice(0, -1))
    await dialog.getByLabel("Receiving customer NIC").fill(C.advTo.nic.slice(0, -1))
    await submit.click()
    await expect(page.getByText(/advance holder's full NIC/i).first()).toBeVisible({ timeout: 60_000 })
    await unchanged()

    // 6. The holder is right but only part of the receiving NIC was typed.
    await dialog.getByLabel(/Advance holder NIC/).fill(C.advFrom.nic)
    await dialog.getByLabel("Receiving customer NIC").fill(C.advTo.nic.slice(0, -1))
    await submit.click()
    await expect(page.getByText(/receiving customer's full NIC/i).first()).toBeVisible({ timeout: 60_000 })
    await unchanged()
    await close()
  })

  test("with both NICs verified the advance moves and the history is kept", async ({ browser }) => {
    const { page, close } = await pageAs(browser, "owner")
    const dialog = await openTransferDialog(page, C.advFrom.name)
    await chooseOption(page, dialog.getByRole("combobox", { name: "Destination Customer" }), new RegExp(C.advTo.name))
    // The full NIC verifies even in lower case or with spaces (it is normalised before comparing).
    await dialog.getByLabel(/Advance holder NIC/).fill(C.advFrom.nic.toLowerCase())
    await dialog.getByLabel("Receiving customer NIC").fill(` ${C.advTo.nic.slice(0, 4)} ${C.advTo.nic.slice(4).toLowerCase()} `)
    await dialog.getByRole("button", { name: "Confirm Advance Transfer" }).click()

    await expect
      .poll(async () => (await db.advancePayment.findUniqueOrThrow({ where: { id: advanceId } })).status, { timeout: 90_000 })
      .toBe("TRANSFERRED")
    const transfer = await db.advanceTransfer.findFirstOrThrow({ where: { fromAdvanceId: advanceId } })
    expect(transfer.transferAmount).toBe(40000)
    expect(transfer.toCustomerId).toBe(C.advTo.id)
    const received = await db.advancePayment.findUniqueOrThrow({ where: { id: transfer.toAdvanceId! } })
    expect(received.customerId).toBe(C.advTo.id)
    expect(received.amount).toBe(40000)
    expect(received.status).toBe("PENDING")
    await close()
  })

  test("re-allocating an advance within the same customer needs no NIC", async ({ browser }) => {
    const advance = await seedAdvance(15000)
    const { page, close } = await pageAs(browser, "owner")
    const dialog = await openTransferDialog(page, C.advFrom.name)
    await expect(dialog.getByLabel(/Advance holder NIC/)).toHaveCount(0)
    // Same customer, different vehicle: allowed without NIC verification.
    await chooseOption(page, dialog.getByRole("combobox", { name: /Destination Vehicle/ }), /E2E-STOCK-ADV-03/)
    await dialog.getByRole("button", { name: "Confirm Advance Transfer" }).click()
    await expect
      .poll(async () => (await db.advancePayment.findUniqueOrThrow({ where: { id: advance.id } })).status, { timeout: 90_000 })
      .toBe("TRANSFERRED")
    await close()
  })
})
