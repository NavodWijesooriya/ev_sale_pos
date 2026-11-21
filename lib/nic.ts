import { Prisma } from "@prisma/client"

/**
 * NIC handling shared by every action that writes Customer.nic.
 *
 * Sri Lankan NICs are 9 digits + V/X (old) or 12 digits (new). The field also holds passport numbers,
 * so values that are not in a Sri Lankan format are normalised and accepted, not rejected.
 */

/** Trim, remove all whitespace and upper-case. Empty input becomes null. */
export function normalizeNic(value: string | null | undefined): string | null {
  const cleaned = (value ?? "").replace(/\s+/g, "").toUpperCase()
  return cleaned ? cleaned : null
}

export function isSriLankanNic(value: string): boolean {
  return /^(\d{9}[VX]|\d{12})$/.test(value)
}

type NicClient = {
  customer: {
    findFirst: (args: {
      where: { organizationId: string; nic: string; id?: { not: string } }
      select: { id: true; name: true; phone: true }
    }) => Promise<{ id: string; name: string; phone: string } | null>
  }
}

export function nicConflictMessage(existing: { name: string; phone: string }): string {
  return `A customer with this NIC already exists: ${existing.name}, ${existing.phone}`
}

/** The customer already holding this NIC in the organization (optionally ignoring one customer). */
export async function findNicConflict(
  client: NicClient,
  organizationId: string,
  nic: string,
  excludeCustomerId?: string,
) {
  return client.customer.findFirst({
    where: { organizationId, nic, ...(excludeCustomerId ? { id: { not: excludeCustomerId } } : {}) },
    select: { id: true, name: true, phone: true },
  })
}

/** True when the error is the (organizationId, nic) unique-constraint violation. */
export function isNicUniqueViolation(error: unknown): boolean {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") return false
  const target = (error.meta as { target?: unknown } | undefined)?.target
  const fields = Array.isArray(target) ? target.join(",") : String(target ?? "")
  return /nic/i.test(fields)
}

export const NIC_RACE_MESSAGE = "A customer with this NIC already exists."
