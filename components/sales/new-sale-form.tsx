"use client"

import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { CustomerType } from "@prisma/client"
import {
  ArrowRight,
  Bike,
  Check,
  ChevronsUpDown,
  CircleDollarSign,
  LoaderCircle,
  Search,
  UserRound,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { Controller, useForm, useWatch } from "react-hook-form"
import { toast } from "sonner"
import { createNewSale, getPendingCustomerAdvance } from "@/app/actions/sales"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { formatLKR } from "@/lib/currency"
import {
  createNewSaleSchema,
  FREE_SALE_ITEMS,
  extendedWarrantyPrice,
  salePaymentMethods,
  saleWarrantyOptions,
  type CreateNewSaleInput,
} from "@/lib/validations/new-sale"

interface VehicleModelData {
  id: string
  brand: string
  modelName: string
  imageUrl?: string | null
  batteryCapacity?: string | null
  range?: string | null
  defaultPrice: number
  minDownPayment?: number | null
}

interface BranchData {
  id: string
  name: string
  location?: string | null
}

export interface InStockVehicle {
  id: string
  chassisNumber: string
  motorNumber?: string | null
  color?: string | null
  purchasePrice: number
  branchId: string
  branch: BranchData
  vehicleModel: VehicleModelData
}

export interface CustomerData {
  id: string
  customerType: CustomerType
  name: string
  phone: string
  email?: string | null
  nic?: string | null
  address?: string | null
}

interface NewSaleFormProps {
  vehicles: InStockVehicle[]
  customers: CustomerData[]
  branches?: BranchData[]
  recentSales?: Array<{
    id: string
    customerName: string
    vehicleName: string
    chassisNumber?: string
    totalAmount: number
    date: string
  }>
  onSaleComplete?: (saleId?: string) => void
}

const defaultValues: CreateNewSaleInput = {
  customerId: "",
  vehicleId: "",
  paymentMethod: "Cash",
  warrantyOption: saleWarrantyOptions[0],
  freeItems: [],
  freeServices: 3,
  advancePaymentId: "",
}

export function NewSaleForm({
  vehicles,
  customers,
  onSaleComplete,
}: NewSaleFormProps) {
  const router = useRouter()
  const [customerQuery, setCustomerQuery] = React.useState("")
  const [vehicleQuery, setVehicleQuery] = React.useState("")
  const [customerPickerOpen, setCustomerPickerOpen] = React.useState(false)
  const [vehiclePickerOpen, setVehiclePickerOpen] = React.useState(false)
  const [pendingAdvance, setPendingAdvance] = React.useState<{
    id: string
    amount: number
  } | null>(null)
  const [isLoadingAdvance, setIsLoadingAdvance] = React.useState(false)
  const advanceRequestId = React.useRef(0)
  const form = useForm<CreateNewSaleInput>({
    resolver: zodResolver(createNewSaleSchema),
    defaultValues,
  })
  const customerId = useWatch({ control: form.control, name: "customerId" })
  const vehicleId = useWatch({ control: form.control, name: "vehicleId" })
  const advancePaymentId = useWatch({ control: form.control, name: "advancePaymentId" })
  const warrantyOption = useWatch({ control: form.control, name: "warrantyOption" })
  const selectedCustomer = customers.find((customer) => customer.id === customerId)
  const selectedVehicle = vehicles.find((vehicle) => vehicle.id === vehicleId)
  const subtotal = selectedVehicle?.vehicleModel.defaultPrice ?? 0
  const warrantyCharge =
    warrantyOption === saleWarrantyOptions[1] ? extendedWarrantyPrice : 0
  const advanceDeduction =
    pendingAdvance && advancePaymentId === pendingAdvance.id ? pendingAdvance.amount : 0
  const finalTotal = Math.max(0, subtotal + warrantyCharge - advanceDeduction)

  const filteredCustomers = customers.filter((customer) => {
    const query = customerQuery.trim().toLocaleLowerCase()
    return (
      !query ||
      customer.name.toLocaleLowerCase().includes(query) ||
      customer.phone.toLocaleLowerCase().includes(query) ||
      customer.nic?.toLocaleLowerCase().includes(query)
    )
  })
  const filteredVehicles = vehicles.filter((vehicle) => {
    const query = vehicleQuery.trim().toLocaleLowerCase()
    return (
      !query ||
      vehicle.chassisNumber.toLocaleLowerCase().includes(query) ||
      vehicle.vehicleModel.brand.toLocaleLowerCase().includes(query) ||
      vehicle.vehicleModel.modelName.toLocaleLowerCase().includes(query) ||
      vehicle.color?.toLocaleLowerCase().includes(query) ||
      vehicle.branch.name.toLocaleLowerCase().includes(query)
    )
  })

  async function selectCustomer(id: string) {
    advanceRequestId.current += 1
    const requestId = advanceRequestId.current
    form.setValue("customerId", id, { shouldDirty: true, shouldValidate: true })
    form.setValue("advancePaymentId", "", { shouldDirty: true })
    setPendingAdvance(null)
    setCustomerQuery("")
    setCustomerPickerOpen(false)
    setIsLoadingAdvance(true)

    try {
      const advance = await getPendingCustomerAdvance(id)
      if (requestId !== advanceRequestId.current) return
      setPendingAdvance(advance)
      if (advance) {
        form.setValue("advancePaymentId", advance.id, {
          shouldDirty: true,
          shouldValidate: true,
        })
      }
    } catch (error) {
      if (requestId === advanceRequestId.current) {
        console.error("Could not check for a pending customer advance:", error)
        toast.error("Could not check this customer's pending advance.")
      }
    } finally {
      if (requestId === advanceRequestId.current) setIsLoadingAdvance(false)
    }
  }

  async function onSubmit(values: CreateNewSaleInput) {
    try {
      const result = await createNewSale(values)
      if (!result.success) {
        toast.error(result.error)
        return
      }

      toast.success(`Sale completed. Invoice ${result.invoiceNumber} is ready.`)
      form.reset(defaultValues)
      setPendingAdvance(null)
      setCustomerQuery("")
      setVehicleQuery("")
      if (onSaleComplete) {
        onSaleComplete(result.saleId)
      } else {
        router.push(`/dashboard/sales/${result.saleId}/invoice`)
        router.refresh()
      }
    } catch (error) {
      console.error("Sale submission failed:", error)
      toast.error("Unable to complete this sale. Please try again.")
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6" noValidate>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-6">
          <Card className="overflow-visible rounded-2xl border-border/70 shadow-sm">
            <CardHeader>
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <UserRound className="size-5" />
                </span>
                <div>
                  <CardTitle>Customer & vehicle</CardTitle>
                  <CardDescription>Select a registered customer and available EV.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="grid gap-6 lg:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="sale-customer">Customer</Label>
                <div className="relative">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="sale-customer"
                      role="combobox"
                      aria-expanded={customerPickerOpen}
                      aria-controls="sale-customer-options"
                      aria-invalid={Boolean(form.formState.errors.customerId)}
                      autoComplete="off"
                      placeholder={selectedCustomer?.name ?? "Search by name, phone, or NIC"}
                      value={customerQuery}
                      onFocus={() => setCustomerPickerOpen(true)}
                      onBlur={() => setTimeout(() => setCustomerPickerOpen(false), 120)}
                      onChange={(event) => {
                        setCustomerQuery(event.target.value)
                        setCustomerPickerOpen(true)
                      }}
                      className="pl-9 pr-9"
                    />
                    <ChevronsUpDown className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  </div>
                  {customerPickerOpen && (
                    <div
                      id="sale-customer-options"
                      role="listbox"
                      aria-label="Customers"
                      className="absolute z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-xl border bg-popover p-1 shadow-lg"
                    >
                      {filteredCustomers.length ? (
                        filteredCustomers.slice(0, 30).map((customer) => (
                          <button
                            key={customer.id}
                            type="button"
                            role="option"
                            aria-selected={customer.id === customerId}
                            className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm hover:bg-accent"
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => void selectCustomer(customer.id)}
                          >
                            <span className="min-w-0">
                              <span className="block truncate font-medium">{customer.name}</span>
                              <span className="block truncate text-xs text-muted-foreground">
                                {customer.phone}{customer.nic ? ` · ${customer.nic}` : ""}
                              </span>
                            </span>
                            {customer.id === customerId && <Check className="size-4 text-primary" />}
                          </button>
                        ))
                      ) : (
                        <p className="px-3 py-5 text-center text-sm text-muted-foreground">
                          No matching customers found.
                        </p>
                      )}
                    </div>
                  )}
                </div>
                {form.formState.errors.customerId && (
                  <p role="alert" className="text-xs text-destructive">
                    {form.formState.errors.customerId.message}
                  </p>
                )}
                {selectedCustomer && (
                  <p className="text-xs text-muted-foreground">
                    {selectedCustomer.phone}
                    {selectedCustomer.nic ? ` · NIC ${selectedCustomer.nic}` : ""}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="sale-vehicle-search">Available vehicle</Label>
                <div className="relative">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="sale-vehicle-search"
                      role="combobox"
                      aria-expanded={vehiclePickerOpen}
                      aria-controls="sale-vehicle-options"
                      aria-invalid={Boolean(form.formState.errors.vehicleId)}
                      autoComplete="off"
                      placeholder={
                        selectedVehicle
                          ? `${selectedVehicle.vehicleModel.brand} ${selectedVehicle.vehicleModel.modelName}`
                          : "Search model, chassis, color, or showroom"
                      }
                      value={vehicleQuery}
                      onFocus={() => setVehiclePickerOpen(true)}
                      onBlur={() => setTimeout(() => setVehiclePickerOpen(false), 120)}
                      onChange={(event) => {
                        setVehicleQuery(event.target.value)
                        setVehiclePickerOpen(true)
                      }}
                      className="pl-9 pr-9"
                    />
                    <ChevronsUpDown className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  </div>
                  {vehiclePickerOpen && (
                    <div
                      id="sale-vehicle-options"
                      role="listbox"
                      aria-label="Available vehicles"
                      className="absolute z-50 mt-1 max-h-72 w-full overflow-y-auto rounded-xl border bg-popover p-1 shadow-lg"
                    >
                      {filteredVehicles.length ? (
                        filteredVehicles.slice(0, 30).map((vehicle) => (
                          <button
                            key={vehicle.id}
                            type="button"
                            role="option"
                            aria-selected={vehicle.id === vehicleId}
                            className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left text-sm hover:bg-accent"
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => {
                              form.setValue("vehicleId", vehicle.id, {
                                shouldDirty: true,
                                shouldValidate: true,
                              })
                              setVehicleQuery("")
                              setVehiclePickerOpen(false)
                            }}
                          >
                            <span className="min-w-0">
                              <span className="block truncate font-medium">
                                {vehicle.vehicleModel.brand} {vehicle.vehicleModel.modelName}
                                {vehicle.color ? ` · ${vehicle.color}` : ""}
                              </span>
                              <span className="block truncate text-xs text-muted-foreground">
                                {vehicle.chassisNumber} · {vehicle.branch.name}
                              </span>
                            </span>
                            <span className="shrink-0 text-xs font-semibold tabular-nums">
                              {formatLKR(vehicle.vehicleModel.defaultPrice)}
                            </span>
                          </button>
                        ))
                      ) : (
                        <p className="px-3 py-5 text-center text-sm text-muted-foreground">
                          {vehicles.length ? "No matching vehicles found." : "No available vehicles in stock."}
                        </p>
                      )}
                    </div>
                  )}
                </div>
                {form.formState.errors.vehicleId && (
                  <p role="alert" className="text-xs text-destructive">
                    {form.formState.errors.vehicleId.message}
                  </p>
                )}
                {selectedVehicle && (
                  <p className="text-xs text-muted-foreground">
                    Chassis {selectedVehicle.chassisNumber} · {selectedVehicle.branch.name}
                  </p>
                )}
              </div>

              {selectedVehicle && (
                <div className="flex items-center gap-3 rounded-xl border bg-muted/30 p-4 lg:col-span-2">
                  <span className="flex size-10 items-center justify-center rounded-xl bg-background text-primary shadow-xs">
                    <Bike className="size-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">
                      {selectedVehicle.vehicleModel.brand} {selectedVehicle.vehicleModel.modelName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {selectedVehicle.color || "Color not specified"} · {selectedVehicle.branch.name}
                    </p>
                  </div>
                  <p className="text-right text-sm font-bold tabular-nums">
                    {formatLKR(subtotal)}
                    <span className="block text-[10px] font-normal text-muted-foreground">Vehicle price</span>
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-border/70 shadow-sm">
            <CardHeader>
              <CardTitle>Complimentary add-ons</CardTitle>
              <CardDescription>Record the items and free services included with the sale.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6 md:grid-cols-[minmax(0,1fr)_12rem]">
              <div className="space-y-3">
                <Label>Free items</Label>
                <Controller
                  name="freeItems"
                  control={form.control}
                  render={({ field }) => (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {FREE_SALE_ITEMS.map((item) => {
                        const checked = field.value.includes(item)
                        const id = `sale-addon-${item.toLowerCase().replaceAll(" ", "-")}`
                        return (
                          <div key={item} className="flex items-center gap-2.5">
                            <Checkbox
                              id={id}
                              checked={checked}
                              onCheckedChange={(nextChecked) =>
                                field.onChange(
                                  nextChecked
                                    ? [...field.value, item]
                                    : field.value.filter((selected) => selected !== item),
                                )
                              }
                            />
                            <Label htmlFor={id} className="cursor-pointer text-sm font-normal">
                              {item}
                            </Label>
                          </div>
                        )
                      })}
                    </div>
                  )}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sale-free-services">Free services</Label>
                <Input
                  id="sale-free-services"
                  type="number"
                  min={0}
                  max={20}
                  step={1}
                  {...form.register("freeServices", { valueAsNumber: true })}
                  aria-invalid={Boolean(form.formState.errors.freeServices)}
                />
                <p className="text-xs text-muted-foreground">Complimentary service visits included.</p>
                {form.formState.errors.freeServices && (
                  <p role="alert" className="text-xs text-destructive">
                    {form.formState.errors.freeServices.message}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <aside className="space-y-6 xl:sticky xl:top-6 xl:self-start">
          <Card className="overflow-hidden rounded-2xl border-primary/15 shadow-md">
            <CardHeader className="bg-primary/[0.04]">
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <CircleDollarSign className="size-5" />
                </span>
                <div>
                  <CardTitle>Checkout</CardTitle>
                  <CardDescription>Review the amount due and payment method.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-5 pt-5">
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium tabular-nums">{formatLKR(subtotal)}</span>
                </div>
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-muted-foreground">Advance deduction</span>
                  <span
                    className={`text-right font-medium tabular-nums ${
                      advanceDeduction > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"
                    }`}
                  >
                    {isLoadingAdvance ? (
                      <LoaderCircle className="ml-auto size-4 animate-spin" />
                    ) : advanceDeduction > 0 ? (
                      `− ${formatLKR(advanceDeduction)}`
                    ) : (
                      formatLKR(0)
                    )}
                  </span>
                </div>
                {warrantyCharge > 0 && (
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-muted-foreground">Extended warranty</span>
                    <span className="font-medium tabular-nums">
                      {formatLKR(warrantyCharge)}
                    </span>
                  </div>
                )}
                {pendingAdvance && advanceDeduction > 0 && (
                  <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-400">
                    Pending customer advance will be applied to this sale.
                  </div>
                )}
                {!isLoadingAdvance && customerId && !pendingAdvance && (
                  <p className="text-xs text-muted-foreground">No pending advance found for this customer.</p>
                )}
                <Separator />
                <div className="flex items-end justify-between gap-3">
                  <span className="text-sm font-semibold">Final total</span>
                  <span className="text-2xl font-bold tracking-tight tabular-nums">
                    {formatLKR(finalTotal)}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="sale-warranty-option">Warranty options</Label>
                <Controller
                  name="warrantyOption"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <>
                      <Select
                        value={field.value}
                        onValueChange={(value) => {
                          if (saleWarrantyOptions.some((option) => option === value)) {
                            field.onChange(value)
                          }
                        }}
                      >
                        <SelectTrigger
                          id="sale-warranty-option"
                          className="w-full"
                          aria-invalid={Boolean(fieldState.error)}
                          onBlur={field.onBlur}
                        >
                          <SelectValue placeholder="Choose a warranty option" />
                        </SelectTrigger>
                        <SelectContent>
                          {saleWarrantyOptions.map((option) => (
                            <SelectItem key={option} value={option}>
                              {option}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {fieldState.error && (
                        <p role="alert" className="text-xs text-destructive">
                          {fieldState.error.message}
                        </p>
                      )}
                    </>
                  )}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="sale-payment-method">Payment method</Label>
                <Controller
                  name="paymentMethod"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <>
                      <Select
                        value={field.value}
                        onValueChange={(value) => {
                          if (salePaymentMethods.some((method) => method === value)) field.onChange(value)
                        }}
                      >
                        <SelectTrigger
                          id="sale-payment-method"
                          className="w-full"
                          aria-invalid={Boolean(fieldState.error)}
                          onBlur={field.onBlur}
                        >
                          <SelectValue placeholder="Choose payment method" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Cash">Cash</SelectItem>
                          <SelectItem value="Leasing">Leasing</SelectItem>
                          <SelectItem value="Card">Card</SelectItem>
                          <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                        </SelectContent>
                      </Select>
                      {fieldState.error && (
                        <p role="alert" className="text-xs text-destructive">
                          {fieldState.error.message}
                        </p>
                      )}
                    </>
                  )}
                />
              </div>

              <Button
                type="submit"
                className="h-11 w-full gap-2 text-sm font-semibold"
                disabled={
                  form.formState.isSubmitting ||
                  isLoadingAdvance ||
                  vehicles.length === 0
                }
              >
                {form.formState.isSubmitting ? (
                  <>
                    <LoaderCircle className="size-4 animate-spin" />
                    Processing sale...
                  </>
                ) : (
                  <>
                    Complete Sale
                    <ArrowRight className="size-4" />
                  </>
                )}
              </Button>
              <p className="text-center text-[11px] leading-relaxed text-muted-foreground">
                Vehicle stock and any selected advance are checked again before checkout.
              </p>
            </CardContent>
          </Card>

          {selectedCustomer && (
            <div className="flex items-start gap-2 rounded-xl border bg-card px-4 py-3 text-xs text-muted-foreground">
              <UserRound className="mt-0.5 size-4 shrink-0 text-primary" />
              <span>
                Sale customer: <strong className="text-foreground">{selectedCustomer.name}</strong>
              </span>
              {pendingAdvance && <Badge variant="outline" className="ml-auto shrink-0">Advance</Badge>}
            </div>
          )}
        </aside>
      </div>
    </form>
  )
}
