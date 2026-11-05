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
  Truck,
  Plus,
  Phone,
  Mail,
  User,
  Search,
  Loader2,
  CheckCircle2,
} from "lucide-react"
import { createSupplier, CreateSupplierInput } from "@/app/actions/inventory"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

export interface SupplierRecord {
  id: string
  name: string
  contactPerson: string | null
  phone: string | null
  email: string | null
  _count?: {
    grns: number
  }
}

interface SuppliersTabProps {
  initialSuppliers: SupplierRecord[]
}

export function SuppliersTab({ initialSuppliers }: SuppliersTabProps) {
  const router = useRouter()
  const [suppliers, setSuppliers] = React.useState<SupplierRecord[]>(initialSuppliers)
  const [search, setSearch] = React.useState("")
  const [isDialogOpen, setIsDialogOpen] = React.useState(false)
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  const [form, setForm] = React.useState<CreateSupplierInput>({
    name: "",
    contactPerson: "",
    phone: "",
    email: "",
  })

  React.useEffect(() => {
    setSuppliers(initialSuppliers)
  }, [initialSuppliers])

  const filtered = React.useMemo(() => {
    if (!search.trim()) return suppliers
    const q = search.toLowerCase()
    return suppliers.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.contactPerson && s.contactPerson.toLowerCase().includes(q)) ||
        (s.phone && s.phone.includes(q))
    )
  }, [suppliers, search])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!form.name.trim()) {
      toast.error("Please enter the supplier company name")
      return
    }

    setIsSubmitting(true)

    try {
      const res = await createSupplier(form)

      if (res.success && res.data) {
        toast.success(res.message)
        setSuppliers((prev) => [...prev, { ...res.data!, _count: { grns: 0 } }])
        setIsDialogOpen(false)
        setForm({ name: "", contactPerson: "", phone: "", email: "" })
        router.refresh()
      } else {
        toast.error("Failed to create supplier", { description: res.message })
      }
    } catch (err) {
      toast.error("Error", {
        description: err instanceof Error ? err.message : "Unexpected error",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card className="border-border shadow-xs">
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Truck className="size-4 text-primary" />
              EV Vehicle Suppliers & Importers
              <Badge variant="outline" className="text-[11px] font-normal">
                {suppliers.length} Suppliers
              </Badge>
            </CardTitle>
            <CardDescription className="text-xs">
              Manage automotive manufacturers, port logistics distributors, and EV suppliers.
            </CardDescription>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative w-full sm:w-56">
              <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                placeholder="Search suppliers..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-8 pl-8 pr-3 text-xs rounded-lg border border-input bg-muted/30 placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-ring"
              />
            </div>

            {/* Add Supplier Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger
                render={
                  <Button size="sm" className="h-8 text-xs bg-primary text-primary-foreground">
                    <Plus className="mr-1.5 size-3.5" />
                    Add Supplier
                  </Button>
                }
              />
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="text-base font-semibold">
                    Register EV Supplier / Importer
                  </DialogTitle>
                  <DialogDescription className="text-xs">
                    Suppliers are linked to Goods Received Notes (GRN) for inventory stock intake.
                  </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-3 py-2">
                  <div className="space-y-1">
                    <Label htmlFor="sName" className="text-xs font-medium">
                      Company / Supplier Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="sName"
                      placeholder="e.g. Apex Global EV Logistics Ltd"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      className="text-xs h-8"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="contactPerson" className="text-xs font-medium">
                      Key Contact Person
                    </Label>
                    <div className="relative">
                      <User className="absolute left-2.5 top-2 size-3.5 text-muted-foreground pointer-events-none" />
                      <Input
                        id="contactPerson"
                        placeholder="e.g. Marcus Sterling"
                        value={form.contactPerson || ""}
                        onChange={(e) => setForm({ ...form, contactPerson: e.target.value })}
                        className="pl-8 text-xs h-8"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="sPhone" className="text-xs font-medium">
                        Contact Phone
                      </Label>
                      <div className="relative">
                        <Phone className="absolute left-2.5 top-2 size-3.5 text-muted-foreground pointer-events-none" />
                        <Input
                          id="sPhone"
                          placeholder="+94 11 234 5678"
                          value={form.phone || ""}
                          onChange={(e) => setForm({ ...form, phone: e.target.value })}
                          className="pl-8 text-xs h-8"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="sEmail" className="text-xs font-medium">
                        Email Address
                      </Label>
                      <div className="relative">
                        <Mail className="absolute left-2.5 top-2 size-3.5 text-muted-foreground pointer-events-none" />
                        <Input
                          id="sEmail"
                          type="email"
                          placeholder="procurement@supplier.com"
                          value={form.email || ""}
                          onChange={(e) => setForm({ ...form, email: e.target.value })}
                          className="pl-8 text-xs h-8"
                        />
                      </div>
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
                          Register Supplier
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
                <TableHead className="py-2.5 pl-4">Supplier Company</TableHead>
                <TableHead className="py-2.5">Key Contact</TableHead>
                <TableHead className="py-2.5">Phone</TableHead>
                <TableHead className="py-2.5">Email</TableHead>
                <TableHead className="py-2.5 pr-4 text-right">Total GRNs</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-28 text-center text-xs text-muted-foreground">
                    No suppliers registered yet. Click "Add Supplier" to register one.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((s) => (
                  <TableRow key={s.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="py-3 pl-4">
                      <div className="flex items-center gap-2.5">
                        <div className="size-8 rounded-lg bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0">
                          <Truck className="size-4" />
                        </div>
                        <span className="text-xs font-semibold text-foreground">
                          {s.name}
                        </span>
                      </div>
                    </TableCell>

                    <TableCell className="py-3 text-xs text-muted-foreground">
                      {s.contactPerson || "—"}
                    </TableCell>

                    <TableCell className="py-3 text-xs font-mono text-foreground">
                      {s.phone || "—"}
                    </TableCell>

                    <TableCell className="py-3 text-xs text-muted-foreground">
                      {s.email || "—"}
                    </TableCell>

                    <TableCell className="py-3 pr-4 text-right">
                      <Badge variant="outline" className="text-[10px]">
                        {s._count?.grns ?? 0} GRN Deliveries
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
