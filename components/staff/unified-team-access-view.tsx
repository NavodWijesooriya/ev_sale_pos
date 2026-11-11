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
  UserPlus,
  Lock,
  ShieldCheck,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { updateStaffAccess, addNewStaff, type StaffUserItem } from "@/app/actions/staff"
import { UserRole } from "@prisma/client"

interface UnifiedTeamAccessViewProps {
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

export function UnifiedTeamAccessView({ initialStaff, currentUserId }: UnifiedTeamAccessViewProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [staffList, setStaffList] = React.useState<StaffUserItem[]>(initialStaff)
  const [pendingUserIds, setPendingUserIds] = React.useState<Record<string, boolean>>({})

  // Add Staff Dialog State
  const [isAddStaffOpen, setIsAddStaffOpen] = React.useState(false)
  const [isSubmittingNewStaff, setIsSubmittingNewStaff] = React.useState(false)
  const [addForm, setAddForm] = React.useState({
    name: "",
    email: "",
    password: "",
    role: UserRole.SalesRep as UserRole,
  })

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

  async function handleAddStaffSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!addForm.name.trim()) {
      toast.error("Please enter a name.")
      return
    }
    if (!addForm.email.trim()) {
      toast.error("Please enter an email address.")
      return
    }
    if (!addForm.password || addForm.password.length < 6) {
      toast.error("Password must be at least 6 characters.")
      return
    }

    setIsSubmittingNewStaff(true)

    try {
      const res = await addNewStaff({
        name: addForm.name.trim(),
        email: addForm.email.trim(),
        password: addForm.password,
        role: addForm.role,
      })

      if (!res.success) {
        toast.error(res.error || "Failed to add staff member.")
        return
      }

      toast.success(`Staff member "${addForm.name.trim()}" added successfully!`)
      setIsAddStaffOpen(false)
      setAddForm({
        name: "",
        email: "",
        password: "",
        role: UserRole.SalesRep,
      })

      startTransition(() => {
        router.refresh()
      })
    } catch (err: any) {
      toast.error(err.message || "Failed to create staff member.")
    } finally {
      setIsSubmittingNewStaff(false)
    }
  }

  const activeCount = staffList.filter((u) => u.isActive).length
  const blockedCount = staffList.length - activeCount

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
            Settings &amp; Permissions
          </p>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Team &amp; Access</h1>
          <p className="text-sm text-muted-foreground">
            Manage your dealership staff members, dynamically update roles, and control system login access.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs">
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

          <Button
            onClick={() => setIsAddStaffOpen(true)}
            className="gap-2 shadow-xs"
            size="sm"
          >
            <UserPlus className="size-4" />
            <span>Add Staff</span>
          </Button>
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
                <CardTitle className="text-base font-semibold">Staff Directory &amp; Access Control</CardTitle>
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
                  <TableHead className="w-[30%]">Name</TableHead>
                  <TableHead className="w-[25%]">Email Address</TableHead>
                  <TableHead className="w-[25%]">Role</TableHead>
                  <TableHead className="w-[20%] text-right">Status</TableHead>
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

      {/* Add Staff Modal Dialog */}
      <Dialog open={isAddStaffOpen} onOpenChange={setIsAddStaffOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="size-5 text-primary" />
              <span>Add New Staff Member</span>
            </DialogTitle>
            <DialogDescription>
              Create system login credentials and assign an operational role for a new team member.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddStaffSubmit} className="space-y-4 pt-1">
            <div className="space-y-2">
              <Label htmlFor="staff-name">Full Name *</Label>
              <Input
                id="staff-name"
                required
                placeholder="e.g. Ruwan Silva"
                value={addForm.name}
                onChange={(e) => setAddForm((prev) => ({ ...prev, name: e.target.value }))}
                disabled={isSubmittingNewStaff}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="staff-email">Email Address *</Label>
              <Input
                id="staff-email"
                type="email"
                required
                placeholder="ruwan@dealership.com"
                value={addForm.email}
                onChange={(e) => setAddForm((prev) => ({ ...prev, email: e.target.value }))}
                disabled={isSubmittingNewStaff}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="staff-password">Password *</Label>
              <div className="relative">
                <Input
                  id="staff-password"
                  type="password"
                  required
                  minLength={6}
                  placeholder="Minimum 6 characters"
                  value={addForm.password}
                  onChange={(e) => setAddForm((prev) => ({ ...prev, password: e.target.value }))}
                  disabled={isSubmittingNewStaff}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="staff-role">Role *</Label>
              <Select
                value={addForm.role}
                onValueChange={(val) => {
                  if (val) setAddForm((prev) => ({ ...prev, role: val as UserRole }))
                }}
                disabled={isSubmittingNewStaff}
              >
                <SelectTrigger id="staff-role">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {roleOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      <div className="flex flex-col text-left">
                        <span className="font-medium text-xs">{opt.label}</span>
                        <span className="text-[10px] text-muted-foreground">{opt.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddStaffOpen(false)}
                disabled={isSubmittingNewStaff}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmittingNewStaff} className="gap-2">
                {isSubmittingNewStaff && <Loader2 className="size-4 animate-spin" />}
                Create Staff Account
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
