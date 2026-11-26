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

export const E2E_OTHER_SUBDOMAIN = "e2e-other"
export const E2E_OTHER_ORG_NAME = "E2E Other Motors"
export const E2E_LAB_SUBDOMAIN = "e2e-owners"
export const E2E_LAB_ORG_NAME = "E2E Owner Lab"

export type RoleKey =
  | "owner"
  | "branchManager"
  | "cashier"
  | "receivablesStaff"
  | "noAccessStaff"
  // platform operator (signs in at /admin-portal/login) and the owners of the two extra e2e dealerships
  | "platformAdmin"
  | "otherOwner"
  | "labOwnerA"
  | "labOwnerB"
  // phase 2
  | "supplierViewer"
  | "depositStaffA"
  | "depositStaffB"
  | "transferStaffB"

export interface E2EFixtures {
  orgId: string
  branchA: { id: string; name: string }
  branchB: { id: string; name: string }
  financeCompany: { id: string; name: string; rate: number }
  insuranceCompany: { id: string; name: string }
  fullInsuranceCommission: number
  users: Record<RoleKey, { email: string; name: string; password: string }>
  customers: Record<string, { id: string; name: string; nic: string }>
  /** Phase 2: the supplier and its payable GRNs (each owes 100,000 at the start). */
  supplier: { id: string; name: string }
  supplierGrns: Record<string, { id: string; grnNumber: string; total: number }>
  /** Phase 2: in-stock bikes whose GRN was received N days ago (inventory aging buckets). */
  agingBikes: Array<{ days: number; chassisNumber: string; grnNumber: string; tier: "fresh" | "aging" | "warning" | "critical" }>
  /** Read-only probe of another dealership's data (e.g. Jayakodi Motors) for tenant isolation checks. */
  otherOrg: { id: string; name: string; chassisNumber: string | null; modelName: string | null } | null
  /** Dealership with two owners: A has a sale (history), B has none. */
  labOrg: { id: string; name: string } | null
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
/** Wipes one e2e dealership, found by its fixed subdomain AND exact name (anything else is never touched). */
async function wipeE2EOrganization(subdomain: string, expectedName: string) {
  const org = await prisma.organization.findUnique({ where: { subdomain } })
  if (!org) return
  if (org.businessName !== expectedName) {
    throw new Error(`Refusing to wipe: organization with subdomain "${subdomain}" is named "${org.businessName}".`)
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
  await prisma.organization.deleteMany({ where: { id: org.id, subdomain, businessName: expectedName } })
}

/** Platform admin rows for e2e logins, removed by e2e email domain only. */
async function wipeE2EPlatformUsers(domain: string) {
  await prisma.platformUser.deleteMany({ where: { email: { endsWith: `@${domain}`.toLowerCase() } } })
}

/** Supabase admin calls fail now and then with "fetch failed" on a flaky network; retry those. */
async function retrySb<T extends { error: { message: string } | null }>(fn: () => Promise<T>): Promise<T> {
  let last: T | undefined
  for (let attempt = 1; attempt <= 6; attempt++) {
    try {
      const result = await fn()
      if (!result.error || !/fetch failed|network|timeout|ECONN|ETIMEDOUT/i.test(result.error.message)) return result
      last = result
    } catch (error) {
      if (!/fetch failed|network|timeout|ECONN|ETIMEDOUT/i.test(String((error as Error)?.message))) throw error
    }
    await new Promise((r) => setTimeout(r, attempt * 2000))
  }
  if (last) return last
  throw new Error("Supabase admin call kept failing")
}

async function wipeE2EAuthUsers(domain: string) {
  const suffix = `@${domain}`.toLowerCase()
  const { data, error } = await retrySb(() => supabase.auth.admin.listUsers({ perPage: 1000 }))
  if (error) throw error
  for (const user of data.users) {
    // Guard: only users on the E2E domain are ever deleted.
    if (user.email && user.email.toLowerCase().endsWith(suffix)) {
      const { error: delError } = await retrySb(() => supabase.auth.admin.deleteUser(user.id))
      if (delError) throw delError
    }
  }
}

async function createAuthUser(email: string, password: string, name: string) {
  const { error } = await retrySb(() =>
    supabase.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { name } }),
  )
  if (error) throw error
}

