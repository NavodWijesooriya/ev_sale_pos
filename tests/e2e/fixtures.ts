import fs from "node:fs"
import path from "node:path"
import { test as base, expect, type Browser, type Page } from "@playwright/test"
import type { E2EFixtures, RoleKey } from "./seed"

export { expect }

export function loadFixtures(): E2EFixtures {
  return JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "tests/e2e/.auth/fixtures.json"), "utf8"))
}

export function authPath(role: RoleKey) {
  return path.resolve(process.cwd(), `tests/e2e/.auth/${role}.json`)
}

/** Open a page signed in as the given role (fresh browser context). */
export async function pageAs(browser: Browser, role: RoleKey): Promise<{ page: Page; close: () => Promise<void> }> {
  const context = await browser.newContext({ storageState: authPath(role), baseURL: "http://localhost:3001" })
  const page = await context.newPage()
  return { page, close: () => context.close() }
}

export const test = base
