"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowRightLeft, LoaderCircle, TriangleAlert } from "lucide-react"
import { toast } from "sonner"
import {
  getTransferContext,
  searchTransferCustomers,
  transferVehicleOwnership,
  type TransferContext,
  type TransferCustomerOption,
} from "@/app/actions/ownership-transfer"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { colomboDateKey } from "@/lib/dates"

interface TransferOwnershipDialogProps {
  /** Bikes that can be transferred. One entry starts straight on it; several show a picker. */
  vehicles: Array<{ id: string; label: string }>
  buttonLabel?: string
  buttonVariant?: "default" | "outline"
}

export function TransferOwnershipDialog({ vehicles, buttonLabel = "Transfer ownership", buttonVariant = "outline" }: TransferOwnershipDialogProps) {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [vehicleId, setVehicleId] = React.useState(vehicles.length === 1 ? vehicles[0].id : "")
  const [context, setContext] = React.useState<TransferContext | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [busy, setBusy] = React.useState(false)
  const [done, setDone] = React.useState<{ transferId: string; slipNumber: string } | null>(null)

  const [mode, setMode] = React.useState<"search" | "new">("search")
  const [query, setQuery] = React.useState("")
  const [matches, setMatches] = React.useState<TransferCustomerOption[]>([])
  const [chosen, setChosen] = React.useState<TransferCustomerOption | null>(null)
  const [newName, setNewName] = React.useState("")
  const [newPhone, setNewPhone] = React.useState("")
  const [newNic, setNewNic] = React.useState("")
  const [newAddress, setNewAddress] = React.useState("")

  const [date, setDate] = React.useState(colomboDateKey(new Date()))
  const [fee, setFee] = React.useState("0")
  const [reason, setReason] = React.useState("")
  const [docForm, setDocForm] = React.useState(false)
  const [docNic, setDocNic] = React.useState(false)
  const [docBook, setDocBook] = React.useState(false)
  const [moveDmt, setMoveDmt] = React.useState(false)
  const [financeOk, setFinanceOk] = React.useState(false)
  const searchId = React.useRef(0)

  function reset() {
    setVehicleId(vehicles.length === 1 ? vehicles[0].id : "")
    setContext(null)
    setError(null)
    setDone(null)
    setMode("search")
    setQuery("")
    setMatches([])
    setChosen(null)
    setNewName("")
    setNewPhone("")
    setNewNic("")
    setNewAddress("")
    setDate(colomboDateKey(new Date()))
    setFee("0")
    setReason("")
    setDocForm(false)
    setDocNic(false)
    setDocBook(false)
    setMoveDmt(false)
    setFinanceOk(false)
  }

  const contextRequest = React.useRef(0)

  // Load what we need to know about the chosen bike (current owner, finance sale, open registration).
  async function loadContext(id: string) {
    const request = ++contextRequest.current
    setVehicleId(id)
    setContext(null)
    setError(null)
    if (!id) return
    setLoading(true)
    const result = await getTransferContext(id)
    if (request !== contextRequest.current) return
    setLoading(false)
    if (result.success) setContext(result.data)
    else setError(result.error)
  }

  function openDialog() {
    reset()
    setOpen(true)
    if (vehicles.length === 1) void loadContext(vehicles[0].id)
  }

  async function runSearch(value: string) {
    setQuery(value)
    setChosen(null)
    const id = ++searchId.current
    if (value.trim().length < 3) {
      setMatches([])
      return
    }
    const found = await searchTransferCustomers(value)
    if (id === searchId.current) setMatches(found.filter((customer) => customer.id !== context?.currentOwner.id))
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!context) return
    setBusy(true)
    setError(null)
    try {
      const result = await transferVehicleOwnership({
        vehicleId: context.vehicleId,
        newCustomerId: mode === "search" ? (chosen?.id ?? "") : "",
        newCustomer: mode === "new" ? { name: newName, phone: newPhone, nic: newNic, address: newAddress } : undefined,
        transferDate: date,
        reason,
        transferFee: fee.trim() === "" ? 0 : Number(fee),
        docTransferForm: docForm,
        docNicCopies: docNic,
        docRegistrationBook: docBook,
        updateDmtOwner: context.dmtOpen && moveDmt,
        financeWarningConfirmed: financeOk,
      })
      if (!result.success) {
        // Stay open: the message (duplicate NIC, finance warning...) shows inside the dialog.
        setError(result.error)
        return
      }
      toast.success(`Ownership transferred. Slip ${result.slipNumber}.`)
      setDone({ transferId: result.transferId, slipNumber: result.slipNumber })
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  const canSubmit =
    Boolean(context) &&
    (mode === "search" ? Boolean(chosen) : newName.trim() !== "" && newPhone.trim() !== "") &&
    (!context?.isFinanceSale || financeOk)

  return (
    <>
      <Button type="button" variant={buttonVariant} className="gap-2" onClick={openDialog}>
        <ArrowRightLeft className="size-4" />
        {buttonLabel}
      </Button>
      <Dialog open={open} onOpenChange={(next) => !busy && setOpen(next)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Transfer ownership</DialogTitle>
            <DialogDescription>
              The bike changes owner. The original sale and its records stay exactly as they were.
            </DialogDescription>
          </DialogHeader>

          {done ? (
            <div className="space-y-4">
              <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm">
                Ownership transferred. Transfer slip <strong>{done.slipNumber}</strong> is ready.
              </p>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Close
                </Button>
                <Button render={<Link href={`/dashboard/bikes/transfers/${done.transferId}/slip`} />}>Open transfer slip</Button>
              </DialogFooter>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-5">
              {error && (
                <p role="alert" className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
                  {error}
                </p>
              )}

              {vehicles.length > 1 && (
                <div className="space-y-1.5">
                  <Label htmlFor="transfer-vehicle">Bike</Label>
                  <select
                    id="transfer-vehicle"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={vehicleId}
                    onChange={(event) => void loadContext(event.target.value)}
                  >
                    <option value="">Select a bike</option>
                    {vehicles.map((vehicle) => (
                      <option key={vehicle.id} value={vehicle.id}>
                        {vehicle.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {loading && <p className="text-sm text-muted-foreground">Loading the bike...</p>}

              {context && (
                <>
                  <div className="rounded-lg border bg-muted/30 p-3 text-sm">
                    <p className="font-medium">
                      {context.label} · <span className="font-mono">{context.chassisNumber}</span>
                    </p>
                    <p className="text-muted-foreground">
                      Current owner: <strong className="text-foreground">{context.currentOwner.name}</strong>
                      {context.currentOwner.nic ? ` (${context.currentOwner.nic})` : ""} · {context.currentOwner.phone}
                    </p>
                  </div>

                  {context.isFinanceSale && (
                    <div className="space-y-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm" data-testid="finance-warning">
                      <p className="flex items-start gap-2 font-medium text-amber-800 dark:text-amber-300">
                        <TriangleAlert className="mt-0.5 size-4 shrink-0" />
                        This bike was sold on finance{context.financeCompanyName ? ` (${context.financeCompanyName})` : ""}. The leasing company may
                        still hold ownership until the lease is settled.
                      </p>
                      <label className="flex items-center gap-2">
                        <Checkbox checked={financeOk} onCheckedChange={(checked) => setFinanceOk(Boolean(checked))} id="transfer-finance-ok" />
                        <span>I understand and want to continue with the transfer.</span>
                      </label>
                    </div>
                  )}

                  <section className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold">New owner</h3>
                      <div className="flex gap-1 rounded-md border p-0.5 text-xs">
                        <button
                          type="button"
                          className={`rounded px-2.5 py-1 ${mode === "search" ? "bg-primary text-primary-foreground" : ""}`}
                          onClick={() => setMode("search")}
                        >
                          Existing customer
                        </button>
                        <button
                          type="button"
                          className={`rounded px-2.5 py-1 ${mode === "new" ? "bg-primary text-primary-foreground" : ""}`}
                          onClick={() => setMode("new")}
                        >
                          New customer
                        </button>
                      </div>
                    </div>

                    {mode === "search" ? (
                      <div className="space-y-2">
                        <Label htmlFor="transfer-search">Search by NIC, phone or name</Label>
                        <Input
                          id="transfer-search"
                          autoComplete="off"
                          placeholder="Type at least 3 characters"
                          value={query}
                          onChange={(event) => void runSearch(event.target.value)}
                        />
                        {chosen ? (
                          <p className="rounded-md border bg-emerald-500/10 px-3 py-2 text-sm" data-testid="chosen-owner">
                            Selected: <strong>{chosen.name}</strong>
                            {chosen.nic ? ` (${chosen.nic})` : ""} · {chosen.phone}
                          </p>
                        ) : (
                          <div className="max-h-40 space-y-1 overflow-y-auto">
                            {matches.map((customer) => (
                              <button
                                key={customer.id}
                                type="button"
                                className="flex w-full flex-col rounded-md border px-3 py-2 text-left text-sm hover:bg-accent"
                                onClick={() => setChosen(customer)}
                              >
                                <span className="font-medium">{customer.name}</span>
                                <span className="text-xs text-muted-foreground">
                                  {customer.nic ?? "no NIC"} · {customer.phone}
                                </span>
                              </button>
                            ))}
                            {query.trim().length >= 3 && matches.length === 0 && (
                              <p className="text-xs text-muted-foreground">No customer found. Use New customer to add one.</p>
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-1.5">
                          <Label htmlFor="transfer-new-name">Full name *</Label>
                          <Input id="transfer-new-name" value={newName} maxLength={120} onChange={(e) => setNewName(e.target.value)} />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="transfer-new-phone">Phone *</Label>
                          <Input id="transfer-new-phone" value={newPhone} maxLength={32} onChange={(e) => setNewPhone(e.target.value)} />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="transfer-new-nic">NIC / Passport</Label>
                          <Input id="transfer-new-nic" value={newNic} maxLength={64} onChange={(e) => setNewNic(e.target.value)} />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="transfer-new-address">Address</Label>
                          <Input id="transfer-new-address" value={newAddress} maxLength={500} onChange={(e) => setNewAddress(e.target.value)} />
                        </div>
                      </div>
                    )}
                  </section>

                  <section className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="transfer-date">Transfer date</Label>
                      <Input id="transfer-date" type="date" value={date} min={context.saleDate} max={colomboDateKey(new Date())} onChange={(e) => setDate(e.target.value)} required />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="transfer-fee">Transfer fee (Rs., optional)</Label>
                      <Input id="transfer-fee" type="number" min={0} step="any" value={fee} onChange={(e) => setFee(e.target.value)} />
                    </div>
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label htmlFor="transfer-reason">Reason / notes</Label>
                      <Textarea id="transfer-reason" rows={2} maxLength={2000} value={reason} onChange={(e) => setReason(e.target.value)} />
                    </div>
                  </section>

                  <section className="space-y-2">
                    <h3 className="text-sm font-semibold">Documents received</h3>
                    {[
                      ["transfer-doc-form", "Transfer form signed", docForm, setDocForm],
                      ["transfer-doc-nic", "NIC copies of both parties", docNic, setDocNic],
                      ["transfer-doc-book", "Original registration document (if registered)", docBook, setDocBook],
                    ].map(([id, label, value, set]) => (
                      <label key={id as string} className="flex items-center gap-2 text-sm">
                        <Checkbox id={id as string} checked={value as boolean} onCheckedChange={(checked) => (set as (v: boolean) => void)(Boolean(checked))} />
                        <span>{label as string}</span>
                      </label>
                    ))}
                  </section>

                  {context.dmtOpen && (
                    <section className="rounded-lg border p-3 text-sm">
                      <label className="flex items-start gap-2">
                        <Checkbox id="transfer-move-dmt" checked={moveDmt} onCheckedChange={(checked) => setMoveDmt(Boolean(checked))} />
                        <span>
                          The DMT / RMV registration is not completed yet. <strong>Do the registration in the new owner&apos;s name.</strong>
                          <span className="block text-xs text-muted-foreground">
                            The registration record moves to the new owner; the previous owner is kept in the transfer history.
                          </span>
                        </span>
                      </label>
                    </section>
                  )}
                </>
              )}

              <DialogFooter>
                <Button type="button" variant="outline" disabled={busy} onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={busy || !canSubmit} className="gap-2">
                  {busy && <LoaderCircle className="size-4 animate-spin" />}
                  Transfer ownership
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
