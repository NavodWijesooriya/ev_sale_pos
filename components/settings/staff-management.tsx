"use client"

import * as React from "react"
import { toast } from "sonner"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
} from "@/components/ui/dialog"
import {
  UserPlus,
  Users,
  ShieldCheck,
  Building2,
  Search,
  KeyRound,
  Edit,
  PowerOff,
  Power,
  Lock,
  Mail,
  User,
  CheckCircle2,
  AlertCircle,
  Briefcase,
  Sparkles,
  Loader2,
} from "lucide-react"
import {
  StaffInitialData,
  StaffUserItem,
  createStaffUser,
  updateStaffUser,
  toggleStaffStatus,
} from "@/app/actions/staff"
import { UserRole } from "@prisma/client"

interface StaffManagementProps {
  initialData: StaffInitialData
}

export function StaffManagement({ initialData }: StaffManagementProps) {
  const [users, setUsers] = React.useState<StaffUserItem[]>(initialData.users)
  const [branches] = React.useState(initialData.branches)
  const currentUserId = initialData.currentUserId

  const [searchTerm, setSearchTerm] = React.useState("")
  const [roleFilter, setRoleFilter] = React.useState<string>("all")

  // Add Dialog State
  const [isAddOpen, setIsAddOpen] = React.useState(false)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [addForm, setAddForm] = React.useState({
    name: "",
    email: "",
    password: "",
    role: UserRole.Cashier as UserRole,
    branchId: branches[0]?.id || "",
  })

  // Edit Dialog State
  const [isEditOpen, setIsEditOpen] = React.useState(false)
  const [isEditing, setIsEditing] = React.useState(false)
  const [editingUser, setEditingUser] = React.useState<StaffUserItem | null>(null)
  const [editForm, setEditForm] = React.useState({
    id: "",
    name: "",
    role: UserRole.Cashier as UserRole,
    branchId: "",
    newPassword: "",
  })

  // Filter users
  const filteredUsers = React.useMemo(() => {
    return users.filter((u) => {
      const matchesSearch =
        u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (u.branchName && u.branchName.toLowerCase().includes(searchTerm.toLowerCase()))

      if (!matchesSearch) return false

      if (roleFilter === "all") return true
      return u.role === roleFilter
    })
  }, [users, searchTerm, roleFilter])

  // Count summaries
  const stats = React.useMemo(() => {
    return {
      total: users.length,
      branchManagers: users.filter((u) => u.role === UserRole.BranchManager).length,
      salesReps: users.filter((u) => u.role === UserRole.SalesRep).length,
      cashiersAndTechs: users.filter(
        (u) => u.role === UserRole.Cashier || u.role === UserRole.Technician
      ).length,
      active: users.filter((u) => u.isActive).length,
    }
  }, [users])

  // Handle Add Staff
  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!addForm.name || !addForm.email || !addForm.password) {
      toast.error("Please fill in all required fields.")
      return
    }

    setIsSubmitting(true)
    try {
      const res = await createStaffUser({
        name: addForm.name,
        email: addForm.email,
        password: addForm.password,
        role: addForm.role,
        branchId: addForm.branchId || null,
      })

      if (res.success && res.user) {
        setUsers((prev) => [res.user as StaffUserItem, ...prev])
        toast.success(`Staff account for ${res.user.name} created successfully!`)
        setIsAddOpen(false)
        setAddForm({
          name: "",
          email: "",
          password: "",
          role: UserRole.Cashier,
          branchId: branches[0]?.id || "",
        })
      } else {
        toast.error(res.error || "Failed to create staff member.")
      }
    } catch (err: any) {
      toast.error(err.message || "An unexpected error occurred.")
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle Open Edit
  const handleOpenEdit = (user: StaffUserItem) => {
    setEditingUser(user)
    setEditForm({
      id: user.id,
      name: user.name,
      role: user.role,
      branchId: user.branchId || "",
      newPassword: "",
    })
    setIsEditOpen(true)
  }

  // Handle Update Staff
  const handleUpdateStaff = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editForm.name) {
      toast.error("Name is required.")
      return
    }

    setIsEditing(true)
    try {
      const res = await updateStaffUser({
        id: editForm.id,
        name: editForm.name,
        role: editForm.role,
        branchId: editForm.branchId || null,
        newPassword: editForm.newPassword || undefined,
      })

      if (res.success && res.user) {
        setUsers((prev) =>
          prev.map((u) => (u.id === res.user?.id ? (res.user as StaffUserItem) : u))
        )
        toast.success(`Staff profile for ${res.user.name} updated!`)
        setIsEditOpen(false)
      } else {
        toast.error(res.error || "Failed to update staff member.")
      }
    } catch (err: any) {
      toast.error(err.message || "An unexpected error occurred.")
    } finally {
      setIsEditing(false)
    }
  }

  // Handle Status Toggle (Enable / Disable)
  const handleToggleStatus = async (user: StaffUserItem) => {
    const nextState = !user.isActive
    try {
      const res = await toggleStaffStatus(user.id, nextState)
      if (res.success) {
        setUsers((prev) =>
          prev.map((u) => (u.id === user.id ? { ...u, isActive: nextState } : u))
        )
        if (nextState) {
          toast.success(`Access restored for ${user.name}`)
        } else {
          toast.warning(`Access disabled for ${user.name}`)
        }
      } else {
        toast.error(res.error || "Failed to update account status.")
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to toggle status.")
    }
  }

  const renderRoleBadge = (role: UserRole) => {
    switch (role) {
      case UserRole.OrgAdmin:
        return (
          <Badge
            variant="outline"
            className="bg-primary/10 text-primary-foreground dark:text-purple-400 border-primary/30 text-xs font-semibold gap-1"
          >
            <ShieldCheck className="h-3 w-3" />
            Dealership Admin
          </Badge>
        )
      case UserRole.BranchManager:
        return (
          <Badge
            variant="outline"
            className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30 text-xs font-semibold gap-1"
          >
            <Building2 className="h-3 w-3" />
            Branch Manager
          </Badge>
        )
      case UserRole.SalesRep:
        return (
          <Badge
            variant="outline"
            className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-xs font-semibold gap-1"
          >
            <Briefcase className="h-3 w-3" />
            Sales Rep
          </Badge>
        )
      case UserRole.Cashier:
        return (
          <Badge
            variant="outline"
            className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 text-xs font-semibold gap-1"
          >
            <KeyRound className="h-3 w-3" />
            Cashier
          </Badge>
        )
      case UserRole.Technician:
        return (
          <Badge
            variant="outline"
            className="bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/30 text-xs font-semibold gap-1"
          >
            <Users className="h-3 w-3" />
            Technician
          </Badge>
        )
      default:
        return <Badge variant="outline">{role}</Badge>
    }
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Staff Management & Access Control
            </h1>
            <Badge
              variant="outline"
              className="bg-primary/10 text-primary-foreground dark:text-purple-400 border-primary/30 text-xs font-semibold"
            >
              OrgAdmin Only
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Provision dealership user accounts, assign branch showrooms, and configure RBAC access permissions.
          </p>
        </div>

        {/* Action Button: Add New Staff */}
        <Button
          onClick={() => setIsAddOpen(true)}
          className="h-9 gap-2 bg-primary text-primary-foreground shadow-xs hover:bg-primary/90"
        >
          <UserPlus className="h-4 w-4" />
          <span>Add New Staff</span>
        </Button>
      </div>

      {/* KPI Cards: Staff Distribution */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Staff */}
        <Card className="border-border/80 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Total Staff
            </span>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent className="space-y-0.5">
            <div className="text-2xl font-black text-foreground font-mono">
              {stats.total} <span className="text-xs font-normal text-muted-foreground">users</span>
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.active} active logins enabled
            </p>
          </CardContent>
        </Card>

        {/* Branch Managers */}
        <Card className="border-border/80 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Branch Managers
            </span>
            <Building2 className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent className="space-y-0.5">
            <div className="text-2xl font-black text-blue-600 dark:text-blue-400 font-mono">
              {stats.branchManagers} <span className="text-xs font-normal text-muted-foreground">managers</span>
            </div>
            <p className="text-xs text-muted-foreground">Showroom operations lead</p>
          </CardContent>
        </Card>

        {/* Sales Representatives */}
        <Card className="border-border/80 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Sales Reps
            </span>
            <Briefcase className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent className="space-y-0.5">
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
              {stats.salesReps} <span className="text-xs font-normal text-muted-foreground">reps</span>
            </div>
            <p className="text-xs text-muted-foreground">Floor consultants & leases</p>
          </CardContent>
        </Card>

        {/* Cashiers & Technicians */}
        <Card className="border-border/80 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Cashiers & Techs
            </span>
            <KeyRound className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent className="space-y-0.5">
            <div className="text-2xl font-black text-amber-600 dark:text-amber-400 font-mono">
              {stats.cashiersAndTechs} <span className="text-xs font-normal text-muted-foreground">roles</span>
            </div>
            <p className="text-xs text-muted-foreground">POS checkout & service bay</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Staff Table Card */}
      <Card className="shadow-xs border-border/80">
        <CardHeader className="pb-3 border-b">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                Dealership Staff Directory
              </CardTitle>
              <CardDescription className="text-xs">
                All authorized employee accounts registered for this dealership organization
              </CardDescription>
            </div>

            {/* Filter by Role */}
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { id: "all", label: "All Roles" },
                { id: UserRole.OrgAdmin, label: "Admins" },
                { id: UserRole.BranchManager, label: "Managers" },
                { id: UserRole.SalesRep, label: "Sales Reps" },
                { id: UserRole.Cashier, label: "Cashiers" },
                { id: UserRole.Technician, label: "Technicians" },
              ].map((role) => (
                <Button
                  key={role.id}
                  size="sm"
                  variant={roleFilter === role.id ? "default" : "outline"}
                  className="h-7 px-2.5 text-xs font-medium"
                  onClick={() => setRoleFilter(role.id)}
                >
                  {role.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Search Box */}
          <div className="pt-2">
            <div className="relative max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search staff by name, email, or branch..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 h-8 text-xs"
              />
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {filteredUsers.length === 0 ? (
            <div className="py-12 text-center text-xs text-muted-foreground">
              No staff members match the selected filter or search keyword.
            </div>
          ) : (
            <div className="overflow-x-auto w-full">
              <Table>
              <TableHeader className="bg-muted/30">
                <TableRow>
                  <TableHead className="text-xs font-semibold">Staff Member</TableHead>
                  <TableHead className="text-xs font-semibold">Assigned Role</TableHead>
                  <TableHead className="text-xs font-semibold">Showroom Branch</TableHead>
                  <TableHead className="text-xs font-semibold text-center">Status</TableHead>
                  <TableHead className="text-xs font-semibold">Created Date</TableHead>
                  <TableHead className="text-xs font-semibold text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => {
                  const isSelf = user.id === currentUserId
                  return (
                    <TableRow key={user.id} className="hover:bg-muted/40 transition-colors">
                      {/* Name & Email with Avatar */}
                      <TableCell className="text-xs">
                        <div className="flex items-center gap-2.5">
                          <div className="h-8 w-8 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-xs shrink-0">
                            {user.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-semibold text-foreground flex items-center gap-1.5">
                              {user.name}
                              {isSelf && (
                                <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4">
                                  You
                                </Badge>
                              )}
                            </div>
                            <div className="text-[11px] text-muted-foreground font-mono">
                              {user.email}
                            </div>
                          </div>
                        </div>
                      </TableCell>

                      {/* Role Badge */}
                      <TableCell className="text-xs">
                        {renderRoleBadge(user.role)}
                      </TableCell>

                      {/* Branch */}
                      <TableCell className="text-xs">
                        <div className="flex items-center gap-1 font-medium text-foreground">
                          <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span>{user.branchName}</span>
                        </div>
                        {user.branchLocation && (
                          <div className="text-[11px] text-muted-foreground pl-4.5">
                            {user.branchLocation}
                          </div>
                        )}
                      </TableCell>

                      {/* Active Status */}
                      <TableCell className="text-xs text-center">
                        <Badge
                          variant="outline"
                          className={`text-[11px] font-semibold ${
                            user.isActive
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                              : "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20"
                          }`}
                        >
                          {user.isActive ? "Active" : "Disabled"}
                        </Badge>
                      </TableCell>

                      {/* Created Date */}
                      <TableCell className="text-xs font-mono text-muted-foreground whitespace-nowrap">
                        {new Date(user.createdAt).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="text-xs text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs text-primary hover:text-primary gap-1"
                            onClick={() => handleOpenEdit(user)}
                          >
                            <Edit className="h-3 w-3" />
                            <span>Edit</span>
                          </Button>

                          {!isSelf && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className={`h-7 px-2 text-xs gap-1 ${
                                user.isActive
                                  ? "text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20"
                                  : "text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/20"
                              }`}
                              onClick={() => handleToggleStatus(user)}
                              title={user.isActive ? "Disable Login Access" : "Enable Login Access"}
                            >
                              {user.isActive ? (
                                <>
                                  <PowerOff className="h-3 w-3" />
                                  <span>Disable</span>
                                </>
                              ) : (
                                <>
                                  <Power className="h-3 w-3" />
                                  <span>Enable</span>
                                </>
                              )}
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
      </Card>

      {/* DIALOG 1: ADD NEW STAFF MEMBER */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleCreateStaff}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-primary" />
                Add New Staff Member
              </DialogTitle>
              <DialogDescription>
                Create a login account for dealership staff. They will only see modules permitted by their role.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4 text-xs">
              {/* Full Name */}
              <div className="space-y-1.5">
                <Label htmlFor="staff-name">Full Name *</Label>
                <div className="relative">
                  <User className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    id="staff-name"
                    required
                    placeholder="e.g. Ruwan Perera"
                    value={addForm.name}
                    onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                    className="pl-8 text-xs"
                  />
                </div>
              </div>

              {/* Email Address */}
              <div className="space-y-1.5">
                <Label htmlFor="staff-email">Work Email Address *</Label>
                <div className="relative">
                  <Mail className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    id="staff-email"
                    type="email"
                    required
                    placeholder="ruwan@apexev.com"
                    value={addForm.email}
                    onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                    className="pl-8 text-xs"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <Label htmlFor="staff-password">Initial Password * (min 6 characters)</Label>
                <div className="relative">
                  <Lock className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    id="staff-password"
                    type="password"
                    required
                    minLength={6}
                    placeholder="••••••••"
                    value={addForm.password}
                    onChange={(e) => setAddForm({ ...addForm, password: e.target.value })}
                    className="pl-8 text-xs"
                  />
                </div>
              </div>

              {/* Role Select */}
              <div className="space-y-1.5">
                <Label htmlFor="staff-role">Staff Role *</Label>
                <select
                  id="staff-role"
                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs text-foreground shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  value={addForm.role}
                  onChange={(e) => setAddForm({ ...addForm, role: e.target.value as UserRole })}
                >
                  <option value={UserRole.Cashier}>Cashier (POS Checkout & Receipts only)</option>
                  <option value={UserRole.SalesRep}>SalesRep (Sales, Customers, Services)</option>
                  <option value={UserRole.Technician}>Technician (Services & Job Cards only)</option>
                  <option value={UserRole.BranchManager}>BranchManager (Branch operations, stock & reports)</option>
                  <option value={UserRole.OrgAdmin}>OrgAdmin (Full Dealership Administrator)</option>
                </select>
                <p className="text-[11px] text-muted-foreground">
                  Cashiers & Technicians will have restricted navigation (no Reports or Inventory tabs).
                </p>
              </div>

              {/* Branch Select */}
              <div className="space-y-1.5">
                <Label htmlFor="staff-branch">Showroom Branch</Label>
                <select
                  id="staff-branch"
                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs text-foreground shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  value={addForm.branchId}
                  onChange={(e) => setAddForm({ ...addForm, branchId: e.target.value })}
                >
                  <option value="">Headquarters / All Branches</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} {b.location ? `(${b.location})` : ""}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsAddOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    <span>Creating...</span>
                  </>
                ) : (
                  "Create Staff Account"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DIALOG 2: EDIT STAFF MEMBER */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleUpdateStaff}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Edit className="h-5 w-5 text-primary" />
                Edit Staff Member
              </DialogTitle>
              <DialogDescription>
                Modify profile details, reassign role, change branch, or reset password for {editingUser?.name}.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4 text-xs">
              {/* Name */}
              <div className="space-y-1.5">
                <Label htmlFor="edit-name">Full Name *</Label>
                <Input
                  id="edit-name"
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="text-xs"
                />
              </div>

              {/* Email (Read only) */}
              <div className="space-y-1.5">
                <Label>Email Address</Label>
                <Input
                  disabled
                  value={editingUser?.email || ""}
                  className="text-xs bg-muted/50 cursor-not-allowed font-mono text-muted-foreground"
                />
              </div>

              {/* Role Select */}
              <div className="space-y-1.5">
                <Label htmlFor="edit-role">Role</Label>
                <select
                  id="edit-role"
                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs text-foreground shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  value={editForm.role}
                  onChange={(e) => setEditForm({ ...editForm, role: e.target.value as UserRole })}
                  disabled={editingUser?.id === currentUserId}
                >
                  <option value={UserRole.Cashier}>Cashier</option>
                  <option value={UserRole.SalesRep}>SalesRep</option>
                  <option value={UserRole.Technician}>Technician</option>
                  <option value={UserRole.BranchManager}>BranchManager</option>
                  <option value={UserRole.OrgAdmin}>OrgAdmin</option>
                </select>
                {editingUser?.id === currentUserId && (
                  <p className="text-[11px] text-amber-600">You cannot change your own OrgAdmin role.</p>
                )}
              </div>

              {/* Branch Select */}
              <div className="space-y-1.5">
                <Label htmlFor="edit-branch">Showroom Branch</Label>
                <select
                  id="edit-branch"
                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs text-foreground shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  value={editForm.branchId}
                  onChange={(e) => setEditForm({ ...editForm, branchId: e.target.value })}
                >
                  <option value="">Headquarters / All Branches</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} {b.location ? `(${b.location})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* New Password (Optional) */}
              <div className="space-y-1.5 pt-2 border-t">
                <Label htmlFor="edit-password">Reset Password (Optional)</Label>
                <Input
                  id="edit-password"
                  type="password"
                  placeholder="Leave blank to keep current password"
                  value={editForm.newPassword}
                  onChange={(e) => setEditForm({ ...editForm, newPassword: e.target.value })}
                  className="text-xs"
                />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsEditOpen(false)}
                disabled={isEditing}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={isEditing}>
                {isEditing ? (
                  <>
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

