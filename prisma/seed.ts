import { PrismaClient, UserRole, SubscriptionPlan, SubscriptionStatus } from "@prisma/client"
import bcrypt from "bcrypt"

const prisma = new PrismaClient()

async function main() {
  console.log("Seeding initial EV Dealership data...")

  // 1. Create Dealership Organization
  const org = await prisma.organization.upsert({
    where: { domain: "apexev.com" },
    update: {},
    create: {
      businessName: "Apex EV Motors",
      domain: "apexev.com",
      subdomain: "apex",
      subscriptionPlan: SubscriptionPlan.Pro,
      subscriptionStatus: SubscriptionStatus.Active,
    },
  })

  console.log(`Created Organization: ${org.businessName} (${org.id})`)

  // 2. Create Default Branch
  const branch = await prisma.branch.create({
    data: {
      organizationId: org.id,
      name: "Colombo Flagship Showroom",
      location: "No. 42 Galle Road, Colombo 03",
      contactNumber: "+94 11 234 5678",
    },
  })

  console.log(`Created Branch: ${branch.name}`)

  // 3. Create Admin User
  const passwordHash = await bcrypt.hash("password123", 10)
  const adminUser = await prisma.user.upsert({
    where: { email: "admin@voltpos.com" },
    update: {
      passwordHash,
      organizationId: org.id,
    },
    create: {
      email: "admin@voltpos.com",
      name: "Alexander Vance",
      passwordHash,
      role: UserRole.OrgAdmin,
      organizationId: org.id,
    },
  })

  console.log(`Created Admin User: ${adminUser.email} (Password: password123)`)

  // 4. Create EV Bike Models
  const model1 = await prisma.vehicleModel.create({
    data: {
      organizationId: org.id,
      brand: "Volt Motors",
      modelName: "Apex GT Electric Bike",
      motorPower: "2000W",
      batteryCapacity: "60V 32Ah",
      rangePerCharge: "120km",
      range: "120km",
      topSpeed: "55 km/h",
      chargingTime: "4-6 Hours",
      defaultPrice: 2450,
      minDownPayment: 250,
    },
  })

  console.log(`Created EV Bike Model: ${model1.brand} ${model1.modelName}`)
  console.log("Seed complete!")
}

main()
  .catch((e) => {
    console.error("Seeding error:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
