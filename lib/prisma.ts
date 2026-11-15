import { PrismaClient } from "@prisma/client"

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
    // Financial actions run many queries per transaction against a remote pooled database.
    // Prisma's 5s default aborts them mid-way (P2028) when the network is slow, so allow longer.
    transactionOptions: { maxWait: 10_000, timeout: 30_000 },
  })

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma
}

