// Test-only Prisma client that retries operations (and whole transactions) when the remote database
// connection drops. It stands in for "@/lib/prisma" while the harness runs; product code is unchanged.
import { createRequire } from "node:module"
const { PrismaClient } = createRequire((process.env.PROJECT_ROOT ?? process.cwd()) + "/package.json")("@prisma/client")

const TRANSIENT = /Can't reach database server|P1001|P1002|P1008|P1017|Server has closed the connection|Connection (terminated|reset|refused)|ECONNRESET|ETIMEDOUT|terminating connection|Timed out fetching a new connection/i
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function withRetry(fn, label) {
  let last
  for (let attempt = 1; attempt <= 6; attempt++) {
    try {
      return await fn()
    } catch (error) {
      last = error
      if (!TRANSIENT.test(String(error?.message ?? error) + String(error?.code ?? ""))) throw error
      await sleep(attempt * 1500)
    }
  }
  throw last
}

const base = new PrismaClient({ transactionOptions: { maxWait: 10_000, timeout: 30_000 } })
const extended = base.$extends({
  query: {
    $allOperations({ args, query }) {
      return withRetry(() => query(args))
    },
  },
})

export const prisma = new Proxy(extended, {
  get(target, prop, receiver) {
    if (prop === "$transaction") {
      return (arg, options) =>
        typeof arg === "function"
          ? withRetry(() => target.$transaction(arg, options))
          : withRetry(() => target.$transaction(arg, options))
    }
    return Reflect.get(target, prop, receiver)
  },
})