export async function seedE2E(): Promise<E2EFixtures> {
  const domain = required("E2E_EMAIL_DOMAIN")
  if (domain.toLowerCase().includes("gmail.com")) throw new Error("E2E_EMAIL_DOMAIN must be a dedicated test domain.")

  await wipeE2EOrganization(E2E_SUBDOMAIN, E2E_ORG_NAME)
  await wipeE2EOrganization(E2E_OTHER_SUBDOMAIN, E2E_OTHER_ORG_NAME)
  await wipeE2EOrganization(E2E_LAB_SUBDOMAIN, E2E_LAB_ORG_NAME)
  await wipeE2EPlatformUsers(domain)
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
  const supplier = await prisma.supplier.create({
    data: { organizationId: org.id, name: "E2E Supplier", contactPerson: "Supply Person", phone: "0112000000" },
  })
  const financeCompany = await prisma.financeCompany.create({
    data: { organizationId: org.id, name: "E2E Finance", contactNo: "0112111111", defaultCommissionRate: 3 },
  })
  const insuranceCompany = await prisma.insuranceCompany.create({
    data: { organizationId: org.id, name: "E2E Insurance", contactNo: "0112222222", defaultCommissionRate: 2 },
  })
  await prisma.commissionSettings.create({ data: { organizationId: org.id, fullInsuranceCommission: 2000 } })

  const userDefs: Record<Exclude<RoleKey, "platformAdmin" | "otherOwner" | "labOwnerA" | "labOwnerB">, { role: "OrgAdmin" | "BranchManager" | "Cashier" | "SalesRep"; name: string; branchId: string | null; permissions: string[]; envKey: string }> = {
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
    // Can open the supplier screens but may not record payments (RECORD_PAYMENTS missing).
    supplierViewer: {
      role: "SalesRep",
      name: "E2E Supplier Viewer",
      branchId: branchA.id,
      permissions: ["MANAGE_SUPPLIERS"],
      envKey: "E2E_PASSWORD_SUPPLIER_VIEWER",
    },
    depositStaffA: {
      role: "Cashier",
      name: "E2E Deposit Staff A",
      branchId: branchA.id,
      permissions: ["MANAGE_BANK_DEPOSITS"],
      envKey: "E2E_PASSWORD_DEPOSIT_STAFF_A",
    },
    // Receives stock into Branch B (and may only dispatch out of Branch B).
    transferStaffB: {
      role: "Cashier",
      name: "E2E Transfer Staff B",
      branchId: branchB.id,
      permissions: ["TRANSFER_STOCK"],
      envKey: "E2E_PASSWORD_TRANSFER_STAFF_B",
    },
    depositStaffB: {
      role: "Cashier",
      name: "E2E Deposit Staff B",
      branchId: branchB.id,
      permissions: ["MANAGE_BANK_DEPOSITS"],
      envKey: "E2E_PASSWORD_DEPOSIT_STAFF_B",
    },
  }

  const users = {} as E2EFixtures["users"]
  for (const key of Object.keys(userDefs) as Array<keyof typeof userDefs>) {
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
    // phase 2: customer advances
    ["advUse", "E2E Advance Use Customer", "910000001V"],
    ["advRefund", "E2E Advance Refund Customer", "910000002V"],
    ["advFrom", "E2E Advance Source Customer", "910000003V"],
    ["advTo", "E2E Advance Target Customer", "910000004V"],
    ["advUsed", "E2E Advance Used Customer", "910000005V"],
    // phase 2: sales for deposits, commission settlement and DMT
    ["depositSale", "E2E Deposit Customer", "920000001V"],
    ["commFinance", "E2E Commission Finance Customer", "920000002V"],
    ["commInsurance", "E2E Commission Insurance Customer", "920000003V"],
    // client updates phase 1: sale charges, TIN, history filters, advances without a bike in stock
    ["chargeBuyer", "E2E Charge Customer", "930000001V"],
    ["tinBuyer", "E2E TIN Customer", "930000002V"],
    ["histBuyer", "E2E History Customer", "930000003V"],
    ["advModel", "E2E Model Advance Customer", "930000004V"],
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
    // phase 2
    ["E2E-STOCK-ADV-01", branchA.id],
    ["E2E-STOCK-ADV-02", branchA.id],
    ["E2E-STOCK-ADV-03", branchA.id],
    ["E2E-STOCK-DEP-01", branchB.id],
    ["E2E-STOCK-COMM-01", branchA.id],
    ["E2E-STOCK-COMM-02", branchA.id],
    ["E2E-STOCK-XFER-01", branchA.id],
    ["E2E-STOCK-XFER-02", branchA.id],
    ["E2E-STOCK-XFER-03", branchA.id],
    ["E2E-STOCK-XFER-04", branchA.id],
    // client updates phase 1
    ["E2E-STOCK-CHG-01", branchA.id],
    ["E2E-STOCK-CHG-02", branchA.id],
    ["E2E-STOCK-CHG-03", branchA.id],
    ["E2E-STOCK-TIN-01", branchA.id],
    ["E2E-STOCK-TIN-02", branchA.id],
    ["E2E-STOCK-TIN-03", branchA.id],
    ["E2E-STOCK-HIST-01", branchA.id],
    ["E2E-STOCK-HIST-02", branchA.id],
    ["E2E-STOCK-HIST-03", branchA.id],
    ["E2E-STOCK-HIST-04", branchA.id],
    ["E2E-STOCK-ADVM-01", branchA.id],
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

  // Phase 2: GRNs payable to the supplier (each owes 100,000), in Branch A.
  const supplierGrns: E2EFixtures["supplierGrns"] = {}
  const grnKeys = ["full", "partial", "splitA", "splitB", "over", "advTarget", "chequeLife", "chequeBounce", "chequeCancel", "overAlloc"]
  for (const [index, key] of grnKeys.entries()) {
    const grnNumber = `E2E SG${String(index + 1).padStart(2, "0")}`
    const grn = await prisma.gRN.create({
      data: {
        organizationId: org.id,
        branchId: branchA.id,
        supplierId: supplier.id,
        grnNumber,
        totalAmount: 100000,
        balanceAmount: 100000,
        paidAmount: 0,
        paymentStatus: "UNPAID",
        // Stagger the dates so "oldest first" is deterministic.
        date: new Date(Date.UTC(2026, 9, index + 1)),
        receivedDate: new Date(Date.UTC(2026, 9, index + 1)),
      },
    })
    supplierGrns[key] = { id: grn.id, grnNumber, total: 100000 }
  }

  // Phase 2: in-stock bikes of known age for the inventory aging report (age comes from the GRN received date).
  const DAY = 24 * 60 * 60 * 1000
  const agingBikes: E2EFixtures["agingBikes"] = []
  for (const [days, tier] of [[10, "fresh"], [45, "aging"], [75, "warning"], [120, "critical"]] as const) {
    const grnNumber = `E2E AGE${String(days).padStart(3, "0")}`
    const chassisNumber = `E2E-AGE-${String(days).padStart(3, "0")}`
    const received = new Date(Date.now() - days * DAY)
    const grn = await prisma.gRN.create({
      data: { organizationId: org.id, branchId: branchA.id, grnNumber, date: received, receivedDate: received },
    })
    const vehicle = await prisma.vehicle.create({
      data: {
        organizationId: org.id,
        branchId: branchA.id,
        grnId: grn.id,
        vehicleModelId: model.id,
        chassisNumber,
        motorNumber: `M-${chassisNumber}`,
        batterySerialNumber: `BAT-${chassisNumber}`,
        color: "Black",
        status: "AVAILABLE",
        purchasePrice: 400000,
      },
    })
    await prisma.gRNItem.create({ data: { grnId: grn.id, vehicleId: vehicle.id, unitPrice: 400000 } })
    agingBikes.push({ days, chassisNumber, grnNumber, tier })
  }

  // A second dealership owned by the suite ("E2E Other Motors"), used to prove tenant isolation and as a target for
  // owner enable/disable. No real dealership (e.g. Jayakodi Motors) is ever read or written.
  const otherOrg = await prisma.organization.create({
    data: {
      businessName: E2E_OTHER_ORG_NAME,
      domain: "e2e-other.local",
      subdomain: E2E_OTHER_SUBDOMAIN,
      subscriptionPlan: "Pro",
      subscriptionStatus: "Active",
    },
  })
  const otherBranch = await prisma.branch.create({ data: { organizationId: otherOrg.id, name: "E2E Other Branch", location: "Galle" } })
  const otherModel = await prisma.vehicleModel.create({
    data: { organizationId: otherOrg.id, brand: "E2E Other", modelName: "Other Scooter", defaultPrice: 450000 },
  })
  await prisma.vehicle.create({
    data: {
      organizationId: otherOrg.id,
      branchId: otherBranch.id,
      vehicleModelId: otherModel.id,
      chassisNumber: "E2E-OTHER-ORG-01",
      motorNumber: "M-E2E-OTHER-ORG-01",
      batterySerialNumber: "BAT-E2E-OTHER-ORG-01",
      color: "Black",
      status: "AVAILABLE",
      purchasePrice: 350000,
    },
  })
  const otherOwnerPassword = required("E2E_PASSWORD_OTHER_OWNER")
  const otherOwnerEmail = `otherowner@${domain}`
  await createAuthUser(otherOwnerEmail, otherOwnerPassword, "E2E Other Owner")
  await prisma.user.create({
    data: { organizationId: otherOrg.id, branchId: otherBranch.id, email: otherOwnerEmail, name: "E2E Other Owner", passwordHash: "", role: "OrgAdmin" },
  })
  users.otherOwner = { email: otherOwnerEmail, name: "E2E Other Owner", password: otherOwnerPassword }

  // "E2E Owner Lab": two owners to delete. Owner A has made a sale (history); owner B has no records at all.
  const labOrg = await prisma.organization.create({
    data: {
      businessName: E2E_LAB_ORG_NAME,
      domain: "e2e-owners.local",
      subdomain: E2E_LAB_SUBDOMAIN,
      subscriptionPlan: "Pro",
      subscriptionStatus: "Active",
    },
  })
  const labBranch = await prisma.branch.create({ data: { organizationId: labOrg.id, name: "E2E Lab Branch", location: "Matara" } })
  const labModel = await prisma.vehicleModel.create({
    data: { organizationId: labOrg.id, brand: "E2E Lab", modelName: "Lab Scooter", defaultPrice: 400000 },
  })
  const labOwnerDefs = [
    ["labOwnerA", "E2E Lab Owner A", "E2E_PASSWORD_LAB_OWNER_A"],
    ["labOwnerB", "E2E Lab Owner B", "E2E_PASSWORD_LAB_OWNER_B"],
  ] as const
  const labUsers: Record<string, string> = {}
  for (const [key, name, envKey] of labOwnerDefs) {
    const email = `${key.toLowerCase()}@${domain}`
    const password = required(envKey)
    await createAuthUser(email, password, name)
    const created = await prisma.user.create({
      data: { organizationId: labOrg.id, branchId: labBranch.id, email, name, passwordHash: "", role: "OrgAdmin" },
    })
    labUsers[key] = created.id
    users[key] = { email, name, password }
  }
  const labCustomer = await prisma.customer.create({
    data: { organizationId: labOrg.id, category: "DIRECT", customerType: "SALE", name: "E2E Lab Customer", phone: "0770000000", nic: "930000001V" },
  })
  const labVehicle = await prisma.vehicle.create({
    data: {
      organizationId: labOrg.id,
      branchId: labBranch.id,
      vehicleModelId: labModel.id,
      chassisNumber: "E2E-LAB-ORG-01",
      motorNumber: "M-E2E-LAB-ORG-01",
      batterySerialNumber: "BAT-E2E-LAB-ORG-01",
      color: "Black",
      status: "Sold",
      purchasePrice: 300000,
    },
  })
  await prisma.sale.create({
    data: {
      organizationId: labOrg.id,
      branchId: labBranch.id,
      customerId: labCustomer.id,
      userId: labUsers.labOwnerA,
      vehicleId: labVehicle.id,
      invoiceNumber: `INV-E2E-LAB-${Date.now()}`,
      totalAmount: 400000,
      paymentMethod: "Cash",
      paymentType: "CASH",
    },
  })

  // The platform operator used by the owner-management specs (signs in at /admin-portal/login).
  const platformPassword = required("E2E_PASSWORD_PLATFORM_ADMIN")
  const platformEmail = `platformadmin@${domain}`
  await createAuthUser(platformEmail, platformPassword, "E2E Platform Admin")
  await prisma.platformUser.create({
    data: { email: platformEmail, name: "E2E Platform Admin", passwordHash: "", role: "PlatformAdmin" },
  })
  users.platformAdmin = { email: platformEmail, name: "E2E Platform Admin", password: platformPassword }

  const fixtures: E2EFixtures = {
    orgId: org.id,
    branchA: { id: branchA.id, name: branchA.name },
    branchB: { id: branchB.id, name: branchB.name },
    financeCompany: { id: financeCompany.id, name: financeCompany.name, rate: 3 },
    insuranceCompany: { id: insuranceCompany.id, name: insuranceCompany.name },
    fullInsuranceCommission: 2000,
    users,
    customers,
    otherOrg: { id: otherOrg.id, name: otherOrg.businessName, chassisNumber: "E2E-OTHER-ORG-01", modelName: otherModel.modelName },
    labOrg: { id: labOrg.id, name: labOrg.businessName },
    supplier: { id: supplier.id, name: supplier.name },
    supplierGrns,
    agingBikes,
  }
  fs.mkdirSync(path.dirname(FIXTURES_PATH), { recursive: true })
  fs.writeFileSync(FIXTURES_PATH, JSON.stringify(fixtures, null, 2))
  return fixtures
}

export async function disconnectSeed() {
  await prisma.$disconnect()
}
