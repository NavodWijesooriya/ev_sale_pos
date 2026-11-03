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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Building2,
  Search,
  Calendar,
  Phone,
  Mail,
  MoreHorizontal,
  Power,
  PowerOff,
  Loader2,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react"
import { SubscriptionPlan, SubscriptionStatus } from "@prisma/client"
import { toggleDealershipStatus } from "@/app/actions/dealership"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

export interface DealershipRecord {
  id: string
  businessName: string
  phone?: string | null
  domain: string | null
  subdomain: string | null
  subscriptionPlan: SubscriptionPlan
  subscriptionStatus: SubscriptionStatus
  createdAt: Date | string
  users?: { name: string; email: string }[]
  _count?: {
    branches: number
    vehicles: number
    sales: number
    users: number
  }
}

interface DealershipTableProps {
  initialOrganizations: DealershipRecord[]
}

export function DealershipTable({ initialOrganizations }: DealershipTableProps) {
  const router = useRouter()
  const [search, setSearch] = React.useState("")
  const [organizations, setOrganizations] = React.useState<DealershipRecord[]>(initialOrganizations)
  const [updatingId, setUpdatingId] = React.useState<string | null>(null)

  React.useEffect(() => {
    setOrganizations(initialOrganizations)
  }, [initialOrganizations])

  const filtered = React.useMemo(() => {
    if (!search.trim()) return organizations
    const q = search.toLowerCase()
    return organizations.filter(
      (org) =>
        org.businessName.toLowerCase().includes(q) ||
        (org.phone && org.phone.toLowerCase().includes(q)) ||
        (org.subdomain && org.subdomain.toLowerCase().includes(q)) ||
        (org.users && org.users[0]?.email.toLowerCase().includes(q))
    )
  }, [organizations, search])

  const handleToggleStatus = async (org: DealershipRecord) => {
    const isCurrentlyActive = org.subscriptionStatus === SubscriptionStatus.Active
    const targetStatus = isCurrentlyActive
      ? SubscriptionStatus.Suspended
      : SubscriptionStatus.Active

    setUpdatingId(org.id)

    // Optimistic UI update
    setOrganizations((prev) =>
      prev.map((o) =>
        o.id === org.id ? { ...o, subscriptionStatus: targetStatus } : o
      )
    )

    try {
      const result = await toggleDealershipStatus(org.id, targetStatus)
      if (result.success) {
        if (targetStatus === SubscriptionStatus.Suspended) {
          toast.warning(`Dealership Suspended`, {
            description: `${org.businessName} access has been suspended. Staff logins are now blocked.`,
          })
        } else {
          toast.success(`Dealership Activated`, {
            description: `${org.businessName} has been activated. Staff logins restored.`,
          })
        }
        router.refresh()
      } else {
        // Revert on failure
        setOrganizations((prev) =>
          prev.map((o) =>
            o.id === org.id ? { ...o, subscriptionStatus: org.subscriptionStatus } : o
          )
        )
        toast.error("Failed to update status", { description: result.message })
      }
    } catch (err) {
      // Revert on error
      setOrganizations((prev) =>
        prev.map((o) =>
          o.id === org.id ? { ...o, subscriptionStatus: org.subscriptionStatus } : o
        )
      )
      toast.error("Error updating dealership status")
    } finally {
      setUpdatingId(null)
    }
  }

  const getPlanBadge = (plan: SubscriptionPlan) => {
    switch (plan) {
      case SubscriptionPlan.Enterprise:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
            Enterprise
          </span>
        )
      case SubscriptionPlan.Pro:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
            Pro
          </span>
        )
      case SubscriptionPlan.Basic:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
            Basic
          </span>
        )
      case SubscriptionPlan.Free:
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20">
            Free
          </span>
        )
    }
  }

  const getStatusBadge = (status: SubscriptionStatus) => {
    if (status === SubscriptionStatus.Active) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
          <span className="size-1.5 rounded-full bg-emerald-500" />
          Active
        </span>
      )
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">
        <span className="size-1.5 rounded-full bg-red-500 animate-pulse" />
        Suspended
      </span>
    )
  }

  return (
    <Card className="border-border shadow-sm">
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Building2 className="size-4 text-blue-500" />
              Registered EV Dealerships
              <Badge variant="outline" className="ml-1 text-[11px] font-normal">
                {organizations.length} Tenants
              </Badge>
            </CardTitle>
            <CardDescription className="text-xs">
              Live multi-tenant instances isolated with strict database scoping and access control.
            </CardDescription>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              placeholder="Search by name, phone, slug..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-8 pl-8 pr-3 text-xs rounded-lg border border-input bg-muted/30 placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 text-[11px] font-semibold text-muted-foreground">
                <TableHead className="py-2.5 pl-4">Business Name</TableHead>
                <TableHead className="py-2.5">Phone</TableHead>
                <TableHead className="py-2.5">Plan</TableHead>
                <TableHead className="py-2.5">Status</TableHead>
                <TableHead className="py-2.5">Primary OrgAdmin</TableHead>
                <TableHead className="py-2.5 pr-4 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="h-28 text-center text-xs text-muted-foreground"
                  >
                    No dealerships found matching your search.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((org) => {
                  const admin = org.users?.[0]
                  const isUpdating = updatingId === org.id
                  const isActive = org.subscriptionStatus === SubscriptionStatus.Active

                  return (
                    <TableRow key={org.id} className="hover:bg-muted/30 transition-colors">
                      {/* Business Name & Subdomain */}
                      <TableCell className="py-3 pl-4">
                        <div className="flex flex-col">
                          <span className="text-xs font-semibold text-foreground">
                            {org.businessName}
                          </span>
                          <span className="text-[10px] text-muted-foreground font-mono">
                            {org.subdomain ? `${org.subdomain}.voltpos.io` : org.id.slice(0, 8)}
                          </span>
                        </div>
                      </TableCell>

                      {/* Phone */}
                      <TableCell className="py-3">
                        {org.phone ? (
                          <div className="flex items-center gap-1.5 text-xs text-foreground font-mono">
                            <Phone className="size-3 text-muted-foreground" />
                            <span>{org.phone}</span>
                          </div>
                        ) : (
                          <span className="text-[11px] text-muted-foreground italic">
                            Not provided
                          </span>
                        )}
                      </TableCell>

                      {/* Plan */}
                      <TableCell className="py-3">
                        {getPlanBadge(org.subscriptionPlan)}
                      </TableCell>

                      {/* Status */}
                      <TableCell className="py-3">
                        {getStatusBadge(org.subscriptionStatus)}
                      </TableCell>

                      {/* Primary Admin */}
                      <TableCell className="py-3">
                        {admin ? (
                          <div className="flex flex-col text-xs">
                            <span className="font-medium text-foreground">{admin.name}</span>
                            <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                              <Mail className="size-3 text-muted-foreground" />
                              {admin.email}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">No Admin Assigned</span>
                        )}
                      </TableCell>

                      {/* Actions Column */}
                      <TableCell className="py-3 pr-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2 whitespace-nowrap">
                          <Button
                            variant={isActive ? "outline" : "default"}
                            size="sm"
                            disabled={isUpdating}
                            onClick={() => handleToggleStatus(org)}
                            className={`h-7 px-2.5 text-[11px] font-medium transition-all ${
                              isActive
                                ? "text-amber-600 hover:text-red-600 hover:border-red-300 dark:text-amber-400 dark:hover:text-red-400"
                                : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                            }`}
                          >
                            {isUpdating ? (
                              <Loader2 className="size-3 animate-spin" />
                            ) : isActive ? (
                              <>
                                <PowerOff className="mr-1 size-3" />
                                Suspend
                              </>
                            ) : (
                              <>
                                <Power className="mr-1 size-3" />
                                Activate
                              </>
                            )}
                          </Button>

                          {/* Secondary options dropdown */}
                          <DropdownMenu>
                            <DropdownMenuTrigger
                              data-slot="button"
                              className="size-7 inline-flex items-center justify-center rounded-md border border-input text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer outline-none"
                              aria-label="More actions"
                            >
                              <MoreHorizontal className="size-3.5" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48 text-xs">
                              <DropdownMenuLabel className="text-[11px] font-normal text-muted-foreground">
                                Manage Tenant
                              </DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleToggleStatus(org)}
                                className={`cursor-pointer text-xs flex items-center gap-2 ${
                                  isActive
                                    ? "text-red-600 focus:bg-red-500/10 focus:text-red-600"
                                    : "text-emerald-600 focus:bg-emerald-500/10 focus:text-emerald-600"
                                }`}
                              >
                                {isActive ? (
                                  <>
                                    <PowerOff className="size-3.5" />
                                    <span>Suspend Dealership</span>
                                  </>
                                ) : (
                                  <>
                                    <Power className="size-3.5" />
                                    <span>Activate Dealership</span>
                                  </>
                                )}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
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
