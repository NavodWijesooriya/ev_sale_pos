"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { UploadCloud, Image as ImageIcon, X, Loader2, CheckCircle2 } from "lucide-react"
import { toast } from "sonner"
import { finalizeImageUpload, prepareImageUpload } from "@/app/actions/storage"
import { compressImage, uploadToTarget } from "@/lib/client-upload"
import { validateUpload, type PublicMediaType } from "@/lib/upload-rules"

interface ImageUploaderProps {
  /** What the image is for (becomes part of the storage path). */
  type: PublicMediaType
  /** The record the image belongs to, when it already exists (otherwise a fresh id is used). */
  recordId?: string
  value: string | null | undefined
  onChange: (url: string) => void
  label?: string
  helperText?: string
  className?: string
}

export function ImageUploader({
  type,
  recordId,
  value,
  onChange,
  label = "EV Bike Photo / Image",
  helperText = "Upload a photo from your device (PNG, JPG, WebP up to 10MB). Large photos are shrunk automatically.",
  className = "",
}: ImageUploaderProps) {
  const [isUploading, setIsUploading] = React.useState(false)
  const [dragOver, setDragOver] = React.useState(false)
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const [fallbackRecordId] = React.useState(() => crypto.randomUUID())

  const handleUploadFile = async (file: File) => {
    const typeProblem = validateUpload("public-image", { mimeType: file.type, size: file.size })
    if (typeProblem && !file.type.startsWith("image/")) {
      toast.error(typeProblem)
      return
    }

    setIsUploading(true)
    const toastId = toast.loading("Uploading image...")

    try {
      // Large photos are shrunk to 1600px wide first; the file then goes straight to storage with a one-time token.
      const prepared = await compressImage(file)
      const problem = validateUpload("public-image", { mimeType: prepared.type, size: prepared.size })
      if (problem) throw new Error(problem)

      const target = await prepareImageUpload({ type, recordId: recordId ?? fallbackRecordId, mimeType: prepared.type, size: prepared.size })
      if (!target.success) throw new Error(target.error)
      await uploadToTarget(target, prepared)
      const saved = await finalizeImageUpload({ path: target.path, type })
      if (!saved.success) throw new Error(saved.error)

      onChange(saved.url)
      toast.success("Image uploaded successfully!", { id: toastId })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to upload image. Please try again.", { id: toastId })
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleUploadFile(file)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) {
      handleUploadFile(file)
    }
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {label && (
        <Label className="text-xs font-medium flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <ImageIcon className="size-3.5 text-primary" />
            {label}
          </span>
          {value && (
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-normal flex items-center gap-1">
              <CheckCircle2 className="size-3" />
              Attached
            </span>
          )}
        </Label>
      )}

      {/* Hidden native input with accept="image/*" - on mobile triggers Camera / Gallery */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {value ? (
        <div className="relative rounded-xl border border-border/80 overflow-hidden bg-muted/20 group">
          <div className="relative h-44 sm:h-52 w-full bg-slate-950 flex items-center justify-center overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={value}
              alt="EV Preview"
              className="w-full h-full object-cover object-center group-hover:scale-102 transition-transform duration-300"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-between p-3">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="text-xs h-7 bg-white/90 text-slate-900 hover:bg-white"
              >
                {isUploading ? (
                  <Loader2 className="size-3 animate-spin mr-1" />
                ) : (
                  <UploadCloud className="size-3 mr-1" />
                )}
                Change Photo
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => onChange("")}
                disabled={isUploading}
                className="text-xs h-7"
              >
                <X className="size-3 mr-1" />
                Remove
              </Button>
            </div>
          </div>
          <div className="p-2.5 bg-background/95 border-t flex items-center justify-between text-xs">
            <span className="text-muted-foreground truncate max-w-[200px] sm:max-w-xs font-mono text-[11px]">
              {value.startsWith("data:") ? "Local Image Data" : value}
            </span>
            <div className="flex items-center gap-1.5 shrink-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="h-7 text-xs px-2"
              >
                Replace
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onChange("")}
                className="h-7 text-xs px-2 text-destructive hover:text-destructive"
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div
          onDragOver={(e) => {
            e.preventDefault()
            setDragOver(true)
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-5 sm:p-6 text-center cursor-pointer transition-all duration-200 ${
            dragOver
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/50 hover:bg-muted/40 bg-card/40"
          }`}
        >
          <div className="flex flex-col items-center justify-center space-y-2">
            <div className="size-11 rounded-full bg-primary/10 text-primary flex items-center justify-center shadow-xs">
              {isUploading ? (
                <Loader2 className="size-5 animate-spin" />
              ) : (
                <UploadCloud className="size-5" />
              )}
            </div>
            <div className="space-y-1">
              <p className="text-xs font-semibold text-foreground">
                {isUploading ? "Uploading file..." : "Click to select or drop bike photo here"}
              </p>
              <p className="text-[11px] text-muted-foreground">
                Mobile: select from Gallery or capture with Camera
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isUploading}
              className="text-xs h-7 mt-1 pointer-events-none"
            >
              Choose Device Image
            </Button>
          </div>
        </div>
      )}

      {helperText && (
        <p className="text-[11px] text-muted-foreground">{helperText}</p>
      )}
    </div>
  )
}

