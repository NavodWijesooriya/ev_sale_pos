"use client"

import { useMemo, useState } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"

interface BikeStockRow {
  id: string
  chassisNumber: string
  motorNumber: string | null
  chargingSerialNumber: string | null
  year: number | null
  color: string | null
  branch: { name: string }
  vehicleModel: { brand: string; modelName: string }
  grn: { grnNumber: string; date: Date } | null
}

interface BikeStockTableProps {
  vehicles: BikeStockRow[]
}

export function BikeStockTable({ vehicles }: BikeStockTableProps) {
  const [search, setSearch] = useState("")
  const filteredVehicles = useMemo(() => {
    const query = search.trim().toLocaleLowerCase()
    if (!query) return vehicles
    return vehicles.filter((vehicle) =>
      vehicle.grn?.grnNumber.toLocaleLowerCase().includes(query) ||
      vehicle.chassisNumber.toLocaleLowerCase().includes(query),
    )
  }, [search, vehicles])

  return (
    <div className="space-y-3">
      <div className="px-4 pt-4">
        <Input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by GRN Batch or Chassis Number..."
          aria-label="Search by GRN batch or chassis number"
          className="max-w-sm"
        />
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>GRN Batch</TableHead>
              <TableHead>Chassis Number</TableHead>
              <TableHead>Motor Number</TableHead>
              <TableHead>Charging Serial</TableHead>
              <TableHead>Model</TableHead>
              <TableHead>Year</TableHead>
              <TableHead>Color</TableHead>
              <TableHead>Showroom</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredVehicles.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-28 text-center text-muted-foreground">
                  {search.trim() ? "No bikes match this GRN batch or chassis number." : "No available bikes are currently in stock."}
                </TableCell>
              </TableRow>
            ) : filteredVehicles.map((vehicle) => (
              <TableRow key={vehicle.id}>
                <TableCell className="font-mono font-bold text-primary">{vehicle.grn?.grnNumber || "—"}</TableCell>
                <TableCell className="font-mono font-medium">{vehicle.chassisNumber}</TableCell>
                <TableCell className="font-mono">{vehicle.motorNumber || "—"}</TableCell>
                <TableCell className="font-mono">{vehicle.chargingSerialNumber || "—"}</TableCell>
                <TableCell>{vehicle.vehicleModel.brand} {vehicle.vehicleModel.modelName}</TableCell>
                <TableCell>{vehicle.year || "—"}</TableCell>
                <TableCell>{vehicle.color || "—"}</TableCell>
                <TableCell>{vehicle.branch.name}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
