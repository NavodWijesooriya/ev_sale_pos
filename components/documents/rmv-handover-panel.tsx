"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Car, FileText, LoaderCircle, Printer } from "lucide-react"
import { handOverRmvDocument, recordRmvReceived, undoRmvHandover } from "@/app/actions/documents"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type { HandoverTarget } from "@/lib/documents"
import type { RmvDocumentsInfo } from "@/lib/rmv-info"

const today = () => new Date().toLocaleDateString("en-CA")
type Doc = "CR" | "PLATE"
type Dialogs = { kind: "received" | "handover"; doc: Doc } | null

const selectClass =
  "h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"

/** Received-from-RMV and hand-over tracking for one sale's registration certificate (CR) and number plate. */
export function RmvHandoverPanel({ saleId, info, canManage }: { saleId: string; info: RmvDocumentsInfo; canManage: boolean }) {
  const router = useRouter()
  const [dialog, setDialog] = React.useState<Dialogs>(null)
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [date, setDate] = React.useState(today())
  const [regNo, setRegNo] = React.useState("")
  const [target, setTarget] = React.useState<HandoverTarget>("CUSTOMER")
  const [toName, setToName] = React.useState("")
  const [toNic, setToNic] = React.useState("")
  const [reference, setReference] = React.useState("")
  const [notes, setNotes] = React.useState("")

  function open(kind: "received" | "handover", doc: Doc) {
    setError(null)
    setDate(today())
    setNotes("")
    setReference("")
    if (kind === "received") setRegNo(info.registrationNumber ?? "")
    if (kind === "handover") {
      // The certificate of a finance sale normally goes to the finance company (the absolute owner); otherwise to the
      // CURRENT registered owner, which is the new owner after an ownership transfer.
      const toFinance = doc === "CR" && info.isFinance
      setTarget(toFinance ? "FINANCE_COMPANY" : "CUSTOMER")
      setToName(toFinance ? (info.financeCompany ?? "") : info.currentOwner.name)
      setToNic(toFinance ? "" : (info.currentOwner.nic ?? ""))
    }
    setDialog({ kind, doc })
  }

  async function run(action: () => Promise<{ success: boolean; error?: string; message?: string }>) {
    setBusy(true)
    setError(null)
    const result = await action()
    setBusy(false)
    if (result.success) {
      toast.success(result.message ?? "Saved.")
      setDialog(null)
      router.refresh()
    } else {
      setError(result.error ?? "Something went wrong.")
    }
  }

  async function undo(doc: Doc) {
    if (!window.confirm(`Clear the ${doc === "CR" ? "registration certificate" : "number plate"} hand-over?`)) return
    await run(() => undoRmvHandover({ saleId, document: doc }))
  }

  const anyHandedOver = Boolean(info.crHandedOverAt || info.plateHandedOverAt)

  function renderRow(doc: Doc) {
    const isCr = doc === "CR"
    const received = isCr ? info.crReceived : info.plateReceived
    const receivedAt = isCr ? info.crReceivedAt : info.plateReceivedAt
    const handedAt = isCr ? info.crHandedOverAt : info.plateHandedOverAt
    const toWhom = isCr ? info.crHandedToName : info.plateHandedToName
    const Icon = isCr ? FileText : Car
    return (
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/60 bg-background/60 p-2.5" data-testid={isCr ? "rmv-cr" : "rmv-plate"}>
        <div className="flex min-w-0 items-start gap-2">
          <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <div className="min-w-0 text-xs">
            <p className="font-semibold">{isCr ? "Registration certificate (CR)" : "Number plate"}</p>
            {!received && <p className="text-muted-foreground">Pending at RMV</p>}
            {received && (
              <p className="text-muted-foreground">
                Received {receivedAt ?? "(date not recorded)"}
                {isCr && info.registrationNumber ? ` · ${info.registrationNumber}` : ""}
              </p>
            )}
            {handedAt && (
              <p className="text-emerald-600 dark:text-emerald-400">
                Handed over {handedAt}
                {isCr && info.crHandoverTarget === "FINANCE_COMPANY" ? " to the finance company" : ""}
                {toWhom ? `: ${toWhom}` : ""}
                {isCr && info.crHandedToNic ? ` (${info.crHandedToNic})` : ""}
                {isCr && info.crHandoverReference ? ` · ref ${info.crHandoverReference}` : ""}
              </p>
            )}
          </div>
        </div>
        {canManage && (
          <div className="flex flex-wrap gap-1.5">
            {!received && (
              <Button type="button" size="sm" variant="outline" className="h-7 text-xs" onClick={() => open("received", doc)} data-testid={`received-${doc}`}>
                Record received
              </Button>
            )}
            {received && !handedAt && (
              <Button type="button" size="sm" className="h-7 text-xs" onClick={() => open("handover", doc)} data-testid={`handover-${doc}`}>
                Hand over
              </Button>
            )}
            {handedAt && (
              <Button type="button" size="sm" variant="ghost" className="h-7 text-xs" onClick={() => undo(doc)}>
                Undo
              </Button>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-2" data-testid="rmv-handover-panel">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Received from RMV and handed over</p>
        <div className="flex items-center gap-2">
          {info.waitingDays > 0 && info.stage === "RECEIVED_NOT_HANDED" && (
            <Badge variant={info.waitingDays >= 14 ? "destructive" : "outline"} className="font-mono" data-testid="rmv-waiting">
              waiting {info.waitingDays}d
            </Badge>
          )}
          {anyHandedOver && (
            <Link href={`/dashboard/documents/rmv/${saleId}/slip`} className="inline-flex h-7 items-center gap-1 rounded-md border px-2 text-xs font-medium hover:bg-muted" data-testid="rmv-slip-link">
              <Printer className="size-3" /> Hand-over slip
            </Link>
          )}
        </div>
      </div>
      {renderRow("CR")}
      {renderRow("PLATE")}

      <Dialog open={dialog !== null} onOpenChange={(next) => !busy && !next && setDialog(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
          {dialog?.kind === "received" && (
            <>
              <DialogHeader>
                <DialogTitle>{dialog.doc === "CR" ? "Registration certificate received" : "Number plate received"}</DialogTitle>
                <DialogDescription>Came back from RMV. The documents must already be submitted to RMV on the DMT tracker.</DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="rmv-received-date">Date received</Label>
                  <Input id="rmv-received-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="rmv-reg-no">Registration number</Label>
                  <Input id="rmv-reg-no" value={regNo} onChange={(e) => setRegNo(e.target.value)} placeholder="e.g. WP BHE-1234" />
                </div>
                {error && <p role="alert" data-testid="documents-error" className="rounded-md border border-red-500/30 bg-red-500/10 p-2 text-sm text-red-600">{error}</p>}
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" disabled={busy} onClick={() => setDialog(null)}>Cancel</Button>
                <Button
                  type="button"
                  disabled={busy}
                  data-testid="confirm-received"
                  onClick={() => run(() => recordRmvReceived({ saleId, document: dialog.doc, receivedAt: date, registrationNumber: regNo }))}
                >
                  {busy && <LoaderCircle className="size-4 animate-spin" />} Save
                </Button>
              </DialogFooter>
            </>
          )}

          {dialog?.kind === "handover" && (
            <>
              <DialogHeader>
                <DialogTitle>{dialog.doc === "CR" ? "Hand over the registration certificate" : "Hand over the number plate"}</DialogTitle>
                <DialogDescription>
                  {dialog.doc === "CR" && info.isFinance
                    ? `Finance sale: the certificate normally goes to ${info.financeCompany ?? "the finance company"} (the absolute owner).`
                    : `Current registered owner: ${info.currentOwner.name}.`}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                {dialog.doc === "CR" && info.isFinance && (
                  <div className="space-y-1.5">
                    <Label htmlFor="handover-target">Hand over to</Label>
                    <select
                      id="handover-target"
                      className={selectClass}
                      value={target}
                      onChange={(e) => {
                        const next = e.target.value as HandoverTarget
                        setTarget(next)
                        setToName(next === "FINANCE_COMPANY" ? (info.financeCompany ?? "") : info.currentOwner.name)
                        setToNic(next === "FINANCE_COMPANY" ? "" : (info.currentOwner.nic ?? ""))
                      }}
                    >
                      <option value="FINANCE_COMPANY">Finance company</option>
                      <option value="CUSTOMER">Customer (owner)</option>
                    </select>
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label htmlFor="handover-date">{target === "FINANCE_COMPANY" ? "Date sent" : "Date handed over"}</Label>
                  <Input id="handover-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="handover-name">{target === "FINANCE_COMPANY" ? "Received by / company" : "Received by (name)"}</Label>
                  <Input id="handover-name" value={toName} onChange={(e) => setToName(e.target.value)} />
                </div>
                {dialog.doc === "CR" && (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="handover-nic">NIC (optional)</Label>
                      <Input id="handover-nic" value={toNic} onChange={(e) => setToNic(e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="handover-ref">Reference (optional)</Label>
                      <Input id="handover-ref" value={reference} onChange={(e) => setReference(e.target.value)} />
                    </div>
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label htmlFor="handover-notes">Notes (optional)</Label>
                  <Textarea id="handover-notes" rows={2} maxLength={500} value={notes} onChange={(e) => setNotes(e.target.value)} />
                </div>
                {error && <p role="alert" data-testid="documents-error" className="rounded-md border border-red-500/30 bg-red-500/10 p-2 text-sm text-red-600">{error}</p>}
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" disabled={busy} onClick={() => setDialog(null)}>Cancel</Button>
                <Button
                  type="button"
                  disabled={busy}
                  data-testid="confirm-handover"
                  onClick={() =>
                    run(() =>
                      handOverRmvDocument({
                        saleId,
                        document: dialog.doc,
                        handedOverAt: date,
                        target: dialog.doc === "CR" ? target : undefined,
                        toName,
                        toNic,
                        reference,
                        notes,
                      }),
                    )
                  }
                >
                  {busy && <LoaderCircle className="size-4 animate-spin" />} Record hand-over
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
