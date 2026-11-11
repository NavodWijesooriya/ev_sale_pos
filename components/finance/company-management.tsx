"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  Building2,
  LoaderCircle,
  MoreHorizontal,
  Pencil,
  Plus,
  ShieldCheck,
  Trash2,
  UserRoundPlus,
  UsersRound,
} from "lucide-react"
import { toast } from "sonner"
import {
  addFinanceOfficer,
  addInsuranceOfficer,
  createFinanceCompany,
  createInsuranceCompany,
  deleteFinanceCompany,
  deleteFinanceOfficer,
  deleteInsuranceCompany,
  deleteInsuranceOfficer,
  updateFinanceCompany,
  updateInsuranceCompany,
} from "@/app/actions/finance"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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

export interface CompanyOfficer {
  id: string
  name: string
  contactNo: string
}

export interface ManagedCompany {
  id: string
  name: string
  contactNo: string
  defaultCommissionRate: number | null
  officers: CompanyOfficer[]
}

interface CompanyManagementProps {
  kind: "finance" | "insurance"
  initialCompanies: ManagedCompany[]
}

interface CompanyFormState {
  name: string
  contactNo: string
  defaultCommissionRate: string
}

const emptyCompanyForm: CompanyFormState = {
  name: "",
  contactNo: "",
  defaultCommissionRate: "",
}

