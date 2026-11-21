/**
 * Minimum data needed to sign in again after a database reset:
 *   - a platform super admin
 *   - the "Jayakodi Motors" dealership with two branches
 *   - an owner (OrgAdmin) login
 *
 * Sign-in is handled by Supabase Auth, so each login needs a Supabase auth user as well as a database row.
 * Existing Supabase users are reused and their passwords are left untouched.
 *
 * Run:  node --experimental-strip-types prisma/seed.ts
 * Then: SEED_ORG_SUBDOMAIN=jayakodi node --experimental-strip-types prisma/seed-vehicles.ts
 */
import "dotenv/config"
import { randomBytes } from "node:crypto"
import prismaClient from "@prisma/client"
import { createClient } from "@supabase/supabase-js"

const { PrismaClient } = prismaClient
const prisma = new PrismaClient()

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const PLATFORM_ADMIN = { email: process.env.SEED_PLATFORM_ADMIN_EMAIL ?? "platform.admin@evpos-test.dev", name: "Platform Admin" }
const OWNER = { email: process.env.SEED_OWNER_EMAIL ?? "owner@jayakodi-test.dev", name: "Jayakodi Owner" }

const credentials: { role: string; email: string; password: string }[] = []

/** Create the Supabase auth user, or reuse it (without changing its password) when it already exists. */
async function ensureAuthUser(email: string, name: string, role: string) {
  const { data: list, error: listError } = await supabase.auth.admin.listUsers({ perPage: 1000 })
  if (listError) throw listError
  if (list.users.some((u) => u.email?.toLowerCase() === email.toLowerCase())) {
    credentials.push({ role, email, password: "(existing Supabase user, password unchanged)" })
    return
  }
  const password = randomBytes(9).toString("base64url") + "!9"
  const { error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name },
  })
  if (error) throw error
  credentials.push({ role, email, password })
}

async function main() {
  console.log("Seeding minimum data...")

  const org = await prisma.organization.upsert({
    where: { subdomain: "jayakodi" },
    update: {},
    create: {
      businessName: "Jayakodi Motors",
      domain: "jayakodi.local",
      subdomain: "jayakodi",
      subscriptionPlan: "Pro",
      subscriptionStatus: "Active",
    },
  })

  const branchSeeds = [
    { name: "Colombo Showroom", location: "Colombo" },
    { name: "Kandy Showroom", location: "Kandy" },
  ]
  for (const b of branchSeeds) {
    const existing = await prisma.branch.findFirst({ where: { organizationId: org.id, name: b.name } })
    if (!existing) await prisma.branch.create({ data: { organizationId: org.id, ...b } })
  }
  const mainBranch = await prisma.branch.findFirstOrThrow({ where: { organizationId: org.id }, orderBy: { createdAt: "asc" } })

  await ensureAuthUser(PLATFORM_ADMIN.email, PLATFORM_ADMIN.name, "Platform super admin (admin portal)")
  await prisma.platformUser.upsert({
    where: { email: PLATFORM_ADMIN.email },
    update: {},
    create: { email: PLATFORM_ADMIN.email, name: PLATFORM_ADMIN.name, passwordHash: "", role: "PlatformAdmin" },
  })

  await ensureAuthUser(OWNER.email, OWNER.name, "Jayakodi Motors owner (OrgAdmin)")
  await prisma.user.upsert({
    where: { email: OWNER.email },
    update: {},
    create: {
      email: OWNER.email,
      name: OWNER.name,
      passwordHash: "",
      role: "OrgAdmin",
      organizationId: org.id,
      branchId: mainBranch.id,
    },
  })

  console.log("\nLogins (store these; passwords are shown only once):")
  for (const c of credentials) console.log(`  ${c.role}\n    email: ${c.email}\n    password: ${c.password}`)
}

main()
  .catch((e) => {
    console.error("Seeding error:", e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
