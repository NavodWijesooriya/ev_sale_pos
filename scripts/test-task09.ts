import { PrismaClient, ServiceType, VehicleStatus } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
  console.log("=== Testing Task 09: After-Sales Service & Warranty Management ===")

  // 1. Get dealership organization, branch, and a sold vehicle
  const org = await prisma.organization.findFirst({
    where: { subdomain: "apex" },
    include: {
      branches: true,
      customers: true,
    },
  })

  if (!org) {
    throw new Error("Dealership not found.")
  }

  const branch = org.branches[0]
  console.log(`Dealership: ${org.businessName}`)
  console.log(`Branch: ${branch.name}`)

  // Find sold vehicles for this organization
  const soldVehicles = await prisma.vehicle.findMany({
    where: {
      organizationId: org.id,
      status: VehicleStatus.Sold,
    },
    include: {
      vehicleModel: true,
      saleItems: {
        include: {
          sale: {
            include: {
              customer: true,
            },
          },
        },
        take: 1,
      },
    },
  })

  console.log(`Found ${soldVehicles.length} Sold Vehicle(s) in database.`)

  if (soldVehicles.length === 0) {
    throw new Error("No sold vehicles found to test service records on.")
  }

  const testVehicle = soldVehicles[0]
  const customer = testVehicle.saleItems[0]?.sale?.customer || org.customers[0]

  console.log(`Testing with Sold Vehicle:`)
  console.log(`  - Model: ${testVehicle.vehicleModel.brand} ${testVehicle.vehicleModel.modelName}`)
  console.log(`  - VIN: ${testVehicle.chassisNumber}`)
  console.log(`  - Battery Serial: ${testVehicle.batterySerialNumber || "N/A"}`)
  console.log(`  - Customer: ${customer.name} (${customer.phone})`)

  // 2. Test 1: Log a Free Service
  console.log(`\n--- Test 1: Logging Free Periodic Service ---`)
  const freeService = await prisma.serviceRecord.create({
    data: {
      organizationId: org.id,
      branchId: branch.id,
      vehicleId: testVehicle.id,
      customerId: customer.id,
      serviceType: ServiceType.Free,
      description: "First 5,000 km complimentary check. Inspected brake pads, tire pressure balanced, wiper fluid topped up.",
      totalCost: 0,
      nextServiceDueDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000), // 6 months later
      serviceDate: new Date(),
    },
  })

  console.log(`✔ Free Service logged! ID: ${freeService.id}`)
  console.log(`  - Type: ${freeService.serviceType}, Cost: $${freeService.totalCost}`)
  console.log(`  - Next Due: ${freeService.nextServiceDueDate?.toISOString().split("T")[0]}`)

  // 3. Test 2: Log a Warranty Claim Service
  console.log(`\n--- Test 2: Logging Warranty Claim Service ---`)
  const warrantyService = await prisma.serviceRecord.create({
    data: {
      organizationId: org.id,
      branchId: branch.id,
      vehicleId: testVehicle.id,
      customerId: customer.id,
      serviceType: ServiceType.Warranty,
      description: "Battery Management System (BMS) firmware recall update and DC fast-charge port solenoid replacement under warranty.",
      totalCost: 0,
      nextServiceDueDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      serviceDate: new Date(),
    },
  })

  console.log(`✔ Warranty Claim logged! ID: ${warrantyService.id}`)
  console.log(`  - Type: ${warrantyService.serviceType}, Cost: $${warrantyService.totalCost}`)

  // 4. Test 3: Log a Paid Service
  console.log(`\n--- Test 3: Logging Paid Maintenance Service ---`)
  const paidService = await prisma.serviceRecord.create({
    data: {
      organizationId: org.id,
      branchId: branch.id,
      vehicleId: testVehicle.id,
      customerId: customer.id,
      serviceType: ServiceType.Paid,
      description: "Cabin HEPA filter replacement, AC evaporator disinfection, and alloy wheel balancing requested by customer.",
      totalCost: 185.50,
      nextServiceDueDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
      serviceDate: new Date(),
    },
  })

  console.log(`✔ Paid Service logged! ID: ${paidService.id}`)
  console.log(`  - Type: ${paidService.serviceType}, Cost: $${paidService.totalCost}`)

  // 5. Query and verify all ServiceRecords
  console.log(`\n--- Verification: Querying Service History from DB ---`)
  const records = await prisma.serviceRecord.findMany({
    where: { organizationId: org.id },
    orderBy: { serviceDate: "desc" },
    include: {
      customer: true,
      vehicle: { include: { vehicleModel: true } },
      branch: true,
    },
  })

  console.log(`Total Service Records for ${org.businessName}: ${records.length}`)
  records.slice(0, 3).forEach((r, idx) => {
    console.log(` [${idx + 1}] ${r.serviceType} | ${r.vehicle.vehicleModel.modelName} (${r.vehicle.chassisNumber}) | Customer: ${r.customer.name} | Cost: $${r.totalCost} | Date: ${r.serviceDate.toISOString().split("T")[0]}`)
  })

  console.log(`\n>>> ALL TASK 09 VERIFICATIONS PASSED SUCCESSFULLY! <<<`)
}

main()
  .catch((e) => {
    console.error("Test failed:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
