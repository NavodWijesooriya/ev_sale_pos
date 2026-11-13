import { connection } from "next/server"
import { redirect } from "next/navigation"
import { getPOSInitialData } from "@/app/actions/sales"
import { getFinanceCompanies, getInsuranceCompanies } from "@/app/actions/finance"
import {
  type CustomerData,
  type InStockVehicle,
  type FinanceInsuranceOption,
  type StaffOption,
  NewSaleForm,
} from "@/components/sales/new-sale-form"
import { getAuthSession } from "@/lib/auth"

export const instant = false

export const metadata = {
  title: "New Sale | Ev Sale Pos",
  description: "Create a vehicle sale and complete customer checkout",
}

export default async function NewSalePage() {
  await connection()
  const session = await getAuthSession()
  if (!session?.user?.organizationId) {
    redirect("/login?callbackUrl=/dashboard/sales/new")
  }

  const [result, financeCompanies, insuranceCompanies] = await Promise.all([
    getPOSInitialData(),
    getFinanceCompanies(),
    getInsuranceCompanies(),
  ])

  if (!result.success) {
    throw new Error(result.error || "Unable to load point-of-sale data.")
  }

  const vehicles: InStockVehicle[] = result.data.vehicles.map((vehicle) => ({
    id: vehicle.id,
    chassisNumber: vehicle.chassisNumber,
    unitGrnNumber: (vehicle as any).unitGrnNumber ?? null,
    motorNumber: vehicle.motorNumber,
    color: vehicle.color,
    purchasePrice: vehicle.purchasePrice,
    branchId: vehicle.branchId,
    grnNumber: (vehicle as any).grn?.grnNumber ?? null,
    branch: {
      id: vehicle.branch.id,
      name: vehicle.branch.name,
      location: vehicle.branch.location,
    },
    vehicleModel: {
      id: vehicle.vehicleModel.id,
      brand: vehicle.vehicleModel.brand,
      modelName: vehicle.vehicleModel.modelName,
      imageUrl: vehicle.vehicleModel.imageUrl,
      batteryCapacity: vehicle.vehicleModel.batteryCapacity,
      range: vehicle.vehicleModel.rangePerCharge,
      defaultPrice: vehicle.vehicleModel.defaultPrice,
      minDownPayment: vehicle.vehicleModel.minDownPayment,
    },
  }))

  const customers: CustomerData[] = result.data.customers.map((customer) => ({
    id: customer.id,
    customerType: customer.customerType,
    name: customer.name,
    phone: customer.phone,
    email: customer.email,
    nic: customer.nic,
    address: customer.address,
  }))

  const financeOptions: FinanceInsuranceOption[] = financeCompanies.map((c) => ({
    id: c.id,
    name: c.name,
    defaultCommissionRate: c.defaultCommissionRate,
  }))

  const insuranceOptions: FinanceInsuranceOption[] = insuranceCompanies.map((c) => ({
    id: c.id,
    name: c.name,
    defaultCommissionRate: c.defaultCommissionRate,
  }))

  const staffOptions: StaffOption[] = ((result.data as any).staff ?? []).map((s: any) => ({
    id: s.id,
    name: s.name,
    email: s.email,
    role: s.role,
  }))

  return (
    <div className="mx-auto w-full max-w-[1440px] space-y-6 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <header className="space-y-1 border-b pb-5">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
          Sales Management
        </p>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">New Sale (POS)</h1>
        <p className="text-sm text-muted-foreground">
          Select a customer and available vehicle, review any advance deduction, and complete checkout.
        </p>
      </header>
      <NewSaleForm
        vehicles={vehicles}
        customers={customers}
        branches={result.data.branches.map(({ id, name, location }) => ({ id, name, location }))}
        financeCompanies={financeOptions}
        insuranceCompanies={insuranceOptions}
        staff={staffOptions}
      />
    </div>
  )
}
