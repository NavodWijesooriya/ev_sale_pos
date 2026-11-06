"use client"

import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import {
  FileText,
  Plus,
  Trash2,
  Building2,
  Truck,
  Bike,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react"
import { createGRN, CreateGRNInput, GRNVehicleItem } from "@/app/actions/inventory"
import { formatLKR } from "@/lib/currency"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

interface CreateGRNDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  suppliers: { id: string; name: string }[]
  branches: { id: string; name: string }[]
  models: { id: string; brand: string; modelName: string; defaultPrice: number }[]
  onSuccess?: () => void
}

export function CreateGRNDialog({
  open,
  onOpenChange,
  suppliers,
  branches,
  models,
  onSuccess,
}: CreateGRNDialogProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  const [supplierId, setSupplierId] = React.useState(suppliers[0]?.id || "")
  const [branchId, setBranchId] = React.useState(branches[0]?.id || "")
  const [paymentMethod, setPaymentMethod] = React.useState<CreateGRNInput["paymentMethod"]>("Cash")
  const [paymentAmount, setPaymentAmount] = React.useState<string | null>(null)
  const [chequeNumber, setChequeNumber] = React.useState("")
  const [bankName, setBankName] = React.useState("")
  const [dueDate, setDueDate] = React.useState("")

  const [items, setItems] = React.useState<GRNVehicleItem[]>([
    {
      vehicleModelId: models[0]?.id || "",
      chassisNumber: "",
      motorNumber: "",
      batterySerialNumber: "",
      warrantyPeriod: "3 Years",
      color: "Pearl White",
      purchasePrice: models[0] ? Math.round(models[0].defaultPrice * 0.85) : 35000,
    },
  ])

  const handleAddItem = () => {
    const defaultModel = models[0]
    setItems((prev) => [
      ...prev,
      {
        vehicleModelId: defaultModel?.id || "",
        chassisNumber: "",
        motorNumber: "",
        batterySerialNumber: "",
        warrantyPeriod: "3 Years",
        color: "Pearl White",
        purchasePrice: defaultModel ? Math.round(defaultModel.defaultPrice * 0.85) : 35000,
      },
    ])
  }

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) {
      toast.warning("A GRN must include at least one vehicle.")
      return
    }
    setItems((prev) => prev.filter((_, i) => i !== index))
  }

  const handleItemChange = <K extends keyof GRNVehicleItem>(
    index: number,
    field: K,
    val: GRNVehicleItem[K]
  ) => {
    setItems((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item

        if (field === "vehicleModelId") {
          const modelId = String(val)
          const selected = models.find((m) => m.id === modelId)
          return {
            ...item,
            vehicleModelId: modelId,
            purchasePrice: selected ? Math.round(selected.defaultPrice * 0.85) : item.purchasePrice,
          }
        }

        return { ...item, [field]: val }
      })
    )
  }

  const totalAmount = React.useMemo(() => {
    return items.reduce((sum, item) => sum + (item.purchasePrice || 0), 0)
  }, [items])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!supplierId) {
      toast.error("Please select a supplier")
      return
    }
    if (!branchId) {
      toast.error("Please select a target showroom branch")
      return
    }
    if (paymentMethod === "CHEQUE" && (!chequeNumber.trim() || !bankName.trim() || !dueDate)) {
      toast.error("Enter the cheque number, bank, and due date.")
      return
    }

    // Validate items
    const chassisSet = new Set<string>()
    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      if (!item.vehicleModelId) {
        toast.error(`Please select a model for vehicle #${i + 1}`)
        return
      }
      if (!item.chassisNumber.trim()) {
        toast.error(`Please enter a chassis number (VIN) for vehicle #${i + 1}`)
        return
      }
      const cUpper = item.chassisNumber.trim().toUpperCase()
      if (chassisSet.has(cUpper)) {
        toast.error(`Duplicate chassis number "${cUpper}" in item #${i + 1}`)
        return
      }
      chassisSet.add(cUpper)
      if (item.purchasePrice <= 0) {
        toast.error(`Purchase price for vehicle #${i + 1} must be greater than 0`)
        return
      }
    }

    setIsSubmitting(true)

    try {
      const res = await createGRN({
        supplierId,
        branchId,
        totalAmount,
        paymentMethod,
        paymentAmount: paymentAmount?.trim() ? Number(paymentAmount) : totalAmount,
        chequeNumber,
        bankName,
        dueDate,
        items,
      })

      if (res.success) {
        toast.success(res.message)
        onOpenChange(false)
        // Reset items
        setItems([
          {
            vehicleModelId: models[0]?.id || "",
            chassisNumber: "",
            motorNumber: "",
            batterySerialNumber: "",
            warrantyPeriod: "3 Years",
            color: "Pearl White",
            purchasePrice: models[0] ? Math.round(models[0].defaultPrice * 0.85) : 35000,
          },
        ])
        setPaymentMethod("Cash")
        setPaymentAmount(null)
        setChequeNumber("")
        setBankName("")
        setDueDate("")
        if (onSuccess) onSuccess()
        router.refresh()
      } else {
        toast.error("Failed to create GRN", { description: res.message })
      }
    } catch (err) {
      toast.error("Error", {
        description: err instanceof Error ? err.message : "Unexpected error",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const formatCurrency = (val: number) => {
    return formatLKR(val)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-2 border-b">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <FileText className="size-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-semibold">
                Create Goods Received Note (GRN)
              </DialogTitle>
              <DialogDescription className="text-xs">
                Intake new electric vehicle inventory into stock. Atomically creates GRN, vehicle VINs, and stock records.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {models.length === 0 || suppliers.length === 0 ? (
          <div className="py-8 text-center space-y-3">
            <AlertCircle className="size-8 text-amber-500 mx-auto" />
            <h4 className="text-sm font-semibold">Missing Prerequisites</h4>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              {models.length === 0
                ? "You need to add at least one Vehicle Model before creating a GRN."
                : "You need to register at least one Supplier before creating a GRN."}
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5 pt-3">
            {/* Step 1: Supplier & Target Branch */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="flex size-6 items-center justify-center rounded-full bg-blue-600 text-white font-bold text-[11px] shrink-0 shadow-xs">
                  1
                </div>
                <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
                  Logistics & Destination
                </h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
                <div className="space-y-1.5">
                  <Label htmlFor="grnSupplier" className="text-xs font-medium flex items-center gap-1.5">
                    <Truck className="size-3.5 text-muted-foreground" />
                    Supplier / Logistics Importer <span className="text-red-500">*</span>
                  </Label>
                  <select
                    id="grnSupplier"
                    value={supplierId}
                    onChange={(e) => setSupplierId(e.target.value)}
                    className="w-full h-8 rounded-lg border border-input bg-transparent px-2.5 text-xs outline-none focus:ring-1 focus:ring-ring dark:bg-input/30"
                    required
                  >
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id} className="bg-popover text-popover-foreground">
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="grnBranch" className="text-xs font-medium flex items-center gap-1.5">
                    <Building2 className="size-3.5 text-muted-foreground" />
                    Receiving Showroom Branch <span className="text-red-500">*</span>
                  </Label>
                  <select
                    id="grnBranch"
                    value={branchId}
                    onChange={(e) => setBranchId(e.target.value)}
                    className="w-full h-8 rounded-lg border border-input bg-transparent px-2.5 text-xs outline-none focus:ring-1 focus:ring-ring dark:bg-input/30"
                    required
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id} className="bg-popover text-popover-foreground">
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Step 2: Dynamic EV Bikes List */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex size-6 items-center justify-center rounded-full bg-blue-600 text-white font-bold text-[11px] shrink-0 shadow-xs">
                    2
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
                      EV Bikes to Intake ({items.length} Units)
                    </h4>
                    <p className="text-[11px] text-muted-foreground">
                      Enter individual chassis number, motor number, battery serial, and procurement cost.
                    </p>
                  </div>
                </div>

                <Button
                  type="button"
                  onClick={handleAddItem}
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                >
                  <Plus className="mr-1 size-3" />
                  Add EV Bike
                </Button>
              </div>

              <div className="space-y-2.5 max-h-[42vh] overflow-y-auto pr-1">
                {items.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-lg border bg-card/60 space-y-2.5 relative group hover:border-primary/30 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                        <Bike className="size-3.5 text-blue-500" />
                        EV Bike #{idx + 1}
                      </span>

                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="text-muted-foreground hover:text-red-500 p-1 rounded transition-colors"
                          title="Remove EV Bike"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      )}
                    </div>

                    <div className="space-y-2.5">
                      {/* Row 1: Model, Chassis, Color, Cost */}
                      <div className="grid grid-cols-1 sm:grid-cols-6 gap-2.5">
                        {/* Model Selector */}
                        <div className="sm:col-span-2 space-y-1">
                          <Label className="text-[11px] font-medium">Model <span className="text-red-500">*</span></Label>
                          <select
                            value={item.vehicleModelId}
                            onChange={(e) => handleItemChange(idx, "vehicleModelId", e.target.value)}
                            className="w-full h-8 rounded-lg border border-input bg-transparent px-2 text-xs outline-none focus:ring-1 focus:ring-ring dark:bg-input/30"
                            required
                          >
                            {models.map((m) => (
                              <option
                                key={m.id}
                                value={m.id}
                                className="bg-popover text-popover-foreground"
                              >
                                {m.brand} {m.modelName} ({formatCurrency(m.defaultPrice)})
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Chassis Number (VIN) */}
                        <div className="sm:col-span-2 space-y-1">
                          <Label className="text-[11px] font-medium">
                            Chassis (VIN) <span className="text-red-500">*</span>
                          </Label>
                          <Input
                            placeholder="e.g. VIN-2026-900"
                            value={item.chassisNumber}
                            onChange={(e) =>
                              handleItemChange(idx, "chassisNumber", e.target.value.toUpperCase())
                            }
                            className="text-xs font-mono h-8 uppercase"
                            required
                          />
                        </div>

                        {/* Color */}
                        <div className="space-y-1">
                          <Label className="text-[11px] font-medium">Color</Label>
                          <Input
                            placeholder="e.g. Pearl White"
                            value={item.color}
                            onChange={(e) => handleItemChange(idx, "color", e.target.value)}
                            className="text-xs h-8"
                          />
                        </div>

                        {/* Purchase Cost */}
                        <div className="space-y-1">
                          <Label className="text-[11px] font-medium">Cost (LKR) <span className="text-red-500">*</span></Label>
                          <Input
                            type="number"
                            min="1000"
                            step="1000"
                            value={item.purchasePrice}
                            onChange={(e) =>
                              handleItemChange(idx, "purchasePrice", parseFloat(e.target.value) || 0)
                            }
                            className="text-xs font-mono h-8"
                            required
                          />
                        </div>
                      </div>

                      {/* Row 2: Motor Number, Battery Serial Number, Warranty Period */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 border-t border-border/40">
                        {/* Motor Number */}
                        <div className="space-y-1">
                          <Label className="text-[11px] font-medium text-muted-foreground">
                            Motor Number (Optional)
                          </Label>
                          <Input
                            placeholder="e.g. MOT-8921-X"
                            value={item.motorNumber || ""}
                            onChange={(e) => handleItemChange(idx, "motorNumber", e.target.value)}
                            className="text-xs font-mono h-8"
                          />
                        </div>

                        {/* Battery Serial Number */}
                        <div className="space-y-1">
                          <Label className="text-[11px] font-medium text-foreground">
                            Battery Serial No. <span className="text-emerald-600 dark:text-emerald-400 font-semibold">(EV Spec)</span>
                          </Label>
                          <Input
                            placeholder="e.g. BAT-2026-82KW-900"
                            value={item.batterySerialNumber || ""}
                            onChange={(e) =>
                              handleItemChange(idx, "batterySerialNumber", e.target.value.toUpperCase())
                            }
                            className="text-xs font-mono h-8 uppercase bg-emerald-500/5 border-emerald-500/30"
                          />
                        </div>

                        {/* Warranty Period */}
                        <div className="space-y-1">
                          <Label className="text-[11px] font-medium text-foreground">
                            Warranty Period
                          </Label>
                          <Input
                            placeholder="e.g. 3 Years / 100,000 km"
                            value={item.warrantyPeriod || "3 Years"}
                            onChange={(e) => handleItemChange(idx, "warrantyPeriod", e.target.value)}
                            className="text-xs h-8"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Step 3: Supplier payment details */}
            <div className="space-y-2 pt-2">
              <div className="flex items-center gap-2">
                <div className="flex size-6 items-center justify-center rounded-full bg-blue-600 text-white font-bold text-[11px] shrink-0 shadow-xs">
                  3
                </div>
                <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
                  Supplier Payment
                </h4>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
                <div className="space-y-1">
                  <Label htmlFor="grnPaymentMethod" className="text-[11px] font-medium">
                    Payment Method <span className="text-red-500">*</span>
                  </Label>
                  <select
                    id="grnPaymentMethod"
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as CreateGRNInput["paymentMethod"])}
                    className="w-full h-8 rounded-lg border border-input bg-transparent px-2.5 text-xs outline-none focus:ring-1 focus:ring-ring dark:bg-input/30"
                    required
                  >
                    <option value="Cash">Cash</option>
                    <option value="CHEQUE">Cheque</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="grnPaymentAmount" className="text-[11px] font-medium">
                    Amount (LKR) <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="grnPaymentAmount"
                    type="number"
                    min="0.01"
                    max={totalAmount}
                    step="0.01"
                    value={paymentAmount ?? totalAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    className="text-xs font-mono h-8"
                    required
                  />
                </div>
                {paymentMethod === "CHEQUE" && (
                  <>
                    <div className="space-y-1">
                      <Label htmlFor="grnChequeNumber" className="text-[11px] font-medium">
                        Cheque Number <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="grnChequeNumber"
                        value={chequeNumber}
                        onChange={(e) => setChequeNumber(e.target.value)}
                        className="text-xs font-mono h-8"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="grnChequeBank" className="text-[11px] font-medium">
                        Bank <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="grnChequeBank"
                        value={bankName}
                        onChange={(e) => setBankName(e.target.value)}
                        className="text-xs h-8"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="grnChequeDueDate" className="text-[11px] font-medium">
                        Due Date <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="grnChequeDueDate"
                        type="date"
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                        className="text-xs h-8"
                        required
                      />
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Total Summary Footer */}
            <div className="p-3.5 rounded-xl bg-muted/60 border flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-4">
                <span>
                  Total Units: <strong className="text-foreground">{items.length}</strong>
                </span>
                <span>
                  Total Cost:{" "}
                  <strong className="text-emerald-600 dark:text-emerald-400 font-mono text-sm">
                    {formatCurrency(totalAmount)}
                  </strong>
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-xs h-8"
                  onClick={() => onOpenChange(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  size="sm"
                  className="text-xs h-8 bg-primary text-primary-foreground font-medium shadow-xs"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                      Receiving Stock...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="mr-1.5 size-3.5" />
                      Submit GRN & Add to Stock
                    </>
                  )}
                </Button>
              </div>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
