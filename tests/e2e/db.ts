/**
 * Prisma client for the e2e suite (seeding and read-only assertions). The remote pooler occasionally
 * drops connections, so transient failures are retried.
 */
import path from "node:path"
import dotenv from "dotenv"
import prismaClient from "@prisma/client"

dotenv.config({ path: path.resolve(process.cwd(), ".env") })

const { PrismaClient } = prismaClient

const TRANSIENT = /Can't reach database server|P1001|P1002|P1008|P1017|Server has closed the connection|Connection (terminated|reset|refused)|ECONNRESET|ETIMEDOUT|terminating connection|Timed out fetching a new connection/i

async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  let last: unknown
  for (let attempt = 1; attempt <= 6; attempt++) {
    try {
      return await fn()
    } catch (error) {
      last = error
      if (!TRANSIENT.test(String((error as Error)?.message ?? error))) throw error
      await new Promise((r) => setTimeout(r, attempt * 1500))
    }
  }
  throw last
}

export const db = new PrismaClient().$extends({
  query: { $allOperations: ({ args, query }) => withRetry(() => query(args)) },
})
