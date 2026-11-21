/**
 * Builds the isolated "E2E Motors" dealership used by the Playwright suite.
 *
 * Safety: every delete is scoped to the E2E organization id (found by its fixed subdomain) or to
 * Supabase auth users whose email ends with the E2E email domain. It never touches any other
 * organization (e.g. Jayakodi Motors) or any other Supabase auth user. It refuses to run if the
 * resolved organization is not literally named "E2E Motors" with subdomain "e2e".
 *
 * Re-runnable: it deletes the previous E2E Motors data first, then rebuilds it.
 */
import fs from "node:fs"
import path from "node:path"
import dotenv from "dotenv"
import { createClient } from "@supabase/supabase-js"
import { db } from "./db"

dotenv.config({ path: path.resolve(process.cwd(), ".env") })
dotenv.config({ path: path.resolve(process.cwd(), "tests/e2e/.env.e2e") })


export const E2E_SUBDOMAIN = "e2e"
export const E2E_ORG_NAME = "E2E Motors"
export const FIXTURES_PATH = path.resolve(process.cwd(), "tests/e2e/.auth/fixtures.json")

export type RoleKey = "owner" | "branchManager" | "cashier" | "receivablesStaff" | "noAccessStaff"

export interface E2EFixtures {
  orgId: string
  branchA: { id: string; name: string }
  branchB: { id: string; name: string }
  financeCompany: { id: string; name: string; rate: number }
  insuranceCompany: { id: string; name: string }
  fullInsuranceCommission: number
  users: Record<RoleKey, { email: string; name: string; password: string }>
  customers: Record<string, { id: string; name: string; nic: string }>
  /** Read-only probe of another dealership's data (e.g. Jayakodi Motors) for tenant isolation checks. */
  otherOrg: { name: string; chassisNumber: string | null; modelName: string | null } | null
}

function required(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`Missing ${name}. Copy tests/e2e/.env.e2e.example to tests/e2e/.env.e2e.`)
  return value
}

const prisma = db

const supabase = createClient(required("NEXT_PUBLIC_SUPABASE_URL"), required("SUPABASE_SERVICE_ROLE_KEY"), {
  auth: { autoRefreshToken: false, persistSession: false },
})

const q = (id: string) => `'${id.replace(/'/g, "''")}'`

interface Fk { child: string; childCol: string; parent: string; parentCol: string }

/** Single-column foreign keys in the public schema. */
async function loadForeignKeys(): Promise<Fk[]> {
  return prisma.$queryRawUnsafe<Fk[]>(`
    SELECT cl.relname AS child, ca.attname AS "childCol", pl.relname AS parent, pa.attname AS "parentCol"
    FROM pg_constraint c
    JOIN pg_class cl ON cl.oid = c.conrelid
    JOIN pg_class pl ON pl.oid = c.confrelid
    JOIN pg_namespace n ON n.oid = cl.relnamespace AND n.nspname = 'public'
    JOIN pg_attribute ca ON ca.attrelid = c.conrelid AND ca.attnum = c.conkey[1]
    JOIN pg_attribute pa ON pa.attrelid = c.confrelid AND pa.attnum = c.confkey[1]
    WHERE c.contype = 'f' AND array_length(c.conkey, 1) = 1
  `)
}

/**
 * Deletes everything that belongs to the E2E organization. A row belongs to it when its table has an
 * "organizationId" equal to the E2E org id, or (for tables without that column) when a foreign key
 * leads to such a row. The root condition is always "organizationId = <e2e org id>", so nothing outside
 * the E2E organization can match.
 */
