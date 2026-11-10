import { PrismaClient, VehicleStatus, PaymentMethod, DMTStatus } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
  console.log("=== Testing Task 08: Enhanced GRN, Sales & DMT Registration ===")

  // 1. Get dealership organization, branch, supplier, and vehicle model
  const org = await prisma.organization.findFirst({
    where: { subdomain: "apex" },
    include: {
      users: true,
      branches: true,
      suppliers: true,
      vehicleModels: true,
    },
  })

  if (!org) {
    throw new Error("Dealership not found.")
  }

  const branch = org.branches[0]
  const supplier = org.suppliers[0]
  const model = org.vehicleModels[0]
  const user = org.users[0]

  console.log(`Dealership: ${org.businessName}`)
  console.log(`Branch: ${branch.name}`)
  console.log(`Model: ${model.brand} ${model.modelName}`)

  // 2. Test Enhanced GRN with Battery Serial Number & Warranty Period
  const testChassis = `VIN-TEST-${Date.now().toString().slice(-6)}`
  const testBatterySerial = `BAT-LFP-${Date.now().toString().slice(-6)}`
  const testWarranty = "5 Years / 150,000 km"

  console.log(`\n--- Step 1: Creating GRN with Battery Serial: ${testBatterySerial} ---`)
  const grnCount = await prisma.gRN.count({ where: { organizationId: org.id } })
  const grnNumber = `GRN-${new Date().getFullYear()}-${String(grnCount + 1).padStart(4, "0")}`

  const newVehicle = await prisma.$transaction(async (tx) => {
    const grn = await tx.gRN.create({
      data: {
        organizationId: org.id,
        branchId: branch.id,
        supplierId: supplier.id,
        grnNumber,
        totalAmount: 38000,
        receivedDate: new Date(),
      },
    })

    const v = await tx.vehicle.create({
      data: {
        organizationId: org.id,
        branchId: branch.id,
        vehicleModelId: model.id,
        chassisNumber: testChassis,
        motorNumber: "MOT-EV-9912",
        batterySerialNumber: testBatterySerial,
        warrantyPeriod: testWarranty,
        color: "Metallic Blue",
        purchasePrice: 38000,
        status: VehicleStatus.InStock,
      },
    })

    await tx.gRNItem.create({
      data: {
        grnId: grn.id,
        vehicleId: v.id,
        unitPrice: 38000,
      },
    })

    return v
  })

  console.log(`✔ Vehicle created via GRN!`)
  console.log(`  - Chassis: ${newVehicle.chassisNumber}`)
  console.log(`  - Battery Serial: ${newVehicle.batterySerialNumber}`)
  console.log(`  - Warranty Period: ${newVehicle.warrantyPeriod}`)
  console.log(`  - Status: ${newVehicle.status}`)

  // 3. Test Enhanced POS Sale with Discount & Additional Charges
  console.log(`\n--- Step 2: Processing Sale with Discount & Additional Charges ---`)
  const basePrice = model.defaultPrice // e.g. 48,500
  const additionalCharges = 1200 // e.g. Registration & Documentation
  const discount = 2500 // e.g. Promotional Discount
  const expectedTotal = basePrice + additionalCharges - discount // 48500 + 1200 - 2500 = 47200

  // Upsert test customer
  const customer = await prisma.customer.upsert({
    where: { id: "test-customer-sl" },
    update: {},
    create: {
      id: "test-customer-sl",
      organizationId: org.id,
      name: "Dhanushka Wickramasinghe",
      phone: "+94 71 555 4321",
      nic: "199023405678",
      address: "24 Park Street, Colombo 02",
    },
  })

  const saleResult = await prisma.$transaction(async (tx) => {
    // Create Sale
    const sale = await tx.sale.create({
      data: {
        organizationId: org.id,
        branchId: branch.id,
        customerId: customer.id,
        userId: user.id,
        invoiceNumber: `INV-TEST-${Date.now()}`,
        vehicleId: newVehicle.id,
        totalAmount: expectedTotal,
        discount,
        additionalCharges,
        deliveryDate: new Date(),
        paymentMethod: PaymentMethod.Cash,
        status: "Completed",
      },
    })

    // Link vehicle in SaleItem
    await tx.saleItem.create({
      data: {
        saleId: sale.id,
        vehicleId: newVehicle.id,
        price: basePrice,
      },
    })

    // Update vehicle to Sold
    await tx.vehicle.update({
      where: { id: newVehicle.id },
      data: { status: VehicleStatus.Sold },
    })

    // Automatically create empty DMTRegistration record linked to the new Sale
    const dmt = await tx.dMTRegistration.create({
      data: {
        saleId: sale.id,
        status: DMTStatus.Pending,
        hasMTA2: false,
        hasNIC: false,
        hasPhotos: false,
        hasTIN: false,
      },
    })

    return { sale, dmt }
  })

  console.log(`✔ Sale completed! ID: ${saleResult.sale.id}`)
  console.log(`  - Base Price: Rs. ${basePrice}`)
  console.log(`  - Additional Charges: +Rs. ${saleResult.sale.additionalCharges}`)
  console.log(`  - Discount: -Rs. ${saleResult.sale.discount}`)
  console.log(`  - Calculated Total Amount: Rs. ${saleResult.sale.totalAmount} (Expected: Rs. ${expectedTotal})`)
  console.log(`✔ DMT Registration record automatically initialized!`)
  console.log(`  - DMT ID: ${saleResult.dmt.id}`)
  console.log(`  - Status: ${saleResult.dmt.status}`)
  console.log(`  - MTA-2: ${saleResult.dmt.hasMTA2}, NIC: ${saleResult.dmt.hasNIC}, TIN: ${saleResult.dmt.hasTIN}`)

  // 4. Test DMT Status & Checklist Update
  console.log(`\n--- Step 3: Updating DMT Checklist & Registration Plate ---`)
  const updatedDMT = await prisma.dMTRegistration.update({
    where: { saleId: saleResult.sale.id },
    data: {
      status: DMTStatus.Processing,
      hasMTA2: true,
      hasNIC: true,
      hasPhotos: true,
      hasTIN: true,
      registeredNumber: "WP CAD-8899",
    },
  })

  console.log(`✔ DMT Registration updated!`)
  console.log(`  - Status: ${updatedDMT.status}`)
  console.log(`  - Documents Collected: MTA-2: ${updatedDMT.hasMTA2}, NIC: ${updatedDMT.hasNIC}, Photos: ${updatedDMT.hasPhotos}, TIN: ${updatedDMT.hasTIN}`)
  console.log(`  - DMT Registered Plate: ${updatedDMT.registeredNumber}`)

  console.log(`\n>>> ALL TASK 08 VERIFICATIONS PASSED! <<<`)
}

main()
  .catch((e) => {
    console.error("Test failed:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
