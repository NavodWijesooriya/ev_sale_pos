"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { CompensationRates, RateType } from "@/lib/staff-pay"

/** Text values of the pay form (kept as text while typing). */
export interface PayFormState {
  basicSalary: string
  saleCommissionType: RateType
  saleCommissionValue: string
  financeCommissionType: RateType
  financeCommissionValue: string
}

export const EMPTY_PAY_FORM: PayFormState = {
  basicSalary: "",
  saleCommissionType: "FIXED",
  saleCommissionValue: "",
  financeCommissionType: "FIXED",
  financeCommissionValue: "",
}

export function payFormFrom(rates: CompensationRates | null): PayFormState {
  if (!rates) return EMPTY_PAY_FORM
  const text = (n: number) => (n > 0 ? String(n) : "")
  return {
    basicSalary: text(rates.basicSalary),
    saleCommissionType: rates.saleCommissionType,
    saleCommissionValue: text(rates.saleCommissionValue),
    financeCommissionType: rates.financeCommissionType,
    financeCommissionValue: text(rates.financeCommissionValue),
  }
}

/** Empty means 0; anything that is not a number stays NaN so the server rejects it. */
const num = (text: string) => (text.trim() === "" ? 0 : Number(text))

export function payFormToRates(form: PayFormState): CompensationRates {
  return {
    basicSalary: num(form.basicSalary),
    saleCommissionType: form.saleCommissionType,
    saleCommissionValue: num(form.saleCommissionValue),
    financeCommissionType: form.financeCommissionType,
    financeCommissionValue: num(form.financeCommissionValue),
  }
}

const TYPE_LABELS: Record<RateType, string> = { FIXED: "Fixed (Rs.)", PERCENT: "Percent (%)" }

function RateRow({
  idPrefix,
  title,
  hint,
  type,
  value,
  onType,
  onValue,
  disabled,
}: {
  idPrefix: string
  title: string
  hint: Record<RateType, string>
  type: RateType
  value: string
  onType: (type: RateType) => void
  onValue: (value: string) => void
  disabled?: boolean
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={`${idPrefix}-value`}>{title}</Label>
      <div className="grid grid-cols-[9.5rem_1fr] gap-2">
        <Select value={type} onValueChange={(next) => next && onType(next as RateType)} disabled={disabled}>
          <SelectTrigger id={`${idPrefix}-type`} aria-label={`${title} type`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(TYPE_LABELS) as RateType[]).map((key) => (
              <SelectItem key={key} value={key} label={TYPE_LABELS[key]}>
                {TYPE_LABELS[key]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          id={`${idPrefix}-value`}
          type="number"
          inputMode="decimal"
          min={0}
          step="any"
          placeholder="0"
          value={value}
          onChange={(event) => onValue(event.target.value)}
          disabled={disabled}
        />
      </div>
      <p className="text-xs text-muted-foreground">{hint[type]}</p>
    </div>
  )
}

/** Salary and commission inputs, shared by Add Staff and the staff profile. Owner-only screens only. */
export function PayFields({
  idPrefix,
  form,
  onChange,
  disabled,
}: {
  idPrefix: string
  form: PayFormState
  onChange: (next: PayFormState) => void
  disabled?: boolean
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-salary`}>Basic salary (LKR per month)</Label>
        <Input
          id={`${idPrefix}-salary`}
          type="number"
          inputMode="decimal"
          min={0}
          step="any"
          placeholder="0"
          value={form.basicSalary}
          onChange={(event) => onChange({ ...form, basicSalary: event.target.value })}
          disabled={disabled}
        />
      </div>
      <RateRow
        idPrefix={`${idPrefix}-sale`}
        title="Staff sale commission"
        hint={{ FIXED: "Rs. earned on every bike this person sells.", PERCENT: "% of the bike price on every sale." }}
        type={form.saleCommissionType}
        value={form.saleCommissionValue}
        onType={(saleCommissionType) => onChange({ ...form, saleCommissionType })}
        onValue={(saleCommissionValue) => onChange({ ...form, saleCommissionValue })}
        disabled={disabled}
      />
      <RateRow
        idPrefix={`${idPrefix}-finance`}
        title="Staff finance commission"
        hint={{
          FIXED: "Extra Rs. earned on every finance (leasing) sale.",
          PERCENT: "Extra % of the finance amount on every finance sale.",
        }}
        type={form.financeCommissionType}
        value={form.financeCommissionValue}
        onType={(financeCommissionType) => onChange({ ...form, financeCommissionType })}
        onValue={(financeCommissionValue) => onChange({ ...form, financeCommissionValue })}
        disabled={disabled}
      />
    </div>
  )
}