async function wipeE2EOrganization() {
  const org = await prisma.organization.findUnique({ where: { subdomain: E2E_SUBDOMAIN } })
  if (!org) return
  if (org.businessName !== E2E_ORG_NAME) {
    throw new Error(`Refusing to wipe: organization with subdomain "${E2E_SUBDOMAIN}" is named "${org.businessName}".`)
  }
  const fks = await loadForeignKeys()
  const orgTables = (
    await prisma.$queryRawUnsafe<{ table_name: string }[]>(`
      SELECT table_name FROM information_schema.columns
      WHERE table_schema = 'public' AND column_name = 'organizationId' AND table_name <> 'Organization'
    `)
  ).map((r) => r.table_name)

  // scope: table -> conditions selecting its E2E rows; depth: distance from an organizationId table.
  const scope = new Map<string, string[]>()
  const depth = new Map<string, number>()
  for (const t of orgTables) {
    scope.set(t, [`"organizationId" = ${q(org.id)}`])
    depth.set(t, 0)
  }
  const orOf = (t: string) => scope.get(t)!.map((c) => `(${c})`).join(" OR ")
  for (let round = 1; round <= 6; round++) {
    const added: Array<[string, string]> = []
    for (const fk of fks) {
      if (fk.child === fk.parent || scope.has(fk.child) && depth.get(fk.child) === 0) continue
      if (!scope.has(fk.parent) || (depth.get(fk.parent) ?? 99) >= round) continue
      added.push([fk.child, `"${fk.childCol}" IN (SELECT "${fk.parentCol}" FROM "${fk.parent}" WHERE ${orOf(fk.parent)})`])
    }
    if (added.length === 0) break
    for (const [child, cond] of added) {
      if (!scope.has(child)) {
        scope.set(child, [])
        depth.set(child, round)
      }
      if (!scope.get(child)!.includes(cond)) scope.get(child)!.push(cond)
    }
  }

  const ordered = [...scope.keys()].sort((x, y) => (depth.get(y) ?? 0) - (depth.get(x) ?? 0))
  let pending = ordered
  for (let pass = 0; pass < 8 && pending.length > 0; pass++) {
    const failed: string[] = []
    for (const table of pending) {
      for (const fk of fks.filter((f) => f.parent === table && f.child === table)) {
        await prisma.$executeRawUnsafe(`UPDATE "${table}" SET "${fk.childCol}" = NULL WHERE ${orOf(table)}`)
      }
      try {
        await prisma.$executeRawUnsafe(`DELETE FROM "${table}" WHERE ${orOf(table)}`)
      } catch (error) {
        if (!/violates foreign key|23503/i.test(String(error))) throw error
        failed.push(table)
      }
    }
    pending = failed
  }
  if (pending.length > 0) throw new Error(`Could not wipe E2E data from: ${pending.join(", ")}`)
  await prisma.organization.deleteMany({ where: { id: org.id, subdomain: E2E_SUBDOMAIN, businessName: E2E_ORG_NAME } })
}

async function wipeE2EAuthUsers(domain: string) {
  const suffix = `@${domain}`.toLowerCase()
  const { data, error } = await supabase.auth.admin.listUsers({ perPage: 1000 })
  if (error) throw error
  for (const user of data.users) {
    // Guard: only users on the E2E domain are ever deleted.
    if (user.email && user.email.toLowerCase().endsWith(suffix)) {
      const { error: delError } = await supabase.auth.admin.deleteUser(user.id)
      if (delError) throw delError
    }
  }
}

async function createAuthUser(email: string, password: string, name: string) {
  const { error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name },
  })
  if (error) throw error
}

