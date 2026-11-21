"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { ArrowRightLeft, LoaderCircle, Search } from "lucide-react"
import { toast } from "sonner"
import {
  searchAdvanceBalancesByNic,
  transferAdvancePayment,
  type AdvanceTransferHistoryRow,
  type NicAdvanceMatch,
} from "@/app/actions/advances"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { colomboDateKey } from "@/lib/dates"
import { cn } from "@/lib/utils"

const money = (n: number) =>
  `Rs. ${new Intl.NumberFormat("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)}`

function useNicSearch() {
  const [term, setTerm] = React.useState("")
  const [results, setResults] = React.useState<NicAdvanceMatch[] | null>(null)
  const [loading, setLoading] = React.useState(false)
  // Answers can arrive out of order on a slow connection; only the newest search may update the screen.
  const latestRequest = React.useRef(0)

  async function run() {
    if (term.trim().length < 4) {
      toast.error("Enter at least 4 characters of the NIC.")
      return
    }
    const requestId = ++latestRequest.current
    setLoading(true)
    try {
      const found = await searchAdvanceBalancesByNic(term)
      if (requestId === latestRequest.current) setResults(found)
    } catch (error) {
      if (requestId === latestRequest.current) toast.error(error instanceof Error ? error.message : "Search failed.")
    } finally {
      if (requestId === latestRequest.current) setLoading(false)
    }
  }
  function reset() {
    latestRequest.current++ // forget any search still on its way
    setTerm("")
    setResults(null)
    setLoading(false)
  }
  /** Typing a new NIC drops the old answer, so results never sit beside a NIC they were not searched for. */
  function changeTerm(value: string) {
    latestRequest.current++
    setTerm(value)
    setResults(null)
    setLoading(false)
  }
  return { term, setTerm: changeTerm, results, loading, run, reset }
}

