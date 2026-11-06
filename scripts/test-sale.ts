import { PrismaClient, VehicleStatus, PaymentMethod, FinanceStatus } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
  console.log("=== Testing Sales & POS Data and Transaction ===")

  // 1. Find Apex EV Motors organization and admin user
  const org = await prisma.organization.findFirst({
    where: { subdomain: "apex" },
    include: {
      users: true,
      branches: true,
    },
  })

  if (!org) {
    console.error("Dealership not found!")
    return
  }

  const user = org.users[0]
  const branch = org.branches[0]
  console.log(`Dealership: ${org.businessName} (ID: ${org.id})`)
  console.log(`Staff User: ${user.name} (${user.email})`)
  console.log(`Branch: ${branch.name} (ID: ${branch.id})`)

  // 2. Fetch in-stock vehicles
  const inStockVehicles = await prisma.vehicle.findMany({
    where: { organizationId: org.id, status: VehicleStatus.InStock },
    include: { vehicleModel: true },
  })

  console.log(`\nIn-Stock Vehicles Available: ${inStockVehicles.length}`)
  inStockVehicles.forEach((v) => {
    console.log(` - VIN: ${v.chassisNumber} | ${v.vehicleModel.brand} ${v.vehicleModel.modelName} | Price: Rs. ${v.vehicleModel.defaultPrice}`)
  })

  if (inStockVehicles.length === 0) {
    console.log("No vehicles in stock to test sale.")
    return
  }

  // Pick one vehicle to test
  const vehicleToSell = inStockVehicles[0]
  console.log(`\nProcessing POS Sale for vehicle: ${vehicleToSell.chassisNumber} (${vehicleToSell.vehicleModel.modelName})`)

  // 3. Execute atomic transaction (mimicking processSale server action)
  const testCustomer = {
    name: "Sunil Jayawardena",
    phone: "+94 77 987 6543",
    nic: "198812345678",
    email: "sunil.j@example.com",
    address: "74 Peradeniya Road, Kandy",
  }

  const salePrice = vehicleToSell.vehicleModel.defaultPrice
  const downPayment = 15000
  const financedAmount = salePrice - downPayment

  const result = await prisma.$transaction(async (tx) => {
    // A. Upsert Customer
    let customer = await tx.customer.findFirst({
      where: {
        organizationId: org.id,
        OR: [{ phone: testCustomer.phone }, { nic: testCustomer.nic }],
      },
    })

    if (!customer) {
      customer = await tx.customer.create({
        data: {
          organizationId: org.id,
          name: testCustomer.name,
          phone: testCustomer.phone,
          nic: testCustomer.nic,
          email: testCustomer.email,
          address: testCustomer.address,
        },
      })
    }

    // B. Check vehicle status
    const freshVehicle = await tx.vehicle.findUnique({
      where: { id: vehicleToSell.id },
    })

    if (!freshVehicle || freshVehicle.status !== VehicleStatus.InStock) {
      throw new Error(`Vehicle ${vehicleToSell.chassisNumber} is not in stock!`)
    }

    // C. Create Sale
    const sale = await tx.sale.create({
      data: {
        organizationId: org.id,
        branchId: vehicleToSell.branchId,
        customerId: customer.id,
        userId: user.id,
        totalAmount: salePrice,
        paymentMethod: PaymentMethod.SplitPayment,
        status: "Completed",
        saleDate: new Date(),
      },
    })

    // D. Create SaleItem
    const saleItem = await tx.saleItem.create({
      data: {
        saleId: sale.id,
        vehicleId: vehicleToSell.id,
        price: salePrice,
      },
    })

    // E. Transition Vehicle status to Sold
    const updatedVehicle = await tx.vehicle.update({
      where: { id: vehicleToSell.id },
      data: { status: VehicleStatus.Sold },
    })

    // F. Create Finance Detail
    const financeDetail = await tx.financeDetail.create({
      data: {
        saleId: sale.id,
        financeCompany: "Commercial Bank Leasing",
        totalFinanceAmount: financedAmount,
        downPaymentPaid: downPayment,
        dealerCommission: 750,
        status: FinanceStatus.Pending,
      },
    })

    return { sale, saleItem, updatedVehicle, financeDetail, customer }
  })

  console.log("\n>>> POS Transaction Completed Successfully! <<<")
  console.log(`Sale ID: ${result.sale.id}`)
  console.log(`Customer: ${result.customer.name} (Phone: ${result.customer.phone})`)
  console.log(`Vehicle VIN: ${result.updatedVehicle.chassisNumber}`)
  console.log(`New Vehicle Status: ${result.updatedVehicle.status} (Verified transitioned from InStock to Sold)`)
  console.log(`Payment Method: ${result.sale.paymentMethod}`)
  console.log(`Total Sale Price: Rs. ${result.sale.totalAmount}`)
  console.log(`Finance Company: ${result.financeDetail.financeCompany}`)
  console.log(`Down Payment Paid: Rs. ${result.financeDetail.downPaymentPaid}`)
  console.log(`Financed Amount: Rs. ${result.financeDetail.totalFinanceAmount}`)
  console.log(`Finance Status: ${result.financeDetail.status}`)

  // 4. Verify in database that vehicle is no longer in InStock list
  const remainingInStock = await prisma.vehicle.count({
    where: { organizationId: org.id, status: VehicleStatus.InStock },
  })
  console.log(`\nRemaining In-Stock Vehicles for ${org.businessName}: ${remainingInStock}`)

  // 5. Verify total sales count
  const salesCount = await prisma.sale.count({
    where: { organizationId: org.id },
  })
  console.log(`Total Completed Sales in DB: ${salesCount}`)
}

main()
  .catch((e) => {
    console.error("Test failed with error:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
