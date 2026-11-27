"use client"

import { createClient } from "@/lib/supabase/client"
import { MAX_IMAGE_WIDTH } from "@/lib/upload-rules"

/**
 * Browser side of uploads: shrink large images, then send the file straight to Supabase Storage using the one-time
 * token the server created after its permission checks. No storage keys are involved.
 */

const COMPRESS_ABOVE_BYTES = 1.5 * 1024 * 1024

/**
 * Photos wider than 1600px (or over about 1.5 MB) are re-encoded as WebP at most 1600px wide, to stay within the
 * storage free tier. PDFs and animated GIFs are left alone; a result that is not smaller than the original is dropped.
 */
export async function compressImage(file: File, maxWidth: number = MAX_IMAGE_WIDTH): Promise<File> {
  if (!file.type.startsWith("image/") || file.type === "image/gif") return file
  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, maxWidth / bitmap.width)
    if (scale === 1 && file.size <= COMPRESS_ABOVE_BYTES) {
      bitmap.close()
      return file
    }
    const canvas = document.createElement("canvas")
    canvas.width = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    bitmap.close()
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.82))
    if (!blob || blob.type !== "image/webp") return file
    if (scale === 1 && blob.size >= file.size) return file
    return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".webp", { type: "image/webp" })
  } catch {
    return file
  }
}

export interface UploadTarget {
  bucket: string
  path: string
  token: string
}

/** Uploads to the exact path the server prepared. */
export async function uploadToTarget(target: UploadTarget, file: File): Promise<void> {
  const { error } = await createClient().storage.from(target.bucket).uploadToSignedUrl(target.path, target.token, file, {
    contentType: file.type,
  })
  if (error) throw new Error(error.message || "The upload failed.")
}
