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
  Building2,
  MapPin,
  Phone,
  Plus,
  Search,
  Edit,
  Trash2,
  Users,
  Bike,
  BadgeDollarSign,
  Loader2,
  AlertCircle,
  Sparkles,
  CheckCircle2,
} from "lucide-react"
import {
  BranchRecordItem,
  createBranch,
  updateBranch,
  deleteBranch,
} from "@/app/actions/branch"

interface BranchManagementProps {
  initialBranches: BranchRecordItem[]
  dealershipName: string
}

export function BranchManagement({
  initialBranches,
  dealershipName,
}: BranchManagementProps) {
  const [branches, setBranches] = React.useState<BranchRecordItem[]>(initialBranches)
  const [searchTerm, setSearchTerm] = React.useState("")

  // Add Branch State
  const [isAddOpen, setIsAddOpen] = React.useState(false)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [addForm, setAddForm] = React.useState({
    name: "",
    location: "",
    contactNumber: "",
  })

  // Edit Branch State
  const [isEditOpen, setIsEditOpen] = React.useState(false)
  const [isEditing, setIsEditing] = React.useState(false)
  const [editingBranch, setEditingBranch] = React.useState<BranchRecordItem | null>(null)
  const [editForm, setEditForm] = React.useState({
    id: "",
    name: "",
    location: "",
    contactNumber: "",
  })

  // Delete Branch State
  const [isDeleteOpen, setIsDeleteOpen] = React.useState(false)
  const [isDeleting, setIsDeleting] = React.useState(false)
  const [deletingBranch, setDeletingBranch] = React.useState<BranchRecordItem | null>(null)

  // Filter branches by search term
  const filteredBranches = React.useMemo(() => {
    if (!searchTerm.trim()) return branches
    const q = searchTerm.toLowerCase()
    return branches.filter(
      (b) =>
        b.name.toLowerCase().includes(q) ||
        (b.location && b.location.toLowerCase().includes(q)) ||
        (b.contactNumber && b.contactNumber.includes(q))
    )
  }, [branches, searchTerm])

  // Summary Metrics
  const totalBranches = branches.length
  const totalWorkforce = branches.reduce((sum, b) => sum + b.usersCount, 0)
  const totalVehiclesInBranches = branches.reduce((sum, b) => sum + b.vehiclesCount, 0)
  const totalSalesProcessed = branches.reduce((sum, b) => sum + b.salesCount, 0)

  // 1. Create Branch Handler
  const handleCreateBranch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!addForm.name.trim()) {
      toast.error("Please enter a branch name.")
      return
    }

    setIsSubmitting(true)
    try {
      const result = await createBranch({
        name: addForm.name,
        location: addForm.location,
        contactNumber: addForm.contactNumber,
      })

      if (result.success && result.branch) {
        toast.success(result.message)
        setBranches((prev) => [result.branch!, ...prev])
        setAddForm({ name: "", location: "", contactNumber: "" })
        setIsAddOpen(false)
      } else {
        toast.error(result.error || "Failed to create branch.")
      }
    } catch (err: any) {
      toast.error(err.message || "An unexpected error occurred.")
    } finally {
      setIsSubmitting(false)
    }
  }

  // 2. Open Edit Dialog
  const handleOpenEdit = (branch: BranchRecordItem) => {
    setEditingBranch(branch)
    setEditForm({
      id: branch.id,
      name: branch.name,
      location: branch.location || "",
      contactNumber: branch.contactNumber || "",
    })
    setIsEditOpen(true)
  }

  // 3. Update Branch Handler
  const handleUpdateBranch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editForm.name.trim()) {
      toast.error("Please enter a valid branch name.")
      return
    }

    setIsEditing(true)
    try {
      const result = await updateBranch({
        id: editForm.id,
        name: editForm.name,
        location: editForm.location,
        contactNumber: editForm.contactNumber,
      })

      if (result.success && result.branch) {
        toast.success(result.message)
        setBranches((prev) =>
          prev.map((b) => (b.id === result.branch!.id ? result.branch! : b))
        )
        setIsEditOpen(false)
      } else {
        toast.error(result.error || "Failed to update branch.")
      }
    } catch (err: any) {
      toast.error(err.message || "An unexpected error occurred.")
    } finally {
      setIsEditing(false)
    }
  }

  // 4. Open Delete Dialog
  const handleOpenDelete = (branch: BranchRecordItem) => {
    setDeletingBranch(branch)
    setIsDeleteOpen(true)
  }

  // 5. Delete Branch Handler
  const handleDeleteBranch = async () => {
    if (!deletingBranch) return

    setIsDeleting(true)
    try {
      const result = await deleteBranch(deletingBranch.id)

      if (result.success) {
        toast.success(result.message)
        setBranches((prev) => prev.filter((b) => b.id !== deletingBranch.id))
        setIsDeleteOpen(false)
      } else {
        toast.error(result.error || "Failed to delete branch.")
      }
    } catch (err: any) {
      toast.error(err.message || "An unexpected error occurred.")
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Banner & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              Branch & Showroom Management
            </h1>
            <Badge
              variant="outline"
              className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 text-xs font-semibold py-0.5"
            >
              OrgAdmin Only
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Configure dealership physical branches, showrooms, and service centers for{" "}
            <strong className="text-foreground">{dealershipName}</strong>.
          </p>
        </div>

        {/* Action Button: Add New Branch */}
        <Button
          onClick={() => setIsAddOpen(true)}
          className="h-9 gap-2 bg-primary text-primary-foreground shadow-xs hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          <span>Add New Branch</span>
        </Button>
      </div>

      {/* 4 Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border border-slate-200/90 dark:border-slate-800 rounded-xl sm:rounded-2xl shadow-xs bg-white dark:bg-slate-900">
          <CardContent className="p-4 sm:p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Total Showrooms
              </p>
              <h3 className="text-xl sm:text-2xl font-black text-foreground mt-1 font-mono">
                {totalBranches}
              </h3>
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1 mt-0.5">
                <CheckCircle2 className="size-3" />
                Active facilities
              </p>
            </div>
            <div className="size-10 sm:size-12 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Building2 className="size-5 sm:size-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-slate-200/90 dark:border-slate-800 rounded-xl sm:rounded-2xl shadow-xs bg-white dark:bg-slate-900">
          <CardContent className="p-4 sm:p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Assigned Staff
              </p>
              <h3 className="text-xl sm:text-2xl font-black text-foreground mt-1 font-mono">
                {totalWorkforce}
              </h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Managers, sales & tech
              </p>
            </div>
            <div className="size-10 sm:size-12 rounded-xl bg-primary/10 text-primary-foreground dark:text-purple-400 flex items-center justify-center">
              <Users className="size-5 sm:size-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-slate-200/90 dark:border-slate-800 rounded-xl sm:rounded-2xl shadow-xs bg-white dark:bg-slate-900">
          <CardContent className="p-4 sm:p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                EV Bikes in Stock
              </p>
              <h3 className="text-xl sm:text-2xl font-black text-foreground mt-1 font-mono">
                {totalVehiclesInBranches}
              </h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Across all showrooms
              </p>
            </div>
            <div className="size-10 sm:size-12 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Bike className="size-5 sm:size-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-slate-200/90 dark:border-slate-800 rounded-xl sm:rounded-2xl shadow-xs bg-white dark:bg-slate-900">
          <CardContent className="p-4 sm:p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Sales Processed
              </p>
              <h3 className="text-xl sm:text-2xl font-black text-foreground mt-1 font-mono">
                {totalSalesProcessed}
              </h3>
              <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium mt-0.5">
                Completed orders
              </p>
            </div>
            <div className="size-10 sm:size-12 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <BadgeDollarSign className="size-5 sm:size-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Table Card */}
      <Card className="border border-slate-200/90 dark:border-slate-800 rounded-xl sm:rounded-2xl shadow-xs bg-white dark:bg-slate-900">
        <CardHeader className="pb-3 border-b border-slate-200/80 dark:border-slate-800">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Building2 className="h-4 w-4 text-blue-500" />
                Showrooms & Service Centers Directory
              </CardTitle>
              <CardDescription className="text-xs">
                Physical branch locations for inventory intake, EV bike displays, POS sales, and workshop maintenance.
              </CardDescription>
            </div>

            {/* Search Box */}
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search by branch name, location, or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 h-8 text-xs bg-slate-50 dark:bg-slate-800/50"
              />
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {filteredBranches.length === 0 ? (
            <div className="py-12 text-center text-xs text-muted-foreground flex flex-col items-center justify-center space-y-2">
              <Building2 className="size-8 text-muted-foreground/40" />
              <p className="font-semibold text-foreground">No branches found</p>
              <p className="text-[11px]">
                {searchTerm
                  ? "No branches match your search criteria."
                  : "Click 'Add New Branch' above to register your first dealership showroom."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto w-full">
              <Table>
                <TableHeader className="bg-slate-50/70 dark:bg-slate-800/40">
                  <TableRow className="border-slate-200/80 dark:border-slate-800">
                    <TableHead className="text-xs font-semibold">Branch Name</TableHead>
                    <TableHead className="text-xs font-semibold">Location / Address</TableHead>
                    <TableHead className="text-xs font-semibold">Contact Number</TableHead>
                    <TableHead className="text-xs font-semibold text-center">Assigned Staff</TableHead>
                    <TableHead className="text-xs font-semibold text-center">Inventory Units</TableHead>
                    <TableHead className="text-xs font-semibold text-center">Completed Sales</TableHead>
                    <TableHead className="text-xs font-semibold text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBranches.map((branch) => (
                    <TableRow
                      key={branch.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors border-slate-200/60 dark:border-slate-800"
                    >
                      {/* 1. Branch Name */}
                      <TableCell className="text-xs py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="size-8 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                            <Building2 className="size-4" />
                          </div>
                          <div>
                            <div className="font-bold text-foreground text-sm">
                              {branch.name}
                            </div>
                            <div className="text-[10px] text-muted-foreground font-mono">
                              ID: {branch.id.slice(0, 8)}...
                            </div>
                          </div>
                        </div>
                      </TableCell>

                      {/* 2. Location / Address */}
                      <TableCell className="text-xs py-3.5">
                        {branch.location ? (
                          <div className="flex items-center gap-1.5 text-foreground">
                            <MapPin className="size-3.5 text-muted-foreground shrink-0" />
                            <span className="truncate max-w-[200px]">{branch.location}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground italic text-[11px]">
                            Address not specified
                          </span>
                        )}
                      </TableCell>

                      {/* 3. Contact Number */}
                      <TableCell className="text-xs py-3.5">
                        {branch.contactNumber ? (
                          <div className="flex items-center gap-1.5 font-mono text-foreground">
                            <Phone className="size-3 text-emerald-500 shrink-0" />
                            <span>{branch.contactNumber}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-[11px] font-mono">—</span>
                        )}
                      </TableCell>

                      {/* 4. Assigned Staff Count */}
                      <TableCell className="text-xs py-3.5 text-center font-mono">
                        <Badge variant="outline" className="text-[11px] font-semibold bg-primary/5 text-primary-foreground dark:text-purple-400 border-primary/20">
                          {branch.usersCount} Staff
                        </Badge>
                      </TableCell>

                      {/* 5. Inventory EV Bikes Count */}
                      <TableCell className="text-xs py-3.5 text-center font-mono">
                        <Badge variant="outline" className="text-[11px] font-semibold bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
                          {branch.vehiclesCount} Bikes
                        </Badge>
                      </TableCell>

                      {/* 6. Completed Sales Count */}
                      <TableCell className="text-xs py-3.5 text-center font-mono">
                        <Badge variant="outline" className="text-[11px] font-semibold bg-amber-500/5 text-amber-600 dark:text-amber-400 border-amber-500/20">
                          {branch.salesCount} Deals
                        </Badge>
                      </TableCell>

                      {/* 7. Actions: Edit & Delete */}
                      <TableCell className="text-xs py-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5 whitespace-nowrap">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenEdit(branch)}
                            className="h-8 px-2.5 text-xs text-primary hover:text-primary hover:bg-primary/10 gap-1 font-semibold"
                            title="Edit branch details"
                          >
                            <Edit className="size-3.5" />
                            <span>Edit</span>
                          </Button>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenDelete(branch)}
                            className="h-8 px-2.5 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20 gap-1 font-semibold"
                            title="Delete branch showroom"
                          >
                            <Trash2 className="size-3.5" />
                            <span>Delete</span>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* DIALOG 1: ADD NEW BRANCH */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <form onSubmit={handleCreateBranch}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base font-bold">
                <Building2 className="h-5 w-5 text-primary" />
                Add New Showroom Branch
              </DialogTitle>
              <DialogDescription className="text-xs">
                Register a new showroom or regional service facility for {dealershipName}.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4 text-xs">
              {/* Branch Name */}
              <div className="space-y-1.5">
                <Label htmlFor="branch-name" className="text-xs font-semibold">
                  Branch Name <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <Building2 className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    id="branch-name"
                    required
                    placeholder="e.g. Colombo Flagship Showroom, Kandy Center"
                    value={addForm.name}
                    onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                    className="pl-8 text-xs h-9"
                  />
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Must be unique across your dealership network.
                </p>
              </div>

              {/* Location / Address */}
              <div className="space-y-1.5">
                <Label htmlFor="branch-location" className="text-xs font-semibold">
                  Location / Physical Address
                </Label>
                <div className="relative">
                  <MapPin className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    id="branch-location"
                    placeholder="e.g. No. 120 Galle Road, Colombo 03"
                    value={addForm.location}
                    onChange={(e) => setAddForm({ ...addForm, location: e.target.value })}
                    className="pl-8 text-xs h-9"
                  />
                </div>
              </div>

              {/* Contact Number */}
              <div className="space-y-1.5">
                <Label htmlFor="branch-contact" className="text-xs font-semibold">
                  Contact Phone Number
                </Label>
                <div className="relative">
                  <Phone className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    id="branch-contact"
                    placeholder="e.g. +94 11 234 5678"
                    value={addForm.contactNumber}
                    onChange={(e) => setAddForm({ ...addForm, contactNumber: e.target.value })}
                    className="pl-8 text-xs h-9 font-mono"
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-slate-200 dark:border-slate-800">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsAddOpen(false)}
                disabled={isSubmitting}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSubmitting}
                className="text-xs bg-primary text-primary-foreground font-semibold shadow-xs"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                    <span>Creating Branch...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-1.5 size-3.5" />
                    <span>Create Branch</span>
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DIALOG 2: EDIT BRANCH */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <form onSubmit={handleUpdateBranch}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base font-bold">
                <Edit className="h-5 w-5 text-primary" />
                Edit Branch Showroom
              </DialogTitle>
              <DialogDescription className="text-xs">
                Update name, location, or contact details for {editingBranch?.name}.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4 text-xs">
              {/* Branch Name */}
              <div className="space-y-1.5">
                <Label htmlFor="edit-branch-name" className="text-xs font-semibold">
                  Branch Name <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <Building2 className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    id="edit-branch-name"
                    required
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="pl-8 text-xs h-9"
                  />
                </div>
              </div>

              {/* Location */}
              <div className="space-y-1.5">
                <Label htmlFor="edit-branch-location" className="text-xs font-semibold">
                  Location / Address
                </Label>
                <div className="relative">
                  <MapPin className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    id="edit-branch-location"
                    value={editForm.location}
                    onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                    className="pl-8 text-xs h-9"
                  />
                </div>
              </div>

              {/* Contact */}
              <div className="space-y-1.5">
                <Label htmlFor="edit-branch-contact" className="text-xs font-semibold">
                  Contact Phone Number
                </Label>
                <div className="relative">
                  <Phone className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    id="edit-branch-contact"
                    value={editForm.contactNumber}
                    onChange={(e) => setEditForm({ ...editForm, contactNumber: e.target.value })}
                    className="pl-8 text-xs h-9 font-mono"
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-slate-200 dark:border-slate-800">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsEditOpen(false)}
                disabled={isEditing}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isEditing}
                className="text-xs bg-primary text-primary-foreground font-semibold shadow-xs"
              >
                {isEditing ? (
                  <>
                    <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                    <span>Saving Changes...</span>
                  </>
                ) : (
                  <span>Save Changes</span>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DIALOG 3: DELETE CONFIRMATION */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="sm:max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-red-600 dark:text-red-400">
              <AlertCircle className="h-5 w-5" />
              Delete Branch Showroom
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Are you sure you want to remove{" "}
              <strong className="text-foreground">{deletingBranch?.name}</strong> from your dealership network?
            </DialogDescription>
          </DialogHeader>

          <div className="py-3 text-xs space-y-2">
            <p className="text-muted-foreground">
              This action cannot be undone. You can only delete branches that have zero active inventory units, staff logins, and sales records.
            </p>

            {deletingBranch && (
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border text-[11px] space-y-1 font-mono">
                <div className="flex justify-between">
                  <span>Assigned Staff:</span>
                  <span className="font-bold">{deletingBranch.usersCount}</span>
                </div>
                <div className="flex justify-between">
                  <span>In-Stock EV Bikes:</span>
                  <span className="font-bold">{deletingBranch.vehiclesCount}</span>
                </div>
                <div className="flex justify-between">
                  <span>Associated Sales:</span>
                  <span className="font-bold">{deletingBranch.salesCount}</span>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-slate-200 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsDeleteOpen(false)}
              disabled={isDeleting}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleDeleteBranch}
              disabled={isDeleting}
              className="text-xs font-semibold"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                  <span>Deleting...</span>
                </>
              ) : (
                <span>Confirm Delete</span>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

