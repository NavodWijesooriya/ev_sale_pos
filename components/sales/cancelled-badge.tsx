import { Ban } from "lucide-react"
import { cancelTypeLabel } from "@/lib/sale-status"

/** Red CANCELLED badge shown next to a cancelled sale. `title` explains why on hover. */
export function CancelledBadge({ type, reason, className = "" }: { type?: string | null; reason?: string | null; className?: string }) {
  return (
    <span
      data-testid="cancelled-badge"
      title={[cancelTypeLabel(type), reason].filter(Boolean).join(": ")}
      className={`inline-flex w-fit items-center gap-1 rounded-full border border-red-500/40 bg-red-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-red-600 dark:text-red-400 ${className}`}
    >
      <Ban className="size-3" />
      Cancelled
    </span>
  )
}

/** Checkbox that shows or hides cancelled sales in a history table. */
export function ShowCancelledToggle({ checked, onChange, count }: { checked: boolean; onChange: (value: boolean) => void; count: number }) {
  if (count === 0) return null
  return (
    <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
      <input
        type="checkbox"
        data-testid="show-cancelled"
        className="size-4 accent-red-600"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      Show cancelled sales ({count})
    </label>
  )
}
