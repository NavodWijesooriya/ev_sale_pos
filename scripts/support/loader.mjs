// Test support: lets the real server actions (app/actions/*.ts) run under plain Node, outside Next.js.
// Maps the "@/" alias, stubs next/cache and lib/auth (the session comes from globalThis.__TEST_SESSION__),
// and swaps lib/prisma for a client that retries dropped database connections.
// ESM resolve/load hooks so the real server-action .ts files can run under plain Node:
//  - "@/..." path alias -> project root
//  - extensionless relative imports -> .ts
//  - "next/cache" -> no-op stub
//  - "@/lib/auth" -> test auth stub (session comes from globalThis.__TEST_SESSION__)
//  - "@prisma/client" -> ESM shim re-exporting every runtime export of the CJS package
import { createRequire } from "node:module"
import { existsSync } from "node:fs"
import { pathToFileURL, fileURLToPath } from "node:url"
import path from "node:path"

const ROOT = process.env.PROJECT_ROOT ?? process.cwd()
const HARNESS = path.dirname(fileURLToPath(import.meta.url))
const require = createRequire(path.join(ROOT, "package.json"))

function tryTs(base) {
  for (const candidate of [base, base + ".ts", base + ".tsx", path.join(base, "index.ts")]) {
    if (existsSync(candidate) && !candidate.endsWith(path.sep)) {
      try {
        if (require("node:fs").statSync(candidate).isFile()) return candidate
      } catch {}
    }
  }
  return null
}

export async function resolve(specifier, context, nextResolve) {
  if (specifier === "next/cache") return { url: pathToFileURL(path.join(HARNESS, "stub-cache.mjs")).href, shortCircuit: true }
  if (specifier === "@/lib/auth") return { url: pathToFileURL(path.join(HARNESS, "stub-auth.mjs")).href, shortCircuit: true }
  if (specifier === "@/lib/prisma") return { url: pathToFileURL(path.join(HARNESS, "stub-prisma.mjs")).href, shortCircuit: true }
  if (specifier === "@prisma/client") return { url: "test-shim:prisma", shortCircuit: true }
  if (specifier.startsWith("@/")) {
    const file = tryTs(path.join(ROOT, specifier.slice(2)))
    if (file) return { url: pathToFileURL(file).href, shortCircuit: true }
  }
  if ((specifier.startsWith("./") || specifier.startsWith("../")) && context.parentURL?.startsWith("file:")) {
    const parent = fileURLToPath(context.parentURL)
    const file = tryTs(path.resolve(path.dirname(parent), specifier))
    if (file) return { url: pathToFileURL(file).href, shortCircuit: true }
  }
  return nextResolve(specifier, context)
}

export async function load(url, context, nextLoad) {
  if (url === "test-shim:prisma") {
    const pkg = require("@prisma/client")
    const names = Object.keys(pkg).filter((k) => /^[A-Za-z_$][\w$]*$/.test(k) && k !== "default")
    const source =
      `import { createRequire } from "node:module";\n` +
      `const pkg = createRequire(${JSON.stringify(path.join(ROOT, "package.json"))})("@prisma/client");\n` +
      names.map((n) => `export const ${n} = pkg.${n};`).join("\n") +
      `\nexport default pkg;\n`
    return { format: "module", source, shortCircuit: true }
  }
  return nextLoad(url, context)
}
