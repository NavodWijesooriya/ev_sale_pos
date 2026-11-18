import type { Prisma } from "@prisma/client"

/**
 * Next batch ("round") number for ONE dealership: JM 01, JM 02 ...
 * Batches are counted per organization, so two dealerships never share a sequence or its
 * 99-batch limit. Call lockGRNNumberSequence first, inside the same transaction.
 */
export async function generateNextGRNNumber(client: Prisma.TransactionClient, organizationId: string) {
  const existingGRNs = await client.gRN.findMany({
    where: { organizationId, grnNumber: { startsWith: "JM " } },
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

/** Serialises batch-number generation per dealership (other dealerships are not blocked). */
export async function lockGRNNumberSequence(transaction: Prisma.TransactionClient, organizationId: string) {
  await transaction.$executeRaw`SELECT pg_advisory_xact_lock(874230601, hashtext(${organizationId}))`
}
