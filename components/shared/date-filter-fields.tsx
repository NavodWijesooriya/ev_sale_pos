"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { dateFilterError, emptyDateFilter, isDateFilterActive, type DateFilter } from "@/lib/date-filter"

interface DateFilterFieldsProps {
  value: DateFilter
  onChange: (value: DateFilter) => void
  /** Prefix for the input ids, so two filters can share a page. */
  idPrefix?: string
}

/** One day, or a From-To range. Picking a single date clears the range and the other way round. */
export function DateFilterFields({ value, onChange, idPrefix = "date-filter" }: DateFilterFieldsProps) {
  const error = dateFilterError(value)
  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="space-y-1">
        <Label htmlFor={`${idPrefix}-date`} className="text-xs">Date</Label>
        <Input
          id={`${idPrefix}-date`}
          type="date"
          className="w-40"
          value={value.date}
          onChange={(event) => onChange({ date: event.target.value, from: "", to: "" })}
        />
      </div>
      <span className="pb-2 text-xs text-muted-foreground">or</span>
      <div className="space-y-1">
        <Label htmlFor={`${idPrefix}-from`} className="text-xs">From</Label>
        <Input
          id={`${idPrefix}-from`}
          type="date"
          className="w-40"
          value={value.from}
          max={value.to || undefined}
          onChange={(event) => onChange({ date: "", from: event.target.value, to: value.to })}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor={`${idPrefix}-to`} className="text-xs">To</Label>
        <Input
          id={`${idPrefix}-to`}
          type="date"
          className="w-40"
          value={value.to}
          min={value.from || undefined}
          onChange={(event) => onChange({ date: "", from: value.from, to: event.target.value })}
        />
      </div>
      {isDateFilterActive(value) && (
        <Button type="button" variant="ghost" size="sm" onClick={() => onChange(emptyDateFilter)}>
          Clear dates
        </Button>
      )}
      {error && (
        <p role="alert" className="basis-full text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}
