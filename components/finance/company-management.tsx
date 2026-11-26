"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  Building2,
  ChevronDown,
  ChevronRight,
  LoaderCircle,
  MoreHorizontal,
  MapPin,
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
  CompanyOfficesDialog,
  OfficeRowsEditor,
  emptyOfficeRow,
  type CompanyOfficeItem,
} from "@/components/finance/company-offices"
import type { OfficeInput } from "@/lib/company-offices"

export interface CompanyOfficer {
  id: string
  name: string
  contactNo: string
}

export interface ManagedCompany {
  id: string
  name: string
  contactNo: string
  headOfficeAddress: string | null
  defaultCommissionRate: number | null
  officers: CompanyOfficer[]
  offices: CompanyOfficeItem[]
}

interface CompanyManagementProps {
  kind: "finance" | "insurance"
  initialCompanies: ManagedCompany[]
}

interface CompanyFormState {
  name: string
  contactNo: string
  headOfficeAddress: string
  defaultCommissionRate: string
}

const emptyCompanyForm: CompanyFormState = {
  name: "",
  contactNo: "",
  headOfficeAddress: "",
  defaultCommissionRate: "",
}

export function CompanyManagement({ kind, initialCompanies }: CompanyManagementProps) {
  const router = useRouter()
  const isFinance = kind === "finance"
  const companyType = isFinance ? "finance" : "insurance"
  const companyTitle = isFinance ? "Finance Company" : "Insurance Company"
  const companiesTitle = isFinance ? "Finance Companies" : "Insurance Companies"
  const [expanded, setExpanded] = React.useState<Set<string>>(() => new Set())
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [editingCompany, setEditingCompany] = React.useState<ManagedCompany | null>(null)
  const [formValues, setFormValues] = React.useState<CompanyFormState>(emptyCompanyForm)
  const [officerCompanyId, setOfficerCompanyId] = React.useState<string | null>(null)
  const [officeCompanyId, setOfficeCompanyId] = React.useState<string | null>(null)
  const [officeRows, setOfficeRows] = React.useState<OfficeInput[]>([])
  const [officerName, setOfficerName] = React.useState("")
  const [officerContactNo, setOfficerContactNo] = React.useState("")
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const companies = initialCompanies
  const officerCompany = companies.find((company) => company.id === officerCompanyId) ?? null
  const officeCompany = companies.find((company) => company.id === officeCompanyId) ?? null

  const allExpanded = companies.length > 0 && companies.every((company) => expanded.has(company.id))

  function toggleOne(id: string) {
    setExpanded((current) => {
      const next = new Set(current)
      if (!next.delete(id)) next.add(id)
      return next
    })
  }

  function toggleAll() {
    setExpanded(allExpanded ? new Set() : new Set(companies.map((company) => company.id)))
  }

  function openCreateDialog() {
    setEditingCompany(null)
    setFormValues(emptyCompanyForm)
    setOfficeRows([emptyOfficeRow()])
    setDialogOpen(true)
  }

  function openEditDialog(company: ManagedCompany) {
    setEditingCompany(company)
    setFormValues({
      name: company.name,
      contactNo: company.contactNo,
      headOfficeAddress: company.headOfficeAddress ?? "",
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
        headOfficeAddress: formValues.headOfficeAddress,
        defaultCommissionRate: parsedRate,
      }
      const result = isFinance
        ? editingCompany
          ? await updateFinanceCompany({ ...input, id: editingCompany.id })
          : await createFinanceCompany({ ...input, offices: officeRows })
        : editingCompany
          ? await updateInsuranceCompany({ ...input, id: editingCompany.id })
          : await createInsuranceCompany({ ...input, offices: officeRows })
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
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{companiesTitle}</h1>
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
          <CardContent className="space-y-3">
            {companies.length > 0 && (
              <div className="flex justify-end">
                <Button type="button" variant="outline" size="sm" onClick={toggleAll}>
                  {allExpanded ? "Collapse all" : "Expand all"}
                </Button>
              </div>
            )}

            <div className="hidden grid-cols-[2rem_minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_5rem_5rem_2.5rem] gap-3 px-3 text-xs font-medium text-muted-foreground md:grid">
              <span />
              <span>Company</span>
              <span>Contact</span>
              <span>Default Commission</span>
              <span>Officers</span>
              <span>Offices</span>
              <span className="text-right">Actions</span>
            </div>

            {companies.map((company) => {
              const isOpen = expanded.has(company.id)
              return (
                <div key={company.id} className="rounded-lg border" data-testid={`company-row-${company.name}`}>
                  <div
                    className="grid cursor-pointer grid-cols-[2rem_minmax(0,1fr)_2.5rem] items-start gap-x-3 gap-y-2 p-3 hover:bg-muted/30 md:grid-cols-[2rem_minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_5rem_5rem_2.5rem] md:items-center"
                    onClick={() => toggleOne(company.id)}
                  >
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-expanded={isOpen}
                      aria-label={`${isOpen ? "Collapse" : "Expand"} ${company.name}`}
                      onClick={(event) => {
                        event.stopPropagation()
                        toggleOne(company.id)
                      }}
                    >
                      {isOpen ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                    </Button>
                    <div className="min-w-0">
                      <p className="font-medium">{company.name}</p>
                      {company.headOfficeAddress && (
                        <p className="flex items-start gap-1 text-xs text-muted-foreground" data-testid="company-address">
                          <MapPin className="mt-0.5 size-3 shrink-0" />
                          <span className="break-words">{company.headOfficeAddress}</span>
                        </p>
                      )}
                    </div>
                    <div className="col-start-3 row-start-1 text-right md:col-start-7 md:row-start-auto" onClick={(event) => event.stopPropagation()}>
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
                          <DropdownMenuItem onClick={() => setOfficeCompanyId(company.id)}>
                            <MapPin className="size-4" />
                            Manage Offices
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openEditDialog(company)}>
                            <Pencil className="size-4" />
                            Edit Company
                          </DropdownMenuItem>
                          <DropdownMenuItem variant="destructive" onClick={() => void removeCompany(company)}>
                            <Trash2 className="size-4" />
                            Delete Company
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <div className="col-span-3 col-start-1 flex flex-wrap items-center gap-x-4 gap-y-1 pl-11 text-sm md:contents">
                      <span className="md:block">
                        <span className="text-xs text-muted-foreground md:hidden">Contact: </span>
                        {company.contactNo}
                      </span>
                      <span className="md:block">
                        <span className="text-xs text-muted-foreground md:hidden">Commission: </span>
                        {company.defaultCommissionRate == null ? (
                          <span className="text-muted-foreground">Not set</span>
                        ) : (
                          `${company.defaultCommissionRate}%`
                        )}
                      </span>
                      <span className="md:block">
                        <span className="mr-1 text-xs text-muted-foreground md:hidden">Officers</span>
                        <Badge variant="secondary">{company.officers.length}</Badge>
                      </span>
                      <span className="md:block">
                        <span className="mr-1 text-xs text-muted-foreground md:hidden">Offices</span>
                        <Badge variant="secondary">{company.offices.length}</Badge>
                      </span>
                    </div>
                  </div>

                  {isOpen && (
                    <div className="border-t bg-muted/20 p-3 md:pl-14" data-testid="company-offices-panel">
                      {company.offices.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          No offices added.{" "}
                          <button
                            type="button"
                            className="font-medium text-primary hover:underline"
                            onClick={() => setOfficeCompanyId(company.id)}
                          >
                            Add office
                          </button>
                        </p>
                      ) : (
                        <div className="space-y-2">
                          <div className="hidden grid-cols-[minmax(0,1.2fr)_minmax(0,1.6fr)_minmax(0,1fr)_5rem] gap-3 text-xs font-medium text-muted-foreground sm:grid">
                            <span>Office</span>
                            <span>Address</span>
                            <span>Phone</span>
                            <span>Status</span>
                          </div>
                          {company.offices.map((office) => (
                            <div
                              key={office.id}
                              className={`grid gap-x-3 gap-y-0.5 rounded-md border bg-background p-2 text-sm sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1.6fr)_minmax(0,1fr)_5rem] sm:items-center ${
                                office.isActive ? "" : "opacity-55"
                              }`}
                              data-testid="office-row"
                            >
                              <span className="font-medium">{office.name}</span>
                              <span className="break-words text-muted-foreground">{office.address || "—"}</span>
                              <span>{office.phone || "—"}</span>
                              <span>
                                <Badge variant={office.isActive ? "default" : "secondary"}>
                                  {office.isActive ? "Active" : "Inactive"}
                                </Badge>
                              </span>
                            </div>
                          ))}
                          <button
                            type="button"
                            className="text-xs font-medium text-primary hover:underline"
                            onClick={() => setOfficeCompanyId(company.id)}
                          >
                            Manage offices
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
            {companies.length === 0 && (
              <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                No companies added yet.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
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
              <Label htmlFor={`${companyType}-company-address`}>Head office address (optional)</Label>
              <Input
                id={`${companyType}-company-address`}
                value={formValues.headOfficeAddress}
                onChange={(event) => setFormValues((current) => ({ ...current, headOfficeAddress: event.target.value }))}
                maxLength={300}
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
            {editingCompany ? (
              <p className="flex items-center justify-between gap-3 rounded-lg border bg-muted/30 p-3 text-sm">
                <span>
                  {editingCompany.offices.length} {editingCompany.offices.length === 1 ? "office" : "offices"} on record.
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => {
                    setDialogOpen(false)
                    setOfficeCompanyId(editingCompany.id)
                  }}
                >
                  <MapPin className="size-3.5" />
                  Manage offices
                </Button>
              </p>
            ) : (
              <OfficeRowsEditor rows={officeRows} onChange={setOfficeRows} idPrefix={companyType} />
            )}
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

      <CompanyOfficesDialog
        kind={kind}
        company={officeCompany ? { id: officeCompany.id, name: officeCompany.name, offices: officeCompany.offices } : null}
        onClose={() => setOfficeCompanyId(null)}
      />

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
