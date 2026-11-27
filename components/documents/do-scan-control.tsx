"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Download, ExternalLink, FileUp, LoaderCircle, Paperclip, Trash2 } from "lucide-react"
import { attachDoScan, getDoScanUrl, prepareDoScanUpload, removeDoScan } from "@/app/actions/documents"
import { Button } from "@/components/ui/button"
import { compressImage, uploadToTarget } from "@/lib/client-upload"
import { validateUpload } from "@/lib/upload-rules"

/**
 * Scan of the Delivery Order (image or PDF, up to 10 MB). It is stored in a PRIVATE bucket: it can only be opened through a
 * short-lived link the server creates after its permission and branch checks. Upload, replace and remove are audited.
 */
export function DoScanControl({ saleId, scanName, canManage }: { saleId: string; scanName: string | null; canManage: boolean }) {
  const router = useRouter()
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [busy, setBusy] = React.useState<"upload" | "open" | "remove" | null>(null)

  async function upload(original: File) {
    setBusy("upload")
    const toastId = toast.loading("Uploading scan...")
    try {
      const file = await compressImage(original)
      const problem = validateUpload("do-scan", { mimeType: file.type, size: file.size })
      if (problem) throw new Error(problem)
      const target = await prepareDoScanUpload({ saleId, mimeType: file.type, size: file.size })
      if (!target.success) throw new Error(target.error)
      await uploadToTarget(target, file)
      const done = await attachDoScan({ saleId, path: target.path, fileName: original.name })
      if (!done.success) throw new Error(done.error)
      toast.success(done.message ?? "Scan saved.", { id: toastId })
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The upload failed.", { id: toastId })
    } finally {
      setBusy(null)
      if (inputRef.current) inputRef.current.value = ""
    }
  }

  async function open(download: boolean) {
    setBusy("open")
    const result = await getDoScanUrl(saleId)
    setBusy(null)
    if (!result.success) return toast.error(result.error)
    window.open(download ? result.downloadUrl : result.viewUrl, "_blank", "noopener,noreferrer")
  }

  async function remove() {
    if (!window.confirm("Remove the scan of this Delivery Order?")) return
    setBusy("remove")
    const result = await removeDoScan({ saleId })
    setBusy(null)
    if (result.success) {
      toast.success(result.message ?? "Scan removed.")
      router.refresh()
    } else {
      toast.error(result.error)
    }
  }

  if (!scanName && !canManage) return null

  return (
    <div className="flex flex-wrap items-center gap-1.5 text-xs" data-testid="do-scan">
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,image/avif,application/pdf"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) void upload(file)
        }}
      />
      {scanName ? (
        <>
          <span className="inline-flex max-w-[180px] items-center gap-1 truncate text-muted-foreground" title={scanName}>
            <Paperclip className="size-3 shrink-0" /> {scanName}
          </span>
          <Button type="button" size="sm" variant="outline" className="h-7 text-xs" disabled={busy !== null} onClick={() => open(false)} data-testid="view-scan">
            {busy === "open" ? <LoaderCircle className="size-3 animate-spin" /> : <ExternalLink className="size-3" />} View
          </Button>
          <Button type="button" size="sm" variant="ghost" className="h-7 text-xs" disabled={busy !== null} onClick={() => open(true)} aria-label="Download scan">
            <Download className="size-3" />
          </Button>
          {canManage && (
            <>
              <Button type="button" size="sm" variant="ghost" className="h-7 text-xs" disabled={busy !== null} onClick={() => inputRef.current?.click()} data-testid="replace-scan">
                {busy === "upload" ? <LoaderCircle className="size-3 animate-spin" /> : <FileUp className="size-3" />} Replace
              </Button>
              <Button type="button" size="sm" variant="ghost" className="h-7 text-xs text-destructive" disabled={busy !== null} onClick={remove} aria-label="Remove scan">
                <Trash2 className="size-3" />
              </Button>
            </>
          )}
        </>
      ) : (
        <Button type="button" size="sm" variant="outline" className="h-7 text-xs" disabled={busy !== null} onClick={() => inputRef.current?.click()} data-testid="upload-scan">
          {busy === "upload" ? <LoaderCircle className="size-3 animate-spin" /> : <FileUp className="size-3" />} Upload DO scan
        </Button>
      )}
    </div>
  )
}
