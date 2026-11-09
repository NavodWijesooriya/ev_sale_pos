import type { Prisma } from "@prisma/client"

export async function generateNextGRNNumber(client: Prisma.TransactionClient) {
  const existingGRNs = await client.gRN.findMany({
    where: { grnNumber: { startsWith: "JM " } },
    select: { grnNumber: true },
  })

  const highestNumber = existingGRNs.reduce((highest, grn) => {
    const match = /^JM (\d{2})$/.exec(grn.grnNumber)
    if (!match) return highest
    const number = Number(match[1])
    return Number.isSafeInteger(number) ? Math.max(highest, number) : highest
  }, 0)

  if (highestNumber >= 99) {
    throw new Error("The two-digit GRN batch sequence is exhausted.")
  }

  return `JM ${String(highestNumber + 1).padStart(2, "0")}`
}

export async function lockGRNNumberSequence(transaction: Prisma.TransactionClient) {
  await transaction.$executeRaw`SELECT pg_advisory_xact_lock(874230601)`
}
