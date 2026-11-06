import type { Prisma } from "@prisma/client"

type CustomerClient = Pick<Prisma.TransactionClient, "customer">

export async function generateNextCustomerCrn(client: CustomerClient) {
  const customers = await client.customer.findMany({
    where: { crn: { startsWith: "CRN-" } },
    select: { crn: true },
  })

  const highestCrnNumber = customers.reduce((highest, customer) => {
    const match = customer.crn?.match(/^CRN-(\d+)$/)
    if (!match) return highest

    const number = Number(match[1])
    return Number.isSafeInteger(number) ? Math.max(highest, number) : highest
  }, 1000)

  return `CRN-${highestCrnNumber + 1}`
}
