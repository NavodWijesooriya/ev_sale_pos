import { Prisma, PrismaClient } from "@prisma/client"

/**
 * One PrismaClient per server instance (cached on globalThis in development so hot reloads do not open new
 * connection pools). On serverless (Vercel) each instance should hold a single connection: set
 * DATABASE_URL to the transaction pooler with `?pgbouncer=true&connection_limit=1` and keep DIRECT_URL for
 * migrations only. See the README, "Database connection".
 */

/** Connection problems worth a second try: server unreachable (P1001) or connection closed (P1017). */
const TRANSIENT_CODES = new Set(["P1001", "P1017"])

/** Read operations only. Writes are never retried: a repeated write could be applied twice. */
const READ_OPERATIONS = new Set([
  "findUnique",
  "findUniqueOrThrow",
  "findFirst",
  "findFirstOrThrow",
  "findMany",
  "count",
  "aggregate",
  "groupBy",
])

const RETRY_DELAYS_MS = [300, 900, 2000]

export function isTransientConnectionError(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError) return TRANSIENT_CODES.has(error.code)
  if (error instanceof Prisma.PrismaClientInitializationError) {
    // The first connection attempt reports an initialization error, often without an error code.
    return TRANSIENT_CODES.has(error.errorCode ?? "") || /Can't reach database server|closed the connection/i.test(error.message)
  }
  return false
}

function createClient() {
  const base = new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
    // Financial actions run many queries per transaction against a remote pooled database.
    // Prisma's 5s default aborts them mid-way (P2028) when the network is slow, so allow longer.
    transactionOptions: { maxWait: 10_000, timeout: 30_000 },
  })

  return base.$extends({
    name: "retry-transient-reads",
    query: {
      async $allOperations(params) {
        const { operation, args, query } = params
        if (!READ_OPERATIONS.has(operation)) return query(args)
        // Never retry inside an interactive transaction: if its connection dropped, the transaction is gone.
        const inTransaction = Boolean((params as unknown as { __internalParams?: { transaction?: unknown } }).__internalParams?.transaction)
        if (inTransaction) return query(args)

        for (let attempt = 0; ; attempt++) {
          try {
            return await query(args)
          } catch (error) {
            if (attempt >= RETRY_DELAYS_MS.length || !isTransientConnectionError(error)) throw error
            await new Promise((resolve) => setTimeout(resolve, RETRY_DELAYS_MS[attempt]))
          }
        }
      },
    },
  })
}

// The extension only adds retry behaviour (no new models or methods), so the client is exposed with the plain
// PrismaClient type: helpers typed with Prisma.TransactionClient keep accepting it.
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined }

export const prisma: PrismaClient = globalForPrisma.prisma ?? (createClient() as unknown as PrismaClient)

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma
}
