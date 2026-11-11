"use client"

import * as React from "react"
import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  Users,
  Building2,
  Mail,
  UserCheck,
  UserX,
  Loader2,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { updateStaffAccess, type StaffUserItem } from "@/app/actions/staff"
import { UserRole } from "@prisma/client"

interface StaffManagementViewProps {
  initialStaff: StaffUserItem[]
  currentUserId: string
}

const roleOptions: Array<{ value: UserRole; label: string; description: string }> = [
  { value: UserRole.OrgAdmin, label: "Admin (Owner)", description: "Full dealership access & control" },
  { value: UserRole.BranchManager, label: "Manager", description: "Branch operations & reports" },
  { value: UserRole.Cashier, label: "Cashier", description: "POS sales & payment processing" },
  { value: UserRole.SalesRep, label: "Staff (Sales)", description: "Sales representative & customer CRM" },
  { value: UserRole.Technician, label: "Technician", description: "After-sales services & job cards" },
]

export function StaffManagementView({ initialStaff, currentUserId }: StaffManagementViewProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [staffList, setStaffList] = React.useState<StaffUserItem[]>(initialStaff)
  const [pendingUserIds, setPendingUserIds] = React.useState<Record<string, boolean>>({})

  // Sync state if props update from server
  React.useEffect(() => {
    setStaffList(initialStaff)
  }, [initialStaff])

  function handleRoleChange(userId: string, newRole: string) {
    const user = staffList.find((u) => u.id === userId)
    if (!user) return

    setPendingUserIds((prev) => ({ ...prev, [userId]: true }))

    // Optimistic update
    setStaffList((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, role: newRole as UserRole } : u))
    )

    startTransition(async () => {
      try {
        const res = await updateStaffAccess(userId, newRole, user.isActive)
        if (!res.success) {
          toast.error(res.error || "Failed to update role.")
          // Rollback
          setStaffList(initialStaff)
          return
        }

        toast.success(`Role updated to ${newRole} for ${user.name}.`)
        router.refresh()
      } catch (err: any) {
        toast.error(err.message || "An error occurred while updating role.")
        setStaffList(initialStaff)
      } finally {
        setPendingUserIds((prev) => ({ ...prev, [userId]: false }))
      }
    })
  }

  function handleStatusToggle(userId: string, newActiveState: boolean) {
    const user = staffList.find((u) => u.id === userId)
    if (!user) return

    setPendingUserIds((prev) => ({ ...prev, [userId]: true }))

    // Optimistic update
    setStaffList((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, isActive: newActiveState } : u))
    )

    startTransition(async () => {
      try {
        const res = await updateStaffAccess(userId, user.role, newActiveState)
        if (!res.success) {
          toast.error(res.error || "Failed to update access status.")
          // Rollback
          setStaffList(initialStaff)
          return
        }

        toast.success(
          newActiveState
            ? `Access unblocked for ${user.name}.`
            : `Access blocked for ${user.name}.`
        )
        router.refresh()
      } catch (err: any) {
        toast.error(err.message || "An error occurred while updating status.")
        setStaffList(initialStaff)
      } finally {
        setPendingUserIds((prev) => ({ ...prev, [userId]: false }))
      }
    })
  }

  const activeCount = staffList.filter((u) => u.isActive).length
  const blockedCount = staffList.length - activeCount

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
            Access Control
          </p>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Staff Management</h1>
          <p className="text-sm text-muted-foreground">
            Dynamically adjust team roles and instantly grant or revoke system access.
          </p>
        </div>

        {/* Quick Stats Pill */}
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5 rounded-lg border bg-card px-3 py-1.5 text-muted-foreground shadow-xs">
            <UserCheck className="size-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Active: <strong className="text-foreground">{activeCount}</strong></span>
          </div>
          {blockedCount > 0 && (
            <div className="flex items-center gap-1.5 rounded-lg border bg-card px-3 py-1.5 text-muted-foreground shadow-xs">
              <UserX className="size-3.5 text-destructive" />
              <span>Blocked: <strong className="text-foreground">{blockedCount}</strong></span>
            </div>
          )}
        </div>
      </div>

      {/* Staff Table Card */}
      <Card className="rounded-2xl border-border/70 shadow-sm overflow-hidden">
        <CardHeader className="border-b bg-muted/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Users className="size-4.5" />
              </span>
              <div>
                <CardTitle className="text-base font-semibold">Staff Directory</CardTitle>
                <CardDescription>
                  {staffList.length} registered {staffList.length === 1 ? "team member" : "team members"}
                </CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="w-[30%]">Staff Member</TableHead>
                  <TableHead className="w-[25%]">Email Address</TableHead>
                  <TableHead className="w-[25%]">Assigned Role</TableHead>
                  <TableHead className="w-[20%] text-right">Access Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {staffList.map((user) => {
                  const isCurrent = user.id === currentUserId
                  const isUserBusy = !!pendingUserIds[user.id] || isPending

                  return (
                    <TableRow key={user.id} className="hover:bg-muted/30">
                      {/* Name & Branch */}
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 font-medium text-sm text-foreground">
                              <span>{user.name}</span>
                              {isCurrent && (
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-normal">
                                  You
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground truncate">
                              <Building2 className="size-3 shrink-0" />
                              <span>{user.branchName || "All Branches (HQ)"}</span>
                            </div>
                          </div>
                        </div>
                      </TableCell>

                      {/* Email */}
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono">
                          <Mail className="size-3.5 text-muted-foreground/70 shrink-0" />
                          <span className="truncate">{user.email}</span>
                        </div>
                      </TableCell>

                      {/* Role Dropdown */}
                      <TableCell>
                        <div className="w-48">
                          <Select
                            value={user.role}
                            onValueChange={(val) => {
                              if (val) handleRoleChange(user.id, val)
                            }}
                            disabled={isCurrent || isUserBusy}
                          >
                            <SelectTrigger className="h-8 text-xs bg-background">
                              <SelectValue placeholder="Select role" />
                            </SelectTrigger>
                            <SelectContent align="start">
                              {roleOptions.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value} className="text-xs">
                                  <div className="flex flex-col">
                                    <span className="font-medium">{opt.label}</span>
                                    <span className="text-[10px] text-muted-foreground">{opt.description}</span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </TableCell>

                      {/* Status Toggle Switch */}
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2.5">
                          {isUserBusy && (
                            <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
                          )}
                          <span className="text-xs font-medium text-muted-foreground">
                            {user.isActive ? (
                              <span className="text-emerald-600 dark:text-emerald-400">Active</span>
                            ) : (
                              <span className="text-destructive">Blocked</span>
                            )}
                          </span>
                          <Switch
                            id={`status-${user.id}`}
                            checked={user.isActive}
                            onCheckedChange={(checked) => handleStatusToggle(user.id, checked)}
                            disabled={isCurrent || isUserBusy}
                            aria-label={`Toggle access for ${user.name}`}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}

                {staffList.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="h-32 text-center text-sm text-muted-foreground">
                      No staff accounts found in this organization.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
