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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  FileText,
  Plus,
  Truck,
  Building2,
  Calendar,
  Search,
  Bike,
  ArrowRight,
} from "lucide-react"
import { CreateGRNDialog } from "@/components/inventory/create-grn-dialog"
import { formatLKR } from "@/lib/currency"
import { useRouter } from "next/navigation"

export interface GRNRecord {
  id: string
  grnNumber: string
  totalAmount: number
  receivedDate: Date | string
  supplier: {
    id: string
    name: string
    phone: string | null
  }
  branch: {
    id: string
    name: string
  }
  items: {
    id: string
    unitPrice: number
    vehicle: {
      id: string
      chassisNumber: string
      color: string | null
      vehicleModel: {
        id: string
        brand: string
        modelName: string
      }
    }
  }[]
}

interface GRNTabProps {
  grns: GRNRecord[]
  suppliers: { id: string; name: string }[]
  branches: { id: string; name: string }[]
  models: { id: string; brand: string; modelName: string; defaultPrice: number }[]
}

export function GRNTab({ grns, suppliers, branches, models }: GRNTabProps) {
  const router = useRouter()
  const [search, setSearch] = React.useState("")
  const [isCreateOpen, setIsCreateOpen] = React.useState(false)

  const filtered = React.useMemo(() => {
    if (!search.trim()) return grns
    const q = search.toLowerCase()
    return grns.filter(
      (g) =>
        g.grnNumber.toLowerCase().includes(q) ||
        g.supplier.name.toLowerCase().includes(q) ||
        g.branch.name.toLowerCase().includes(q) ||
        g.items.some((i) => i.vehicle.chassisNumber.toLowerCase().includes(q))
    )
  }, [grns, search])

  const formatCurrency = (val: number) => {
    return formatLKR(val)
  }

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  return (
    <>
      <Card className="border-border shadow-xs">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <FileText className="size-4 text-blue-500" />
                  Goods Received Notes (GRN) Archive
                </CardTitle>
                <Badge variant="outline" className="text-[11px] font-normal">
                  {grns.length} GRNs
                </Badge>
              </div>
              <CardDescription className="text-xs">
                Official procurement delivery vouchers recording supplier dispatches and incoming EV chassis.
              </CardDescription>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative w-full sm:w-56">
                <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search GRN #, supplier, VIN..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full h-8 pl-8 pr-3 text-xs rounded-lg border border-input bg-muted/30 placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-ring"
                />
              </div>

              <Button
                onClick={() => setIsCreateOpen(true)}
                size="sm"
                className="h-8 text-xs bg-primary text-primary-foreground font-medium shadow-xs"
              >
                <Plus className="mr-1.5 size-3.5" />
                Create GRN
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 text-[11px] font-semibold text-muted-foreground">
                  <TableHead className="py-2.5 pl-4">GRN Number</TableHead>
                  <TableHead className="py-2.5">Received Date</TableHead>
                  <TableHead className="py-2.5">Supplier / Logistics</TableHead>
                  <TableHead className="py-2.5">Showroom Branch</TableHead>
                  <TableHead className="py-2.5">Vehicles Received</TableHead>
                  <TableHead className="py-2.5 pr-4 text-right">Total Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-28 text-center text-xs text-muted-foreground">
                      No Goods Received Notes found. Click "Create GRN" to register incoming vehicle shipments.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((g) => (
                    <TableRow key={g.id} className="hover:bg-muted/30 transition-colors">
                      {/* GRN Number */}
                      <TableCell className="py-3 pl-4">
                        <div className="flex items-center gap-2">
                          <div className="size-7 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                            <FileText className="size-3.5" />
                          </div>
                          <span className="text-xs font-mono font-bold text-foreground">
                            {g.grnNumber}
                          </span>
                        </div>
                      </TableCell>

                      {/* Date */}
                      <TableCell className="py-3 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="size-3 text-muted-foreground" />
                          <span>{formatDate(g.receivedDate)}</span>
                        </div>
                      </TableCell>

                      {/* Supplier */}
                      <TableCell className="py-3">
                        <div className="flex items-center gap-1.5 text-xs text-foreground font-medium">
                          <Truck className="size-3 text-muted-foreground" />
                          <span>{g.supplier.name}</span>
                        </div>
                      </TableCell>

                      {/* Branch */}
                      <TableCell className="py-3">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Building2 className="size-3 text-muted-foreground" />
                          <span>{g.branch.name}</span>
                        </div>
                      </TableCell>

                      {/* Items */}
                      <TableCell className="py-3">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1 text-xs font-semibold text-foreground">
                            <Bike className="size-3 text-emerald-500" />
                            <span>{g.items.length} EV Bikes</span>
                          </div>
                          <div className="text-[10px] text-muted-foreground font-mono truncate max-w-[200px]">
                            {g.items.map((i) => i.vehicle.chassisNumber).join(", ")}
                          </div>
                        </div>
                      </TableCell>

                      {/* Total Amount */}
                      <TableCell className="py-3 pr-4 text-right text-xs font-bold text-foreground font-mono">
                        {formatCurrency(g.totalAmount)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Create GRN Dialog */}
      <CreateGRNDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        suppliers={suppliers}
        branches={branches}
        models={models}
        onSuccess={() => router.refresh()}
      />
    </>
  )
}