export function CompanyManagement({ kind, initialCompanies }: CompanyManagementProps) {
  const router = useRouter()
  const isFinance = kind === "finance"
  const companyType = isFinance ? "finance" : "insurance"
  const companyTitle = isFinance ? "Finance Company" : "Insurance Company"
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [editingCompany, setEditingCompany] = React.useState<ManagedCompany | null>(null)
  const [formValues, setFormValues] = React.useState<CompanyFormState>(emptyCompanyForm)
  const [officerCompanyId, setOfficerCompanyId] = React.useState<string | null>(null)
  const [officerName, setOfficerName] = React.useState("")
  const [officerContactNo, setOfficerContactNo] = React.useState("")
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const companies = initialCompanies
  const officerCompany = companies.find((company) => company.id === officerCompanyId) ?? null

  function openCreateDialog() {
    setEditingCompany(null)
    setFormValues(emptyCompanyForm)
    setDialogOpen(true)
  }

  function openEditDialog(company: ManagedCompany) {
    setEditingCompany(company)
    setFormValues({
      name: company.name,
      contactNo: company.contactNo,
      defaultCommissionRate: company.defaultCommissionRate?.toString() ?? "",
    })
    setDialogOpen(true)
  }

  async function saveCompany(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const parsedRate = formValues.defaultCommissionRate.trim()
      ? Number(formValues.defaultCommissionRate)
      : null
    if (parsedRate !== null && (!Number.isFinite(parsedRate) || parsedRate < 0 || parsedRate > 100)) {
      toast.error("Default commission rate must be between 0 and 100.")
      return
    }

    setIsSubmitting(true)
    try {
      const input = {
        name: formValues.name,
        contactNo: formValues.contactNo,
        defaultCommissionRate: parsedRate,
      }
      const result = isFinance
        ? editingCompany
          ? await updateFinanceCompany({ ...input, id: editingCompany.id })
          : await createFinanceCompany(input)
        : editingCompany
          ? await updateInsuranceCompany({ ...input, id: editingCompany.id })
          : await createInsuranceCompany(input)
      if (!result.success) {
        toast.error(result.error)
        return
      }

      toast.success(`${companyTitle} ${editingCompany ? "updated" : "created"}.`)
      setDialogOpen(false)
      router.refresh()
    } catch (error) {
      console.error(`Saving ${companyType} company failed:`, error)
      toast.error(`Unable to save ${companyType} company.`)
    } finally {
      setIsSubmitting(false)
    }
  }

  async function removeCompany(company: ManagedCompany) {
    if (!window.confirm(`Delete "${company.name}"? Its officers will also be removed.`)) return

    setIsSubmitting(true)
    try {
      const result = isFinance
        ? await deleteFinanceCompany(company.id)
        : await deleteInsuranceCompany(company.id)
      if (!result.success) {
        toast.error(result.error)
        return
      }
      toast.success(`${companyTitle} deleted.`)
      router.refresh()
    } catch (error) {
      console.error(`Deleting ${companyType} company failed:`, error)
      toast.error(`Unable to delete ${companyType} company.`)
    } finally {
      setIsSubmitting(false)
    }
  }

  async function saveOfficer(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!officerCompany) return
    setIsSubmitting(true)
    try {
      const input = {
        companyId: officerCompany.id,
        name: officerName,
        contactNo: officerContactNo,
      }
      const result = isFinance
        ? await addFinanceOfficer(input)
        : await addInsuranceOfficer(input)
      if (!result.success) {
        toast.error(result.error)
        return
      }
      toast.success(`${companyTitle} officer added.`)
      setOfficerName("")
      setOfficerContactNo("")
      router.refresh()
    } catch (error) {
      console.error(`Adding ${companyType} officer failed:`, error)
      toast.error(`Unable to add ${companyType} officer.`)
    } finally {
      setIsSubmitting(false)
    }
  }

  async function removeOfficer(officer: CompanyOfficer) {
    setIsSubmitting(true)
    try {
      const result = isFinance
        ? await deleteFinanceOfficer(officer.id)
        : await deleteInsuranceOfficer(officer.id)
      if (!result.success) {
        toast.error(result.error)
        return
      }
      toast.success("Officer removed.")
      router.refresh()
    } catch (error) {
      console.error(`Deleting ${companyType} officer failed:`, error)
      toast.error(`Unable to delete ${companyType} officer.`)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <div className="space-y-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
              Finance Management
            </p>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{companyTitle}s</h1>
            <p className="text-sm text-muted-foreground">
              Manage company contacts, commission defaults, and assigned officers.
            </p>
          </div>
          <Button onClick={openCreateDialog} className="gap-2">
            <Plus className="size-4" />
            Add Company
          </Button>
        </header>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                {isFinance ? <Building2 className="size-5" /> : <ShieldCheck className="size-5" />}
              </span>
              <div>
                <CardTitle>{companyTitle} Directory</CardTitle>
                <CardDescription>
                  {companies.length} {companies.length === 1 ? "company" : "companies"} configured
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Default Commission</TableHead>
                  <TableHead>Officers</TableHead>
                  <TableHead className="w-12 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {companies.map((company) => (
                  <TableRow key={company.id}>
                    <TableCell className="font-medium">{company.name}</TableCell>
                    <TableCell>{company.contactNo}</TableCell>
                    <TableCell>
                      {company.defaultCommissionRate == null
                        ? <span className="text-muted-foreground">Not set</span>
                        : `${company.defaultCommissionRate}%`}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{company.officers.length}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              aria-label={`Actions for ${company.name}`}
                            />
                          }
                        >
                          <MoreHorizontal className="size-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setOfficerCompanyId(company.id)}>
                            <UsersRound className="size-4" />
                            Manage Officers
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openEditDialog(company)}>
                            <Pencil className="size-4" />
                            Edit Company
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() => void removeCompany(company)}
                          >
                            <Trash2 className="size-4" />
                            Delete Company
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
                {companies.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="h-28 text-center text-muted-foreground">
                      No companies added yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCompany ? "Edit" : "Add"} {companyTitle}</DialogTitle>
            <DialogDescription>
              Company details and optional commission rate used as a POS reference.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={saveCompany} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor={`${companyType}-company-name`}>Company name</Label>
              <Input
                id={`${companyType}-company-name`}
                value={formValues.name}
                onChange={(event) => setFormValues((current) => ({ ...current, name: event.target.value }))}
                minLength={2}
                maxLength={120}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${companyType}-company-contact`}>Contact number</Label>
              <Input
                id={`${companyType}-company-contact`}
                value={formValues.contactNo}
                onChange={(event) => setFormValues((current) => ({ ...current, contactNo: event.target.value }))}
                maxLength={40}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${companyType}-company-rate`}>Default commission rate (%)</Label>
              <Input
                id={`${companyType}-company-rate`}
                type="number"
                min={0}
                max={100}
                step="0.01"
                value={formValues.defaultCommissionRate}
                onChange={(event) =>
                  setFormValues((current) => ({ ...current, defaultCommissionRate: event.target.value }))
                }
                placeholder="Optional"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} className="gap-2">
                {isSubmitting && <LoaderCircle className="size-4 animate-spin" />}
                {editingCompany ? "Save Changes" : "Create Company"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(officerCompanyId)}
        onOpenChange={(open) => {
          if (!open) setOfficerCompanyId(null)
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Manage {companyTitle} Officers</DialogTitle>
            <DialogDescription>{officerCompany?.name}</DialogDescription>
          </DialogHeader>
          <div className="max-h-64 space-y-2 overflow-y-auto">
            {officerCompany?.officers.map((officer) => (
              <div key={officer.id} className="flex items-center gap-3 rounded-lg border p-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{officer.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{officer.contactNo}</p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Remove ${officer.name}`}
                  disabled={isSubmitting}
                  onClick={() => void removeOfficer(officer)}
                >
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              </div>
            ))}
            {officerCompany?.officers.length === 0 && (
              <p className="rounded-lg border border-dashed p-5 text-center text-sm text-muted-foreground">
                No officers added yet.
              </p>
            )}
          </div>
          <form onSubmit={saveOfficer} className="space-y-3 border-t pt-4">
            <h3 className="flex items-center gap-2 text-sm font-medium">
              <UserRoundPlus className="size-4 text-primary" />
              Add officer
            </h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor={`${companyType}-officer-name`}>Name</Label>
                <Input
                  id={`${companyType}-officer-name`}
                  value={officerName}
                  onChange={(event) => setOfficerName(event.target.value)}
                  minLength={2}
                  maxLength={120}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`${companyType}-officer-contact`}>Contact number</Label>
                <Input
                  id={`${companyType}-officer-contact`}
                  value={officerContactNo}
                  onChange={(event) => setOfficerContactNo(event.target.value)}
                  maxLength={40}
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={isSubmitting || !officerCompany} className="gap-2">
                {isSubmitting ? <LoaderCircle className="size-4 animate-spin" /> : <Plus className="size-4" />}
                Add Officer
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