/** Search a customer by NIC, see their unallocated advance, and move part or all of it to another customer. */
export function AdvanceTransferByNic({ history }: { history: AdvanceTransferHistoryRow[] }) {
  const router = useRouter()
  const source = useNicSearch()
  const target = useNicSearch()
  const [advanceId, setAdvanceId] = React.useState("")
  const [targetId, setTargetId] = React.useState("")
  const [amount, setAmount] = React.useState("")
  const [note, setNote] = React.useState("")
  const [saving, setSaving] = React.useState(false)

  const selectedAdvance = source.results?.flatMap((c) => c.advances).find((a) => a.id === advanceId) ?? null
  const sourceCustomer = source.results?.find((c) => c.advances.some((a) => a.id === advanceId)) ?? null
  const targetCustomer = target.results?.find((c) => c.id === targetId) ?? null
  const amountNumber = Number(amount)
  const amountValid = selectedAdvance !== null && amountNumber > 0 && amountNumber <= selectedAdvance.amount + 0.005
  const canTransfer = Boolean(selectedAdvance && targetCustomer && targetCustomer.id !== sourceCustomer?.id && amountValid)

  function chooseAdvance(id: string, balance: number) {
    setAdvanceId(id)
    setAmount(String(balance))
  }

  async function transfer() {
    if (!selectedAdvance || !targetCustomer) return
    setSaving(true)
    try {
      const result = await transferAdvancePayment(selectedAdvance.id, {
        targetCustomerId: targetCustomer.id,
        transferNote: note,
        transferAmount: amountNumber,
        // What was typed in the two NIC searches: the server checks each against the customer found.
        sourceNic: source.term,
        targetNic: target.term,
      })
      if (!result.success) {
        toast.error(result.error)
        return
      }
      toast.success(
        `Transferred ${money(result.transferred)} to ${targetCustomer.name}. ${money(result.remaining)} left on the source advance.`,
      )
      setAdvanceId("")
      setTargetId("")
      setAmount("")
      setNote("")
      // Clear the results: the balances shown are stale after a transfer.
      source.reset()
      target.reset()
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Transfer failed.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowRightLeft className="size-4 text-primary" /> Transfer by NIC
          </CardTitle>
          <CardDescription>
            Find the customer holding the advance, choose how much to move, then find who receives it.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 lg:grid-cols-2">
          <section className="space-y-3">
            <h3 className="text-sm font-semibold">1. From (advance holder)</h3>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                void source.run()
              }}
              className="flex gap-2"
            >
              <Input
                value={source.term}
                onChange={(e) => source.setTerm(e.target.value)}
                placeholder="Source customer NIC"
                aria-label="Source customer NIC"
              />
              <Button type="submit" variant="outline" aria-busy={source.loading}>
                {source.loading ? <LoaderCircle className="size-4 animate-spin" /> : <Search className="size-4" />}
              </Button>
            </form>
            {source.results?.length === 0 && <p className="text-sm text-muted-foreground">No customer found with that NIC.</p>}
            {source.results?.map((customer) => (
              <div key={customer.id} className="space-y-2 rounded-lg border p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium">
                    {customer.name} <span className="font-mono text-xs text-muted-foreground">{customer.nic}</span>
                  </p>
                  <p className="text-sm font-semibold">{money(customer.availableBalance)} available</p>
                </div>
                {customer.advances.length === 0 && (
                  <p className="text-xs text-muted-foreground">No unallocated advance.</p>
                )}
                {customer.advances.map((advance) => (
                  <label
                    key={advance.id}
                    className={cn(
                      "flex cursor-pointer items-center gap-3 rounded-md border p-2 text-sm",
                      advance.id === advanceId && "border-primary bg-primary/5",
                    )}
                  >
                    <input
                      type="radio"
                      name="source-advance"
                      className="accent-[var(--primary)]"
                      checked={advance.id === advanceId}
                      onChange={() => chooseAdvance(advance.id, advance.amount)}
                    />
                    <span className="flex-1">
                      {money(advance.amount)} · {advance.bikeModel}
                    </span>
                    <span className="text-xs text-muted-foreground">{colomboDateKey(new Date(advance.advanceDate))}</span>
                  </label>
                ))}
              </div>
            ))}
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-semibold">2. To (receiving customer)</h3>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                void target.run()
              }}
              className="flex gap-2"
            >
              <Input
                value={target.term}
                onChange={(e) => target.setTerm(e.target.value)}
                placeholder="Receiving customer NIC"
                aria-label="Receiving customer NIC"
              />
              <Button type="submit" variant="outline" aria-busy={target.loading}>
                {target.loading ? <LoaderCircle className="size-4 animate-spin" /> : <Search className="size-4" />}
              </Button>
            </form>
            {target.results?.length === 0 && <p className="text-sm text-muted-foreground">No customer found with that NIC.</p>}
            {target.results?.map((customer) => (
              <label
                key={customer.id}
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-lg border p-3 text-sm",
                  customer.id === targetId && "border-primary bg-primary/5",
                  customer.id === sourceCustomer?.id && "opacity-50",
                )}
              >
                <input
                  type="radio"
                  name="target-customer"
                  className="accent-[var(--primary)]"
                  disabled={customer.id === sourceCustomer?.id}
                  checked={customer.id === targetId}
                  onChange={() => setTargetId(customer.id)}
                />
                <span className="flex-1">
                  {customer.name} <span className="font-mono text-xs text-muted-foreground">{customer.nic}</span>
                </span>
                <span className="text-xs text-muted-foreground">holds {money(customer.availableBalance)}</span>
              </label>
            ))}

            <div className="space-y-2 pt-2">
              <Label htmlFor="transfer-amount">3. Amount to transfer (Rs.)</Label>
              <Input
                id="transfer-amount"
                type="number"
                min="0"
                step="0.01"
                value={amount}
                disabled={!selectedAdvance}
                onChange={(e) => setAmount(e.target.value)}
              />
              {selectedAdvance && (
                <p className={cn("text-xs", amountValid || !amount ? "text-muted-foreground" : "text-destructive")}>
                  Up to {money(selectedAdvance.amount)}. Remaining after transfer:{" "}
                  {money(Math.max(0, selectedAdvance.amount - (Number.isFinite(amountNumber) ? amountNumber : 0)))}
                </p>
              )}
              <Label htmlFor="transfer-note">Note (optional)</Label>
              <Input id="transfer-note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} />
              <Button type="button" onClick={transfer} disabled={!canTransfer || saving}>
                {saving && <LoaderCircle className="size-4 animate-spin" />} Transfer advance
              </Button>
            </div>
          </section>
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>Transfer history</CardTitle>
          <CardDescription>Every transfer, newest first. Records can&apos;t be edited or deleted.</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>From</TableHead>
                <TableHead>To</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>By</TableHead>
                <TableHead>Note</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                    No transfers yet.
                  </TableCell>
                </TableRow>
              )}
              {history.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{colomboDateKey(new Date(row.transferDate))}</TableCell>
                  <TableCell>
                    {row.fromCustomer} <span className="font-mono text-xs text-muted-foreground">{row.fromNic}</span>
                  </TableCell>
                  <TableCell>
                    {row.toCustomer} <span className="font-mono text-xs text-muted-foreground">{row.toNic ?? ""}</span>
                  </TableCell>
                  <TableCell className="text-right">{money(row.amount)}</TableCell>
                  <TableCell>{row.transferredBy ?? "-"}</TableCell>
                  <TableCell className="max-w-56 truncate" title={row.note ?? ""}>
                    {row.note ?? "-"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
