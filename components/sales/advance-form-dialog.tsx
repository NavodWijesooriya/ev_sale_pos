"use client"

import * as React from "react"
import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  Bike,
  Check,
  ChevronsUpDown,
  CircleDollarSign,
  FileText,
  Loader2,
  Plus,
  Search,
  User,
  UserPlus,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { formatLKR } from "@/lib/currency"
import {
  recordAdvancePayment,
  type AvailableVehicleOption,
  type AdvancePaymentCustomerOption,
} from "@/app/actions/advances"
import { createCustomerOnTheFly } from "@/app/actions/customers"

interface AdvanceFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialCustomers: AdvancePaymentCustomerOption[]
  vehicles: AvailableVehicleOption[]
}

export function AdvanceFormDialog({
  open,
  onOpenChange,
  initialCustomers,
  vehicles,
}: AdvanceFormDialogProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // Data states
  const [customers, setCustomers] = React.useState<AdvancePaymentCustomerOption[]>(initialCustomers)

  // Selection states
  const [selectedCustomerId, setSelectedCustomerId] = React.useState<string>("")
  const [selectedVehicleId, setSelectedVehicleId] = React.useState<string>("")
  const [amount, setAmount] = React.useState<string>("")
  const [paymentMethod, setPaymentMethod] = React.useState<string>("Cash")
  const [notes, setNotes] = React.useState<string>("")

  // Combobox popover search states
  const [customerOpen, setCustomerOpen] = React.useState(false)
  const [customerQuery, setCustomerQuery] = React.useState("")
  const [vehicleOpen, setVehicleOpen] = React.useState(false)
  const [vehicleQuery, setVehicleQuery] = React.useState("")

  // Quick Customer Creation modal states
  const [newCustomerOpen, setNewCustomerOpen] = React.useState(false)
  const [newCustomerName, setNewCustomerName] = React.useState("")
  const [newCustomerPhone, setNewCustomerPhone] = React.useState("")
  const [newCustomerNic, setNewCustomerNic] = React.useState("")
  const [isCreatingCustomer, setIsCreatingCustomer] = React.useState(false)

  // Sync customers when initial list changes
  React.useEffect(() => {
    setCustomers(initialCustomers)
  }, [initialCustomers])

  // Reset form when dialog closes
  React.useEffect(() => {
    if (!open) {
      setSelectedCustomerId("")
      setSelectedVehicleId("")
      setAmount("")
      setPaymentMethod("Cash")
      setNotes("")
      setCustomerQuery("")
      setVehicleQuery("")
      setCustomerOpen(false)
      setVehicleOpen(false)
    }
  }, [open])

  // Selected entities
  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId)
  const selectedVehicle = vehicles.find((v) => v.id === selectedVehicleId)

  // Filtered customer list
  const filteredCustomers = React.useMemo(() => {
    const q = customerQuery.trim().toLowerCase()
    if (!q) return customers.slice(0, 50)
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.nic && c.nic.toLowerCase().includes(q))
    )
  }, [customers, customerQuery])

  // Filtered vehicle list
  const filteredVehicles = React.useMemo(() => {
    const q = vehicleQuery.trim().toLowerCase()
    if (!q) return vehicles.slice(0, 50)
    return vehicles.filter(
      (v) =>
        v.chassisNumber.toLowerCase().includes(q) ||
        v.vehicleModel.brand.toLowerCase().includes(q) ||
        v.vehicleModel.modelName.toLowerCase().includes(q) ||
        (v.color && v.color.toLowerCase().includes(q))
    )
  }, [vehicles, vehicleQuery])

  const hasExactCustomerMatch = customers.some(
    (c) => c.name.toLowerCase() === customerQuery.trim().toLowerCase()
  )

  function openCreateCustomerModal(presetName?: string) {
    setNewCustomerName(presetName || customerQuery.trim())
    setNewCustomerPhone("")
    setNewCustomerNic("")
    setCustomerOpen(false)
    setNewCustomerOpen(true)
  }

  async function handleCreateCustomer(e: React.FormEvent) {
    e.preventDefault()
    if (!newCustomerName.trim()) {
      toast.error("Customer name is required.")
      return
    }
    if (!newCustomerPhone.trim()) {
      toast.error("Customer phone number is required.")
      return
    }

    setIsCreatingCustomer(true)
    try {
      const res = await createCustomerOnTheFly({
        name: newCustomerName.trim(),
        phone: newCustomerPhone.trim(),
        nic: newCustomerNic.trim() || null,
      })

      if (res.success && res.customer) {
        const created: AdvancePaymentCustomerOption = {
          id: res.customer.id,
          name: res.customer.name,
          nic: res.customer.nic,
        }

        setCustomers((prev) => [created, ...prev])
        setSelectedCustomerId(created.id)
        setCustomerQuery("")
        setNewCustomerOpen(false)
        toast.success(`Customer "${created.name}" created and selected!`)
      } else {
        toast.error(res.error || "Failed to create customer.")
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to create customer.")
    } finally {
      setIsCreatingCustomer(false)
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!selectedCustomerId) {
      toast.error("Please select or create a customer.")
      return
    }

    const numericAmount = Number(amount)
    if (!numericAmount || numericAmount <= 0) {
      toast.error("Please enter a valid advance payment amount.")
      return
    }

    startTransition(async () => {
      try {
        const res = await recordAdvancePayment({
          customerId: selectedCustomerId,
          vehicleId: selectedVehicleId || null,
          amount: numericAmount,
          paymentMethod,
          notes: notes.trim() || null,
          branchId: selectedVehicle?.branchId || null,
        })

        if (!res.success) {
          toast.error(res.error || "Failed to record advance payment.")
          return
        }

        toast.success("Advance payment recorded successfully!")
        onOpenChange(false)
        router.refresh()
      } catch (err: any) {
        toast.error(err.message || "An unexpected error occurred.")
      }
    })
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CircleDollarSign className="size-5 text-primary" />
              <span>Record Advance Payment</span>
            </DialogTitle>
            <DialogDescription>
              Book an advance deposit by selecting an existing customer or creating a new customer on the fly.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 pt-1">
            {/* 1. Customer Combobox Field */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="adv-customer-search">Customer *</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs text-primary gap-1 px-1.5"
                  onClick={() => openCreateCustomerModal()}
                >
                  <Plus className="size-3" />
                  <span>New Customer</span>
                </Button>
              </div>

              <div className="relative">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="adv-customer-search"
                    role="combobox"
                    aria-expanded={customerOpen}
                    autoComplete="off"
                    placeholder={
                      selectedCustomer
                        ? `${selectedCustomer.name}${selectedCustomer.nic ? ` (NIC: ${selectedCustomer.nic})` : ""}`
                        : "Search existing customer by name or NIC..."
                    }
                    value={customerQuery}
                    onFocus={() => setCustomerOpen(true)}
                    onBlur={() => setTimeout(() => setCustomerOpen(false), 200)}
                    onChange={(e) => {
                      setCustomerQuery(e.target.value)
                      setCustomerOpen(true)
                    }}
                    className="pl-9 pr-9 bg-background"
                  />
                  <ChevronsUpDown className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                </div>

                {/* Customer Dropdown */}
                {customerOpen && (
                  <div
                    role="listbox"
                    className="absolute z-50 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border bg-popover p-1 shadow-lg"
                  >
                    {filteredCustomers.length > 0 ? (
                      filteredCustomers.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          role="option"
                          aria-selected={c.id === selectedCustomerId}
                          className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs hover:bg-accent"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => {
                            setSelectedCustomerId(c.id)
                            setCustomerQuery("")
                            setCustomerOpen(false)
                          }}
                        >
                          <div className="min-w-0">
                            <div className="font-medium text-foreground">{c.name}</div>
                            {c.nic && (
                              <div className="text-[11px] text-muted-foreground">NIC: {c.nic}</div>
                            )}
                          </div>
                          {c.id === selectedCustomerId && (
                            <Check className="size-4 text-primary shrink-0" />
                          )}
                        </button>
                      ))
                    ) : (
                      <div className="p-3 text-center text-xs text-muted-foreground">
                        No customer found matching "{customerQuery}".
                      </div>
                    )}

                    {/* Inline Create New Customer */}
                    {customerQuery.trim().length > 0 && !hasExactCustomerMatch && (
                      <div className="border-t p-1 mt-1">
                        <button
                          type="button"
                          className="flex w-full items-center gap-2 rounded-lg bg-primary/10 px-3 py-2 text-left text-xs font-medium text-primary hover:bg-primary/15 transition-colors"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => openCreateCustomerModal(customerQuery.trim())}
                        >
                          <UserPlus className="size-3.5" />
                          <span>Create New Customer: "{customerQuery.trim()}"</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {selectedCustomer && (
                <div className="flex items-center justify-between rounded-lg border bg-muted/40 px-3 py-1.5 text-xs">
                  <span className="font-medium">{selectedCustomer.name}</span>
                  {selectedCustomer.nic && (
                    <span className="text-muted-foreground">NIC: {selectedCustomer.nic}</span>
                  )}
                </div>
              )}
            </div>

            {/* 2. Vehicle Search Combobox (by Chassis Number / Model) */}
            <div className="space-y-2">
              <Label htmlFor="adv-vehicle-search">Vehicle Chassis / Model (Optional)</Label>
              <div className="relative">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="adv-vehicle-search"
                    role="combobox"
                    aria-expanded={vehicleOpen}
                    autoComplete="off"
                    placeholder={
                      selectedVehicle
                        ? `Chassis: ${selectedVehicle.chassisNumber} · ${selectedVehicle.vehicleModel.brand} ${selectedVehicle.vehicleModel.modelName}`
                        : "Search available bike by Unit GRN (e.g. JM0102), Chassis, or Model..."
                    }
                    value={vehicleQuery}
                    onFocus={() => setVehicleOpen(true)}
                    onBlur={() => setTimeout(() => setVehicleOpen(false), 200)}
                    onChange={(e) => {
                      setVehicleQuery(e.target.value)
                      setVehicleOpen(true)
                    }}
                    className="pl-9 pr-9 bg-background"
                  />
                  <ChevronsUpDown className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                </div>

                {/* Vehicle Dropdown */}
                {vehicleOpen && (
                  <div
                    role="listbox"
                    className="absolute z-50 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border bg-popover p-1 shadow-lg"
                  >
                    <button
                      type="button"
                      className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs hover:bg-accent text-muted-foreground"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        setSelectedVehicleId("")
                        setVehicleQuery("")
                        setVehicleOpen(false)
                      }}
                    >
                      <span>None (General advance deposit without vehicle allocation)</span>
                      {!selectedVehicleId && <Check className="size-4 text-primary" />}
                    </button>

                    {filteredVehicles.length > 0 ? (
                      filteredVehicles.map((v) => (
                        <button
                          key={v.id}
                          type="button"
                          role="option"
                          aria-selected={v.id === selectedVehicleId}
                          className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs hover:bg-accent"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => {
                            setSelectedVehicleId(v.id)
                            setVehicleQuery("")
                            setVehicleOpen(false)
                          }}
                        >
                          <div className="min-w-0">
                            <div className="font-mono font-semibold text-foreground">
                              Chassis: {v.chassisNumber}
                            </div>
                            <div className="text-[11px] text-muted-foreground">
                              {v.vehicleModel.brand} {v.vehicleModel.modelName}
                              {v.color ? ` (${v.color})` : ""} · {v.branchName}
                            </div>
                          </div>
                          <div className="text-right shrink-0 ml-2">
                            <div className="font-medium text-xs">
                              {formatLKR(v.vehicleModel.defaultPrice)}
                            </div>
                            {v.id === selectedVehicleId && (
                              <Check className="size-4 text-primary ml-auto" />
                            )}
                          </div>
                        </button>
                      ))
                    ) : (
                      <div className="p-3 text-center text-xs text-muted-foreground">
                        No available vehicle matching "{vehicleQuery}".
                      </div>
                    )}
                  </div>
                )}
              </div>

              {selectedVehicle && (
                <div className="flex items-center justify-between rounded-lg border bg-muted/40 px-3 py-1.5 text-xs">
                  <div>
                    <span className="font-mono font-medium">{selectedVehicle.chassisNumber}</span>
                    <span className="text-muted-foreground ml-2">
                      ({selectedVehicle.vehicleModel.brand} {selectedVehicle.vehicleModel.modelName})
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-5 text-[10px] text-muted-foreground hover:text-destructive px-1"
                    onClick={() => setSelectedVehicleId("")}
                  >
                    Clear
                  </Button>
                </div>
              )}
            </div>

            {/* 3. Amount and Payment Method Details */}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="adv-amount">Advance Amount (Rs.) *</Label>
                <Input
                  id="adv-amount"
                  type="number"
                  step="any"
                  min="1"
                  required
                  placeholder="e.g. 50000"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="font-bold tabular-nums"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="adv-method">Payment Method *</Label>
                <Select
                  value={paymentMethod}
                  onValueChange={(val) => {
                    if (val) setPaymentMethod(val)
                  }}
                >
                  <SelectTrigger id="adv-method">
                    <SelectValue placeholder="Select method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Cash">Cash</SelectItem>
                    <SelectItem value="Card">Card</SelectItem>
                    <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                    <SelectItem value="Cheque">Cheque</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Optional Notes */}
            <div className="space-y-2">
              <Label htmlFor="adv-notes">Notes (Optional)</Label>
              <Textarea
                id="adv-notes"
                placeholder="Reference notes, booking terms, transfer info..."
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="text-xs resize-none"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isPending || !selectedCustomerId || !amount || Number(amount) <= 0}
                className="gap-2"
              >
                {isPending && <Loader2 className="size-4 animate-spin" />}
                Record Advance
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Quick Add Customer Dialog */}
      <Dialog open={newCustomerOpen} onOpenChange={setNewCustomerOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Register New Customer</DialogTitle>
            <DialogDescription>
              Quickly create a new customer record. They will be auto-selected for this advance deposit.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateCustomer} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="quick-cust-name">Full Name *</Label>
              <Input
                id="quick-cust-name"
                required
                placeholder="e.g. Kasun Perera"
                value={newCustomerName}
                onChange={(e) => setNewCustomerName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="quick-cust-phone">Phone Number *</Label>
              <Input
                id="quick-cust-phone"
                type="tel"
                required
                placeholder="e.g. 0771234567"
                value={newCustomerPhone}
                onChange={(e) => setNewCustomerPhone(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="quick-cust-nic">NIC / Passport Number (Optional)</Label>
              <Input
                id="quick-cust-nic"
                placeholder="e.g. 199012345678"
                value={newCustomerNic}
                onChange={(e) => setNewCustomerNic(e.target.value)}
              />
            </div>
            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setNewCustomerOpen(false)}
                disabled={isCreatingCustomer}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isCreatingCustomer} className="gap-2">
                {isCreatingCustomer && <Loader2 className="size-4 animate-spin" />}
                Save &amp; Select
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
