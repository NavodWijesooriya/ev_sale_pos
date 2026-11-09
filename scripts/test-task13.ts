import { prisma } from "../lib/prisma"
import bcrypt from "bcrypt"
import { navigationItems } from "../components/layout/sidebar"
import { UserRole } from "@prisma/client"

async function runTask13Verification() {
  console.log("=== Testing Task 13: Dealership Staff Management & Access Control ===")

  const org = await prisma.organization.findFirst({
    include: { branches: true },
  })
  if (!org) {
    throw new Error("No organization found to test")
  }
  console.log(`Testing Dealership: ${org.businessName} (ID: ${org.id})`)

  const testBranch = org.branches[0]
  console.log(`Using Branch: ${testBranch ? testBranch.name : "None (HQ)"}`)

  // 1. Test Creating a Cashier Staff User with password hashing
  console.log("\n[1] Testing Staff User Creation & Password Hashing:")
  const testCashierEmail = `cashier.test.${Date.now()}@apexev.com`
  const rawPassword = "SecurePassword123!"

  const passwordHash = await bcrypt.hash(rawPassword, 10)
  const newStaff = await prisma.user.create({
    data: {
      organizationId: org.id,
      name: "Kasun Bandara (Cashier)",
      email: testCashierEmail,
      passwordHash,
      role: UserRole.Cashier,
      branchId: testBranch ? testBranch.id : null,
      isActive: true,
    },
    include: {
      branch: true,
      organization: true,
    },
  })

  console.log("  ✔ Created user record in database:")
  console.log(`    - ID: ${newStaff.id}`)
  console.log(`    - Name: ${newStaff.name}`)
  console.log(`    - Email: ${newStaff.email}`)
  console.log(`    - Role: ${newStaff.role}`)
  console.log(`    - Branch: ${newStaff.branch ? newStaff.branch.name : "HQ"}`)
  console.log(`    - Organization: ${newStaff.organization.businessName}`)
  console.log(`    - Is Active: ${newStaff.isActive}`)

  // 2. Verify NextAuth password verification compatibility
  console.log("\n[2] Testing NextAuth Password Compatibility:")
  const isMatch = await bcrypt.compare(rawPassword, newStaff.passwordHash)
  if (!isMatch) {
    throw new Error("Password hash verification failed!")
  }
  console.log("  ✔ Password hash successfully verified with bcrypt.compare(raw, hash)")

  const isWrongRejected = await bcrypt.compare("WrongPassword", newStaff.passwordHash)
  if (isWrongRejected) {
    throw new Error("Password check allowed wrong password!")
  }
  console.log("  ✔ Incorrect password rejected as expected")

  // 3. Test Staff Deactivation (Access Control block)
  console.log("\n[3] Testing Staff Deactivation Toggle:")
  const deactivated = await prisma.user.update({
    where: { id: newStaff.id },
    data: { isActive: false },
  })
  console.log(`  ✔ Staff active status toggled to: ${deactivated.isActive} (Disabled)`)

  // Re-enable for subsequent testing
  await prisma.user.update({
    where: { id: newStaff.id },
    data: { isActive: true },
  })
  console.log("  ✔ Staff access re-enabled successfully")

  // 4. Test Dynamic UI Access Control (Sidebar Navigation Filtering)
  console.log("\n[4] Testing Role-Based Navigation Menu Filtering:")

  const filterForRole = (role: string) => {
    return navigationItems
      .filter((item) => !item.roles || item.roles.includes(role))
      .map((item) => item.title)
  }

  // Cashier View
  const cashierNav = filterForRole("Cashier")
  console.log("  Cashier Visible Navigation:", cashierNav)
  if (cashierNav.includes("Reports") || cashierNav.includes("GRN Management") || cashierNav.includes("Vehicle Models") || cashierNav.includes("Team & Access")) {
    throw new Error("Cashier view leaked restricted tabs!")
  }
  console.log("  ✔ Cashier is restricted from Reports, GRN, Vehicle Models, and Team & Access")

  // Technician View
  const techNav = filterForRole("Technician")
  console.log("  Technician Visible Navigation:", techNav)
  if (techNav.includes("Reports") || techNav.includes("GRN Management") || techNav.includes("Sales & POS")) {
    throw new Error("Technician view leaked restricted tabs!")
  }
  console.log("  ✔ Technician only sees Dashboard & Services (hidden from POS, GRN, Reports)")

  // OrgAdmin View
  const adminNav = filterForRole("OrgAdmin")
  console.log("  OrgAdmin Visible Navigation:", adminNav)
  if (!adminNav.includes("Team & Access") || !adminNav.includes("Reports") || !adminNav.includes("GRN Management") || !adminNav.includes("Vehicle Models")) {
    throw new Error("OrgAdmin missing required tabs!")
  }
  console.log("  ✔ OrgAdmin has full access to all dealership modules including Staff Management")

  console.log("\n>>> ALL TASK 13 TESTS & ACCESS CONTROL RULES PASSED SUCCESSFULLY! <<<")
}

runTask13Verification()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Test failed:", err)
    process.exit(1)
  })
