"use client"

import * as React from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Bike,
  Plus,
  BatteryCharging,
  Gauge,
  Loader2,
  Search,
  ImageIcon,
  CheckCircle2,
  Zap,
  Clock,
} from "lucide-react"
import { createVehicleModel, CreateVehicleModelInput } from "@/app/actions/inventory"
import { ImageUploader } from "@/components/ui/image-uploader"
import { formatLKR } from "@/lib/currency"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

export interface VehicleModelRecord {
  id: string
  brand: string
  modelName: string
  imageUrl: string | null
  motorPower?: string | null
  batteryCapacity: string | null
  rangePerCharge?: string | null
  range: string | null
  topSpeed?: string | null
  chargingTime?: string | null
  defaultPrice: number
  minDownPayment: number | null
  _count?: {
    vehicles: number
  }
}

interface ModelsTabProps {
  initialModels: VehicleModelRecord[]
}

export function ModelsTab({ initialModels }: ModelsTabProps) {
  const router = useRouter()
  const [models, setModels] = React.useState<VehicleModelRecord[]>(initialModels)
  const [search, setSearch] = React.useState("")
  const [isDialogOpen, setIsDialogOpen] = React.useState(false)
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  const [form, setForm] = React.useState<CreateVehicleModelInput>({
    brand: "",
    modelName: "",
    defaultPrice: 2450,
    minDownPayment: 250,
    motorPower: "2000W",
    batteryCapacity: "60V 32Ah",
    rangePerCharge: "120km",
    range: "120km",
    topSpeed: "55 km/h",
    chargingTime: "4-6 Hours",
    imageUrl: "",
  })

  React.useEffect(() => {
    setModels(initialModels)
  }, [initialModels])

  const filtered = React.useMemo(() => {
    if (!search.trim()) return models
    const q = search.toLowerCase()
    return models.filter(
      (m) =>
        m.brand.toLowerCase().includes(q) ||
        m.modelName.toLowerCase().includes(q) ||
        (m.batteryCapacity && m.batteryCapacity.toLowerCase().includes(q))
    )
  }, [models, search])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!form.brand.trim() || !form.modelName.trim()) {
      toast.error("Please provide both brand and model name")
      return
    }
    if (form.defaultPrice <= 0) {
      toast.error("Default price must be greater than zero")
      return
    }

    setIsSubmitting(true)

    try {
      const res = await createVehicleModel({
        ...form,
        minDownPayment: form.minDownPayment || Math.round(form.defaultPrice * 0.1),
      })

      if (res.success && res.data) {
        toast.success(res.message)
        setModels((prev) => [...prev, { ...res.data!, _count: { vehicles: 0 } }])
        setIsDialogOpen(false)
        setForm({
          brand: "",
          modelName: "",
          defaultPrice: 2450,
          minDownPayment: 250,
          motorPower: "2000W",
          batteryCapacity: "60V 32Ah",
          rangePerCharge: "120km",
          range: "120km",
          topSpeed: "55 km/h",
          chargingTime: "4-6 Hours",
          imageUrl: "",
        })
        router.refresh()
      } else {
        toast.error("Failed to add model", { description: res.message })
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
    <Card className="border-border shadow-xs">
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Bike className="size-4 text-blue-500" />
              EV Bike Models Catalog
              <Badge variant="outline" className="text-[11px] font-normal">
                {models.length} Models
              </Badge>
            </CardTitle>
            <CardDescription className="text-xs">
              Manage electric bike models, motor ratings, battery capacities, and catalog prices.
            </CardDescription>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative w-full sm:w-56">
              <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                placeholder="Search EV bike models..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-8 pl-8 pr-3 text-xs rounded-lg border border-input bg-muted/30 placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-ring"
              />
            </div>

            {/* Add Model Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger
                render={
                  <Button size="sm" className="h-8 text-xs bg-primary text-primary-foreground">
                    <Plus className="mr-1.5 size-3.5" />
                    Add EV Bike Model
                  </Button>
                }
              />
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="text-base font-semibold">
                    Add New EV Bike Model
                  </DialogTitle>
                  <DialogDescription className="text-xs">
                    Define motor, battery, speed, and default retail pricing for your bike catalog.
                  </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-3 py-2">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="brand" className="text-xs font-medium">
                        Brand / Make <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="brand"
                        placeholder="e.g. Volt Motors, Super Soco"
                        value={form.brand}
                        onChange={(e) => setForm({ ...form, brand: e.target.value })}
                        className="text-xs h-8"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="modelName" className="text-xs font-medium">
                        Model Name <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="modelName"
                        placeholder="e.g. Apex 2000W Scooter"
                        value={form.modelName}
                        onChange={(e) => setForm({ ...form, modelName: e.target.value })}
                        className="text-xs h-8"
                        required
                      />
                    </div>
                  </div>

                  <ImageUploader
                    value={form.imageUrl}
                    onChange={(url) => setForm({ ...form, imageUrl: url })}
                    label="EV Bike Model Photo"
                    helperText="Upload bike picture from your device (Gallery/Camera). Stored in /public/uploads."
                  />

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="motorPower" className="text-xs font-medium">
                        Motor Power
                      </Label>
                      <Input
                        id="motorPower"
                        placeholder="e.g. 2000W"
                        value={form.motorPower || ""}
                        onChange={(e) => setForm({ ...form, motorPower: e.target.value })}
                        className="text-xs h-8"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="battery" className="text-xs font-medium">
                        Battery Capacity
                      </Label>
                      <Input
                        id="battery"
                        placeholder="e.g. 60V 32Ah"
                        value={form.batteryCapacity || ""}
                        onChange={(e) => setForm({ ...form, batteryCapacity: e.target.value })}
                        className="text-xs h-8"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1">
                      <Label htmlFor="range" className="text-xs font-medium">
                        Range / Charge
                      </Label>
                      <Input
                        id="range"
                        placeholder="e.g. 120km"
                        value={form.rangePerCharge || form.range || ""}
                        onChange={(e) =>
                          setForm({ ...form, rangePerCharge: e.target.value, range: e.target.value })
                        }
                        className="text-xs h-8"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="topSpeed" className="text-xs font-medium">
                        Top Speed
                      </Label>
                      <Input
                        id="topSpeed"
                        placeholder="e.g. 55 km/h"
                        value={form.topSpeed || ""}
                        onChange={(e) => setForm({ ...form, topSpeed: e.target.value })}
                        className="text-xs h-8"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="chargingTime" className="text-xs font-medium">
                        Charging Time
                      </Label>
                      <Input
                        id="chargingTime"
                        placeholder="e.g. 4-6 Hours"
                        value={form.chargingTime || ""}
                        onChange={(e) => setForm({ ...form, chargingTime: e.target.value })}
                        className="text-xs h-8"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="price" className="text-xs font-medium">
                        Default Retail Price (LKR) <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="price"
                        type="number"
                        min="1000"
                        step="1000"
                        value={form.defaultPrice}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            defaultPrice: parseFloat(e.target.value) || 0,
                            minDownPayment: Math.round((parseFloat(e.target.value) || 0) * 0.1),
                          })
                        }
                        className="text-xs h-8"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="downPayment" className="text-xs font-medium">
                        Min Down Payment (LKR)
                      </Label>
                      <Input
                        id="downPayment"
                        type="number"
                        min="0"
                        step="10"
                        value={form.minDownPayment ?? 0}
                        onChange={(e) =>
                          setForm({ ...form, minDownPayment: parseFloat(e.target.value) || 0 })
                        }
                        className="text-xs h-8"
                      />
                    </div>
                  </div>

                  <DialogFooter className="pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="text-xs h-8"
                      onClick={() => setIsDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      size="sm"
                      className="text-xs h-8 bg-primary text-primary-foreground"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="mr-1.5 size-3 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="mr-1.5 size-3" />
                          Save Model
                        </>
                      )}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 text-[11px] font-semibold text-muted-foreground">
                <TableHead className="py-2.5 pl-4">EV Bike Model & Brand</TableHead>
                <TableHead className="py-2.5">Motor & Battery</TableHead>
                <TableHead className="py-2.5">Range & Speed</TableHead>
                <TableHead className="py-2.5">Retail Price</TableHead>
                <TableHead className="py-2.5">Min Down Payment</TableHead>
                <TableHead className="py-2.5 pr-4 text-right">In-Stock Bikes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-28 text-center text-xs text-muted-foreground">
                    No EV bike models found. Click "Add EV Bike Model" to register your first model.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((m) => {
                  const stock = m._count?.vehicles ?? 0
                  return (
                    <TableRow key={m.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="py-3 pl-4">
                        <div className="flex items-center gap-2.5">
                          {m.imageUrl ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img
                              src={m.imageUrl}
                              alt={m.modelName}
                              className="size-9 rounded-lg object-cover border border-border shrink-0 shadow-2xs"
                            />
                          ) : (
                            <div className="size-9 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 flex items-center justify-center shrink-0">
                              <Bike className="size-4" />
                            </div>
                          )}
                          <div className="flex flex-col">
                            <span className="text-xs font-semibold text-foreground">
                              {m.modelName}
                            </span>
                            <span className="text-[11px] text-muted-foreground uppercase tracking-wider">
                              {m.brand}
                            </span>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell className="py-3">
                        <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1 font-mono">
                            <Zap className="size-3 text-amber-500" />
                            {m.motorPower || "2000W"}
                          </span>
                          <span className="flex items-center gap-1 font-mono">
                            <BatteryCharging className="size-3 text-emerald-500" />
                            {m.batteryCapacity || "60V 32Ah"}
                          </span>
                        </div>
                      </TableCell>

                      <TableCell className="py-3">
                        <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1 font-mono">
                            <Gauge className="size-3 text-cyan-500" />
                            {m.rangePerCharge || m.range || "120km"}
                          </span>
                          {m.topSpeed && (
                            <span className="text-[11px] text-muted-foreground font-mono">
                              Top Speed: {m.topSpeed}
                            </span>
                          )}
                        </div>
                      </TableCell>

                      <TableCell className="py-3 text-xs font-semibold text-foreground">
                        {formatCurrency(m.defaultPrice)}
                      </TableCell>

                      <TableCell className="py-3 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                        {formatCurrency(m.minDownPayment ?? Math.round(m.defaultPrice * 0.1))}
                      </TableCell>

                      <TableCell className="py-3 pr-4 text-right">
                        <Badge
                          variant={stock > 0 ? "default" : "outline"}
                          className={`text-[10px] ${
                            stock > 0
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                              : "text-muted-foreground"
                          }`}
                        >
                          {stock} Bikes In Stock
                        </Badge>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}