export async function seedE2E(): Promise<E2EFixtures> {
  const domain = required("E2E_EMAIL_DOMAIN")
  if (domain.toLowerCase().includes("gmail.com")) throw new Error("E2E_EMAIL_DOMAIN must be a dedicated test domain.")

  await wipeE2EOrganization()
  await wipeE2EAuthUsers(domain)

  const org = await prisma.organization.create({
    data: {
      businessName: E2E_ORG_NAME,
      domain: "e2e-motors.local",
      subdomain: E2E_SUBDOMAIN,
      subscriptionPlan: "Pro",
      subscriptionStatus: "Active",
    },
  })
  const branchA = await prisma.branch.create({ data: { organizationId: org.id, name: "E2E Branch A", location: "Colombo" } })
  const branchB = await prisma.branch.create({ data: { organizationId: org.id, name: "E2E Branch B", location: "Kandy" } })

  await prisma.vehicleModel.createMany({
    data: [
      { organizationId: org.id, brand: "E2E", modelName: "Scooter S1", defaultPrice: 500000, minDownPayment: 100000, batteryCapacity: "60V 32Ah", range: "100 km" },
      { organizationId: org.id, brand: "E2E", modelName: "Bike B2", defaultPrice: 350000, minDownPayment: 70000, batteryCapacity: "72V 40Ah", range: "120 km" },
    ],
  })
  await prisma.supplier.create({ data: { organizationId: org.id, name: "E2E Supplier", contactPerson: "Supply Person", phone: "0112000000" } })
  const financeCompany = await prisma.financeCompany.create({
    data: { organizationId: org.id, name: "E2E Finance", contactNo: "0112111111", defaultCommissionRate: 3 },
  })
  const insuranceCompany = await prisma.insuranceCompany.create({
    data: { organizationId: org.id, name: "E2E Insurance", contactNo: "0112222222", defaultCommissionRate: 2 },
  })
  await prisma.commissionSettings.create({ data: { organizationId: org.id, fullInsuranceCommission: 2000 } })

  const userDefs: Record<RoleKey, { role: "OrgAdmin" | "BranchManager" | "Cashier" | "SalesRep"; name: string; branchId: string | null; permissions: string[]; envKey: string }> = {
    owner: { role: "OrgAdmin", name: "E2E Owner", branchId: null, permissions: [], envKey: "E2E_PASSWORD_OWNER" },
    branchManager: {
      role: "BranchManager",
      name: "E2E Branch Manager",
      branchId: branchA.id,
      permissions: [
        "CREATE_GRN", "TRANSFER_STOCK", "VIEW_INVENTORY_COST", "CREATE_SALE", "MANAGE_SUPPLIERS", "RECORD_PAYMENTS",
        "MANAGE_CHEQUES", "MANAGE_FINANCE_RECEIVABLES", "MANAGE_BANK_DEPOSITS", "MANAGE_CUSTOMERS", "VIEW_REPORTS",
      ],
      envKey: "E2E_PASSWORD_BRANCH_MANAGER",
    },
    cashier: { role: "Cashier", name: "E2E Cashier", branchId: branchA.id, permissions: ["CREATE_SALE"], envKey: "E2E_PASSWORD_CASHIER" },
    receivablesStaff: {
      role: "Cashier",
      name: "E2E Receivables Staff",
      branchId: branchB.id,
      permissions: ["MANAGE_FINANCE_RECEIVABLES"],
      envKey: "E2E_PASSWORD_RECEIVABLES_STAFF",
    },
    noAccessStaff: {
      role: "SalesRep",
      name: "E2E No Access Staff",
      branchId: branchA.id,
      permissions: ["MANAGE_CUSTOMERS"],
      envKey: "E2E_PASSWORD_NO_ACCESS_STAFF",
    },
  }

  const users = {} as E2EFixtures["users"]
  for (const key of Object.keys(userDefs) as RoleKey[]) {
    const def = userDefs[key]
    const email = `${key.toLowerCase()}@${domain}`
    const password = required(def.envKey)
    await createAuthUser(email, password, def.name)
    await prisma.user.create({
      data: {
        organizationId: org.id,
        branchId: def.branchId,
        email,
        name: def.name,
        passwordHash: "",
        role: def.role,
        permissions: def.permissions,
      },
    })
    users[key] = { email, name: def.name, password }
  }

  // Customers (SALE type) used by the sale scenarios; NICs are unique and obviously fake.
  const customerDefs = [
    ["cashSale", "E2E Cash Customer", "900000001V"],
    ["financeOne", "E2E Finance Customer One", "900000002V"],
    ["financeTwo", "E2E Finance Customer Two", "900000003V"],
    ["financeThree", "E2E Finance Customer Three", "900000004V"],
    ["financeFour", "E2E Finance Customer Four", "900000005V"],
    ["financeFive", "E2E Finance Customer Five", "900000006V"],
    ["financeSix", "E2E Finance Customer Six", "900000007V"],
    ["duplicateNic", "E2E Existing NIC Customer", "900000099V"],
    ["raceOne", "E2E Race Customer One", "900000010V"],
    ["raceTwo", "E2E Race Customer Two", "900000011V"],
  ] as const
  const customers: E2EFixtures["customers"] = {}
  for (const [key, name, nic] of customerDefs) {
    const c = await prisma.customer.create({
      data: {
        organizationId: org.id,
        category: "DIRECT",
        customerType: "SALE",
        name,
        phone: "0771234567",
        nic,
        address: "E2E Street",
      },
    })
    customers[key] = { id: c.id, name, nic }
  }

  // In-stock bikes for the sale scenarios (the GRN scenario creates its own through the real form).
  const model = await prisma.vehicleModel.findFirstOrThrow({ where: { organizationId: org.id, modelName: "Scooter S1" } })
  const stock: Array<[string, string]> = [
    ["E2E-STOCK-CASH-01", branchA.id],
    ["E2E-STOCK-FIN-01", branchA.id],
    ["E2E-STOCK-FIN-02", branchA.id],
    ["E2E-STOCK-FIN-03", branchA.id],
    ["E2E-STOCK-FIN-04", branchA.id],
    ["E2E-STOCK-FIN-05", branchA.id],
    ["E2E-STOCK-FIN-06", branchA.id],
    ["E2E-STOCK-B-01", branchB.id],
    ["E2E-STOCK-RACE-01", branchA.id],
  ]
  for (const [chassis, branchId] of stock) {
    await prisma.vehicle.create({
      data: {
        organizationId: org.id,
        branchId,
        vehicleModelId: model.id,
        chassisNumber: chassis,
        motorNumber: `M-${chassis}`,
        batterySerialNumber: `BAT-${chassis}`,
        color: "Black",
        // GRN-created bikes are AVAILABLE; use the same status so the stock page and POS both list them.
        status: "AVAILABLE",
        purchasePrice: 400000,
      },
    })
  }

  // Another dealership, only to prove tenant isolation. Read-only: we never write to it.
  const other = await prisma.organization.findFirst({
    where: { OR: [{ subdomain: null }, { subdomain: { not: E2E_SUBDOMAIN } }] },
    orderBy: { createdAt: "asc" },
    select: { businessName: true, id: true },
  })
  const otherVehicle = other
    ? await prisma.vehicle.findFirst({
        where: { organizationId: other.id },
        select: { chassisNumber: true, vehicleModel: { select: { modelName: true } } },
      })
    : null

  const fixtures: E2EFixtures = {
    orgId: org.id,
    branchA: { id: branchA.id, name: branchA.name },
    branchB: { id: branchB.id, name: branchB.name },
    financeCompany: { id: financeCompany.id, name: financeCompany.name, rate: 3 },
    insuranceCompany: { id: insuranceCompany.id, name: insuranceCompany.name },
    fullInsuranceCommission: 2000,
    users,
    customers,
    otherOrg: other
      ? { name: other.businessName, chassisNumber: otherVehicle?.chassisNumber ?? null, modelName: otherVehicle?.vehicleModel.modelName ?? null }
      : null,
  }
  fs.mkdirSync(path.dirname(FIXTURES_PATH), { recursive: true })
  fs.writeFileSync(FIXTURES_PATH, JSON.stringify(fixtures, null, 2))
  return fixtures
}

export async function disconnectSeed() {
  await prisma.$disconnect()
}
