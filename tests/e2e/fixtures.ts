import fs from "node:fs"
import path from "node:path"
import { test as base, expect, type Browser, type Page } from "@playwright/test"
import type { E2EFixtures, RoleKey } from "./seed"

export { expect }

const AUTH_DIR = path.resolve(process.cwd(), "tests/e2e/.auth")
const BASE_URL = `http://localhost:${process.env.E2E_PORT ?? 3001}`
/** Saved logins older than this are replaced: Supabase access tokens are short-lived and the saved refresh token is single-use. */
const MAX_AGE_MS = 20 * 60 * 1000

export function loadFixtures(): E2EFixtures {
  return JSON.parse(fs.readFileSync(path.join(AUTH_DIR, "fixtures.json"), "utf8"))
}

export function authPath(role: RoleKey) {
  return path.join(AUTH_DIR, `${role}.json`)
}

/** Sign in through the real login page and save the session for `role`. */
export async function loginAndSave(browser: Browser, role: RoleKey) {
  const user = loadFixtures().users[role]
  const context = await browser.newContext({ baseURL: BASE_URL })
  const page = await context.newPage()
  // The platform operator signs in at the admin portal; the workspace login refuses that account.
  const platform = role === "platformAdmin"
  await page.goto(platform ? "/admin-portal/login" : "/login")
  await page.getByLabel(platform ? "Administrator email" : "Work email").fill(user.email)
  await page.getByRole("textbox", { name: "Password" }).fill(user.password)
  await page.getByRole("button", { name: /sign in|log in|continue/i }).click()
  await page.waitForURL(platform ? /\/admin-portal(?!\/login)/ : /\/dashboard/, { timeout: 90_000 })
  await context.storageState({ path: authPath(role) })
  await context.close()
}

/** Open a page signed in as the given role (fresh browser context), renewing an old saved login first. */
export async function pageAs(browser: Browser, role: RoleKey): Promise<{ page: Page; close: () => Promise<void> }> {
  const file = authPath(role)
  const age = Date.now() - fs.statSync(file).mtimeMs
  if (age > MAX_AGE_MS) await loginAndSave(browser, role)
  const context = await browser.newContext({ storageState: file, baseURL: BASE_URL })
  const page = await context.newPage()
  return { page, close: () => context.close() }
}

export const test = base
