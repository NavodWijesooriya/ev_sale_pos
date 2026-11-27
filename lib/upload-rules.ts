/**
 * File upload rules shared by the browser and the server (pure: no imports, no I/O).
 *
 *  - public images (vehicle model photos, storefront logo): JPEG / PNG / WebP / GIF / AVIF  -> bucket "public-media"
 *  - Delivery Order scans: the same images, plus PDF                                       -> bucket "private-documents"
 *  - at most 10 MB per file. SVG is never accepted: it can carry scripts.
 *
 * Personal documents (NIC copies etc.) are NOT uploaded anywhere.
 */

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024
/** Images are shrunk to this width in the browser before upload to stay within the storage free tier. */
export const MAX_IMAGE_WIDTH = 1600

export const IMAGE_MIME_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
}

export const DOCUMENT_MIME_TYPES: Record<string, string> = { ...IMAGE_MIME_TYPES, "application/pdf": "pdf" }

export type UploadKind = "public-image" | "do-scan"

/** What a public image is for; becomes the <type> segment of the storage path. */
export const PUBLIC_MEDIA_TYPES = ["vehicle-model", "branding"] as const
export type PublicMediaType = (typeof PUBLIC_MEDIA_TYPES)[number]

export const DO_SCAN_TYPE = "delivery-order"

export function allowedMimeTypes(kind: UploadKind): Record<string, string> {
  return kind === "do-scan" ? DOCUMENT_MIME_TYPES : IMAGE_MIME_TYPES
}

export function extensionFor(kind: UploadKind, mimeType: string): string | null {
  return allowedMimeTypes(kind)[mimeType] ?? null
}

/** Returns an error message, or null when the declared file is acceptable. */
export function validateUpload(kind: UploadKind, file: { mimeType: string; size: number }): string | null {
  if (!extensionFor(kind, file.mimeType)) {
    return kind === "do-scan"
      ? "Only JPEG, PNG, WebP, GIF, AVIF images or a PDF can be uploaded."
      : "Only JPEG, PNG, WebP, GIF or AVIF images can be uploaded."
  }
  if (!Number.isFinite(file.size) || file.size <= 0) return "The file is empty."
  if (file.size > MAX_UPLOAD_BYTES) return "The file is larger than 10 MB."
  return null
}

/** The real type of a file from its first bytes (so a renamed file cannot pass as an image or PDF). */
export function sniffMime(bytes: Uint8Array): string | null {
  const at = (offset: number, text: string) => text.split("").every((ch, i) => bytes[offset + i] === ch.charCodeAt(0))
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg"
  if (bytes.length >= 8 && bytes[0] === 0x89 && at(1, "PNG") && bytes[4] === 0x0d && bytes[5] === 0x0a) return "image/png"
  if (bytes.length >= 6 && at(0, "GIF8")) return "image/gif"
  if (bytes.length >= 12 && at(0, "RIFF") && at(8, "WEBP")) return "image/webp"
  if (bytes.length >= 12 && at(4, "ftyp") && (at(8, "avif") || at(8, "avis"))) return "image/avif"
  if (bytes.length >= 5 && at(0, "%PDF-")) return "application/pdf"
  return null
}
