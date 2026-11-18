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
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { matchesBatch } from "@/lib/batch"

interface BikeStockRow {
  id: string
  chassisNumber: string
  unitGrnNumber?: string | null
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
  const [batch, setBatch] = useState("")
  const batches = useMemo(
    () => Array.from(new Set(vehicles.map((vehicle) => vehicle.grn?.grnNumber).filter((n): n is string => Boolean(n)))).sort(),
    [vehicles],
  )
  const filteredVehicles = useMemo(() => {
    const query = search.trim().toLocaleLowerCase()
    return vehicles.filter((vehicle) => {
      if (batch && vehicle.grn?.grnNumber !== batch) return false
      if (!query) return true
      return (
        // "jm01", "JM 01" and "jm0102" all find the right batch / unit
        matchesBatch(query, vehicle.unitGrnNumber, vehicle.grn?.grnNumber) ||
        vehicle.chassisNumber.toLocaleLowerCase().includes(query) ||
        vehicle.vehicleModel.brand.toLocaleLowerCase().includes(query) ||
        vehicle.vehicleModel.modelName.toLocaleLowerCase().includes(query) ||
        vehicle.color?.toLocaleLowerCase().includes(query)
      )
    })
  }, [search, batch, vehicles])

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3 px-4 pt-4">
        <Input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by Unit GRN (e.g. JM0102), Batch, or Chassis Number..."
          aria-label="Search by Unit GRN, batch, or chassis number"
          className="max-w-md"
        />
        <select
          value={batch}
          onChange={(event) => setBatch(event.target.value)}
          aria-label="Filter by round / batch"
          className="h-10 rounded-lg border border-input bg-background px-3 text-sm"
        >
          <option value="">All rounds / batches</option>
          {batches.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Unit GRN</TableHead>
              <TableHead>Chassis Number</TableHead>
              <TableHead>GRN Batch</TableHead>
              <TableHead>Model</TableHead>
              <TableHead>Color</TableHead>
              <TableHead>Motor Number</TableHead>
              <TableHead>Charging Serial</TableHead>
              <TableHead>Year</TableHead>
              <TableHead>Showroom</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredVehicles.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="h-28 text-center text-muted-foreground">
                  {search.trim() || batch ? "No bikes match this search query." : "No available bikes are currently in stock."}
                </TableCell>
              </TableRow>
            ) : filteredVehicles.map((vehicle) => (
              <TableRow key={vehicle.id}>
                <TableCell>
                  {vehicle.unitGrnNumber ? (
                    <Badge variant="secondary" className="font-mono font-bold tracking-wider text-primary">
                      {vehicle.unitGrnNumber}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="font-mono font-medium">
                  <Link href={`/dashboard/bikes/${vehicle.id}`} className="text-primary hover:underline">
                    {vehicle.chassisNumber}
                  </Link>
                </TableCell>
                <TableCell className="font-mono text-muted-foreground">{vehicle.grn?.grnNumber || "—"}</TableCell>
                <TableCell className="font-medium">{vehicle.vehicleModel.brand} {vehicle.vehicleModel.modelName}</TableCell>
                <TableCell>{vehicle.color || "—"}</TableCell>
                <TableCell className="font-mono text-xs">{vehicle.motorNumber || "—"}</TableCell>
                <TableCell className="font-mono text-xs">{vehicle.chargingSerialNumber || "—"}</TableCell>
                <TableCell>{vehicle.year || "—"}</TableCell>
                <TableCell>{vehicle.branch.name}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
