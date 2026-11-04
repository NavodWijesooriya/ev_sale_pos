"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { UploadCloud, Image as ImageIcon, X, Loader2, CheckCircle2 } from "lucide-react"
import { toast } from "sonner"

interface ImageUploaderProps {
  value: string | null | undefined
  onChange: (url: string) => void
  label?: string
  helperText?: string
  className?: string
}

export function ImageUploader({
  value,
  onChange,
  label = "EV Bike Photo / Image",
  helperText = "Upload high-res photo from device gallery or camera (PNG, JPG, WebP up to 10MB)",
  className = "",
}: ImageUploaderProps) {
  const [isUploading, setIsUploading] = React.useState(false)
  const [dragOver, setDragOver] = React.useState(false)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const handleUploadFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please select a valid image file (PNG, JPG, WebP)")
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image file must be under 10MB")
      return
    }

    setIsUploading(true)
    const toastId = toast.loading("Uploading image from device...")

    try {
      const formData = new FormData()
      formData.append("file", file)

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      })

      const data = await res.json()

      if (!res.ok || !data.success) {
        // Fallback: convert file to local base64 Data URL if server endpoint rejected
        const reader = new FileReader()
        reader.onloadend = () => {
          const base64 = reader.result as string
          onChange(base64)
          toast.success("Image saved as base64 preview", { id: toastId })
        }
        reader.readAsDataURL(file)
        return
      }

      onChange(data.url)
      toast.success("Image uploaded successfully!", { id: toastId })
    } catch (err: any) {
      // Fallback: convert to base64 Data URL so user never gets stuck
      try {
        const reader = new FileReader()
        reader.onloadend = () => {
          const base64 = reader.result as string
          onChange(base64)
          toast.success("Image stored successfully", { id: toastId })
        }
        reader.readAsDataURL(file)
      } catch (fallbackErr) {
        toast.error("Failed to upload image. Please try again.", { id: toastId })
      }
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

