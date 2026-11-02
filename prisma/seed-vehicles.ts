import { PrismaClient, VehicleStatus } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
  console.log("Seeding vehicle models and in-stock inventory...")

  // Find Apex EV Motors
  const apex = await prisma.organization.findFirst({
    where: { subdomain: "apex" },
    include: { branches: true, vehicleModels: true },
  })

  if (!apex || apex.branches.length === 0) {
    console.log("Apex organization or branch not found. Run base seed first.")
    return
  }

  const branch = apex.branches[0]

  // Model 1: Apex GT Sedan
  let apexGT = apex.vehicleModels.find((m) => m.modelName === "Apex GT Sedan")
  if (!apexGT) {
    apexGT = await prisma.vehicleModel.create({
      data: {
        organizationId: apex.id,
        brand: "Volt Motors",
        modelName: "Apex GT Sedan",
        batteryCapacity: "82 kWh",
        range: "580 km",
        defaultPrice: 48500,
        minDownPayment: 4850,
      },
    })
  }

  // Model 2: Terra SUV AWD
  let terraSUV = await prisma.vehicleModel.findFirst({
    where: { organizationId: apex.id, modelName: "Terra SUV AWD" },
  })
  if (!terraSUV) {
    terraSUV = await prisma.vehicleModel.create({
      data: {
        organizationId: apex.id,
        brand: "EcoDrive",
        modelName: "Terra SUV AWD",
        batteryCapacity: "95 kWh",
        range: "520 km",
        defaultPrice: 59900,
        minDownPayment: 5990,
      },
    })
  }

  // Model 3: Pulse City EV
  let pulseEV = await prisma.vehicleModel.findFirst({
    where: { organizationId: apex.id, modelName: "Pulse City EV" },
  })
  if (!pulseEV) {
    pulseEV = await prisma.vehicleModel.create({
      data: {
        organizationId: apex.id,
        brand: "HyperVolt",
        modelName: "Pulse City EV",
        batteryCapacity: "48 kWh",
        range: "360 km",
        defaultPrice: 29900,
        minDownPayment: 2990,
      },
    })
  }

  // Add in-stock vehicles for Apex GT
  const existingVehicles = await prisma.vehicle.count({
    where: { organizationId: apex.id },
  })

  if (existingVehicles === 0) {
    // 3 units of Apex GT
    await prisma.vehicle.createMany({
      data: [
        {
          organizationId: apex.id,
          branchId: branch.id,
          vehicleModelId: apexGT.id,
          chassisNumber: "VIN-APEX-2026-001",
          motorNumber: "MOT-8201",
          color: "Pearl White",
          status: VehicleStatus.InStock,
          purchasePrice: 42000,
        },
        {
          organizationId: apex.id,
          branchId: branch.id,
          vehicleModelId: apexGT.id,
          chassisNumber: "VIN-APEX-2026-002",
          motorNumber: "MOT-8202",
          color: "Midnight Black",
          status: VehicleStatus.InStock,
          purchasePrice: 42000,
        },
        {
          organizationId: apex.id,
          branchId: branch.id,
          vehicleModelId: apexGT.id,
          chassisNumber: "VIN-APEX-2026-003",
          motorNumber: "MOT-8203",
          color: "Titanium Silver",
          status: VehicleStatus.InStock,
          purchasePrice: 42000,
        },
      ],
    })

    // 2 units of Terra SUV
    await prisma.vehicle.createMany({
      data: [
        {
          organizationId: apex.id,
          branchId: branch.id,
          vehicleModelId: terraSUV.id,
          chassisNumber: "VIN-TERRA-2026-101",
          motorNumber: "MOT-9501",
          color: "Stealth Grey",
          status: VehicleStatus.InStock,
          purchasePrice: 51000,
        },
        {
          organizationId: apex.id,
          branchId: branch.id,
          vehicleModelId: terraSUV.id,
          chassisNumber: "VIN-TERRA-2026-102",
          motorNumber: "MOT-9502",
          color: "Alpine White",
          status: VehicleStatus.InStock,
          purchasePrice: 51000,
        },
      ],
    })

    // 4 units of Pulse City EV
    await prisma.vehicle.createMany({
      data: [
        {
          organizationId: apex.id,
          branchId: branch.id,
          vehicleModelId: pulseEV.id,
          chassisNumber: "VIN-PULSE-2026-201",
          motorNumber: "MOT-4801",
          color: "Electric Blue",
          status: VehicleStatus.InStock,
          purchasePrice: 24000,
        },
        {
          organizationId: apex.id,
          branchId: branch.id,
          vehicleModelId: pulseEV.id,
          chassisNumber: "VIN-PULSE-2026-202",
          motorNumber: "MOT-4802",
          color: "Sunset Orange",
          status: VehicleStatus.InStock,
          purchasePrice: 24000,
        },
        {
          organizationId: apex.id,
          branchId: branch.id,
          vehicleModelId: pulseEV.id,
          chassisNumber: "VIN-PULSE-2026-203",
          motorNumber: "MOT-4803",
          color: "Pearl White",
          status: VehicleStatus.InStock,
          purchasePrice: 24000,
        },
        {
          organizationId: apex.id,
          branchId: branch.id,
          vehicleModelId: pulseEV.id,
          chassisNumber: "VIN-PULSE-2026-204",
          motorNumber: "MOT-4804",
          color: "Onyx Black",
          status: VehicleStatus.InStock,
          purchasePrice: 24000,
        },
      ],
    })

    console.log("Added 9 in-stock vehicles for Apex EV Motors!")
  } else {
    console.log(`Apex EV Motors already has ${existingVehicles} vehicles.`)
  }

  // Also seed some for Electra Lanka EV
  const electra = await prisma.organization.findFirst({
    where: { subdomain: "electra-lanka-ev" },
    include: { branches: true },
  })

  if (electra && electra.branches.length > 0) {
    const electraBranch = electra.branches[0]
    let model = await prisma.vehicleModel.findFirst({
      where: { organizationId: electra.id },
    })
    if (!model) {
      model = await prisma.vehicleModel.create({
        data: {
          organizationId: electra.id,
          brand: "BYD",
          modelName: "Atto 3 Superior Extended",
          batteryCapacity: "60.48 kWh",
          range: "420 km",
          defaultPrice: 44500,
          minDownPayment: 4450,
        },
      })
      await prisma.vehicle.createMany({
        data: [
          {
            organizationId: electra.id,
            branchId: electraBranch.id,
            vehicleModelId: model.id,
            chassisNumber: "VIN-BYD-ATTO-001",
            motorNumber: "MOT-BYD-1",
            color: "Ski White",
            status: VehicleStatus.InStock,
            purchasePrice: 38000,
          },
          {
            organizationId: electra.id,
            branchId: electraBranch.id,
            vehicleModelId: model.id,
            chassisNumber: "VIN-BYD-ATTO-002",
            motorNumber: "MOT-BYD-2",
            color: "Surf Blue",
            status: VehicleStatus.InStock,
            purchasePrice: 38000,
          },
        ],
      })
      console.log("Seeded BYD Atto 3 for Electra Lanka EV!")
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
