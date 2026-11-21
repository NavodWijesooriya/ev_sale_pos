import fs from "node:fs"
import path from "node:path"
import { chromium, type FullConfig } from "@playwright/test"
import { disconnectSeed, seedE2E, type RoleKey } from "./seed"

export const AUTH_DIR = path.resolve(process.cwd(), "tests/e2e/.auth")
export const ROLES: RoleKey[] = [
  "owner",
  "branchManager",
  "cashier",
  "receivablesStaff",
  "noAccessStaff",
  "supplierViewer",
  "depositStaffA",
  "depositStaffB",
]

export default async function globalSetup(config: FullConfig) {
  fs.mkdirSync(AUTH_DIR, { recursive: true })
  // Debug shortcut: reuse the previous seed and saved logins (state from the last run is NOT reset).
  if (process.env.E2E_SKIP_SEED === "1" && fs.existsSync(path.join(AUTH_DIR, "fixtures.json"))) return
  const fixtures = await seedE2E()
  await disconnectSeed()

  const baseURL = config.projects[0].use.baseURL as string
  const browser = await chromium.launch()
  try {
    for (const role of ROLES) {
      const context = await browser.newContext({ baseURL })
      const page = await context.newPage()
      await page.goto("/login")
      await page.getByLabel("Work email").fill(fixtures.users[role].email)
      await page.getByRole("textbox", { name: "Password" }).fill(fixtures.users[role].password)
      await page.getByRole("button", { name: /sign in|log in|continue/i }).click()
      await page.waitForURL(/\/dashboard/, { timeout: 60_000 })
      await context.storageState({ path: path.join(AUTH_DIR, `${role}.json`) })
      await context.close()
    }
  } finally {
    await browser.close()
  }
}
