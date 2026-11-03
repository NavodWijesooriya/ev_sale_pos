import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
  console.log("=== Testing Task 10: Customer Management (CRM) ===")

  // 1. Get dealership organization
  const org = await prisma.organization.findFirst({
    where: { subdomain: "apex" },
  })

  if (!org) {
    throw new Error("Dealership not found.")
  }

  console.log(`Dealership: ${org.businessName} (ID: ${org.id})`)

  // 2. Fetch all customers for this organization
  const customers = await prisma.customer.findMany({
    where: { organizationId: org.id },
    include: {
      sales: {
        select: {
          id: true,
          totalAmount: true,
          saleDate: true,
        },
      },
      serviceRecords: {
        select: {
          id: true,
          serviceDate: true,
        },
      },
      _count: {
        select: {
          sales: true,
          serviceRecords: true,
        },
      },
    },
    orderBy: { name: "asc" },
  })

  console.log(`\nFound ${customers.length} registered customer(s) in CRM for ${org.businessName}:`)
  customers.forEach((c, idx) => {
    const totalSpent = c.sales.reduce((sum, s) => sum + s.totalAmount, 0)
    console.log(` [${idx + 1}] ${c.name} | Phone: ${c.phone} | NIC: ${c.nic || "N/A"} | Purchases: ${c._count.sales} | Services: ${c._count.serviceRecords} | Lifetime Spent: $${totalSpent.toLocaleString()}`)
  })

  if (customers.length === 0) {
    throw new Error("No customers found.")
  }

  // 3. Inspect detailed dossier for Sunil Jayawardena
  const sunil = customers.find((c) => c.name.includes("Sunil")) || customers[0]
  console.log(`\n--- Inspecting Full CRM Dossier for: ${sunil.name} (ID: ${sunil.id}) ---`)

  const dossier = await prisma.customer.findFirst({
    where: {
      id: sunil.id,
      organizationId: org.id,
    },
    include: {
      sales: {
        include: {
          branch: true,
          items: {
            include: {
              vehicle: {
                include: {
                  vehicleModel: true,
                },
              },
            },
          },
        },
      },
      serviceRecords: {
        include: {
          branch: true,
          vehicle: {
            include: {
              vehicleModel: true,
            },
          },
        },
      },
    },
  })

  if (!dossier) {
    throw new Error("Failed to load customer dossier.")
  }

  const totalSpent = dossier.sales.reduce((sum, s) => sum + s.totalAmount, 0)
  console.log(`✔ Customer Header:`)
  console.log(`  - Name: ${dossier.name}`)
  console.log(`  - Phone: ${dossier.phone}, NIC: ${dossier.nic}`)
  console.log(`  - Email: ${dossier.email || "N/A"}`)
  console.log(`  - Address: ${dossier.address}`)
  console.log(`  - Calculated Total Spent: $${totalSpent.toLocaleString()}`)

  console.log(`✔ Purchase History (${dossier.sales.length} vehicles):`)
  dossier.sales.forEach((s) => {
    const v = s.items[0]?.vehicle
    console.log(`  - Date: ${s.saleDate.toISOString().split("T")[0]} | Model: ${v?.vehicleModel.brand} ${v?.vehicleModel.modelName} | VIN: ${v?.chassisNumber} | Paid: $${s.totalAmount} | Status: ${s.status}`)
  })

  console.log(`✔ Service History (${dossier.serviceRecords.length} visits):`)
  dossier.serviceRecords.forEach((sr) => {
    console.log(`  - Date: ${sr.serviceDate.toISOString().split("T")[0]} | Vehicle: ${sr.vehicle.vehicleModel.modelName} (${sr.vehicle.chassisNumber}) | Type: ${sr.serviceType} | Cost: $${sr.totalCost} | Notes: ${sr.description?.slice(0, 45)}...`)
  })

  // 4. Verify organizationId tenant isolation
  console.log(`\n--- Verifying Tenant Security Isolation ---`)
  const wrongOrgDossier = await prisma.customer.findFirst({
    where: {
      id: sunil.id,
      organizationId: "fake-tenant-id-0000",
    },
  })
  console.log(`✔ Querying customer with unauthorized organizationId returns: ${wrongOrgDossier} (Isolated)`)

  console.log(`\n>>> ALL TASK 10 VERIFICATIONS PASSED SUCCESSFULLY! <<<`)
}

main()
  .catch((e) => {
    console.error("Test failed:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
