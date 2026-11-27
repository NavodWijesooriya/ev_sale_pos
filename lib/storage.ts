import { randomUUID } from "node:crypto"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import {
  MAX_UPLOAD_BYTES,
  extensionFor,
  sniffMime,
  validateUpload,
  type UploadKind,
} from "@/lib/upload-rules"

/**
 * Supabase Storage, SERVER ONLY (uses the service-role key; never import this from client code).
 *
 *  - "public-media"      public bucket: vehicle model photos, storefront logo, other public images
 *  - "private-documents" private bucket: Delivery Order scans. Reached only through short-lived signed URLs
 *                        created here AFTER the caller's permission and branch checks.
 *
 * Path convention:  <organizationId>/<type>/<recordId>/<uuid>.<ext>
 *
 * Uploads go browser -> Supabase directly through a one-time signed upload URL created here (the platform's request
 * size limit would otherwise cap uploads at a few MB). The server then re-checks the stored file before using it.
 */

export const PUBLIC_BUCKET = "public-media"
export const PRIVATE_BUCKET = "private-documents"

export type StorageBucket = typeof PUBLIC_BUCKET | typeof PRIVATE_BUCKET

const SAFE_SEGMENT = /^[A-Za-z0-9_-]{1,80}$/

export function bucketFor(kind: UploadKind): StorageBucket {
  return kind === "do-scan" ? PRIVATE_BUCKET : PUBLIC_BUCKET
}

/** <organizationId>/<type>/<recordId>/<uuid>.<ext> */
export function buildObjectPath(kind: UploadKind, organizationId: string, type: string, recordId: string, mimeType: string): string {
  const ext = extensionFor(kind, mimeType)
  if (!ext) throw new Error("This file type is not allowed.")
  for (const part of [organizationId, type, recordId]) {
    if (!SAFE_SEGMENT.test(part)) throw new Error("Invalid storage path.")
  }
  return `${organizationId}/${type}/${recordId}/${randomUUID()}.${ext}`
}

/** A path may only be used by the organization it belongs to (and must be one of our own shape). */
export function assertOwnPath(organizationId: string, path: string, expectedType?: string): void {
  const parts = path.split("/")
  const ok = parts.length === 4 && parts.every((part, i) => (i === 3 ? /^[0-9a-f-]{36}\.[a-z0-9]{2,5}$/.test(part) : SAFE_SEGMENT.test(part)))
  if (!ok || parts[0] !== organizationId || (expectedType && parts[1] !== expectedType)) {
    throw new Error("That file does not belong to this dealership.")
  }
}

/** One-time upload token for one exact path. */
export async function createUploadTarget(bucket: StorageBucket, path: string) {
  const admin = createSupabaseAdminClient()
  const { data, error } = await admin.storage.from(bucket).createSignedUploadUrl(path)
  if (error || !data) throw new Error(`Could not prepare the upload: ${error?.message ?? "unknown error"}`)
  return { bucket, path: data.path, token: data.token }
}

/**
 * Checks the stored object really is what it should be (size and real file type from its bytes). A file that fails is
 * deleted. Returns the verified type and size.
 */
export async function verifyUploadedObject(kind: UploadKind, path: string): Promise<{ mimeType: string; size: number }> {
  const bucket = bucketFor(kind)
  const admin = createSupabaseAdminClient()
  const { data, error } = await admin.storage.from(bucket).download(path)
  if (error || !data) throw new Error("The uploaded file was not found. Please try again.")
  const bytes = new Uint8Array(await data.arrayBuffer())
  const mimeType = sniffMime(bytes)
  const problem = mimeType ? validateUpload(kind, { mimeType, size: bytes.length }) : "This is not an allowed file type."
  if (problem || !mimeType) {
    await admin.storage.from(bucket).remove([path])
    throw new Error(problem ?? "This is not an allowed file type.")
  }
  if (bytes.length > MAX_UPLOAD_BYTES) {
    await admin.storage.from(bucket).remove([path])
    throw new Error("The file is larger than 10 MB.")
  }
  return { mimeType, size: bytes.length }
}

export function publicObjectUrl(path: string): string {
  const admin = createSupabaseAdminClient()
  return admin.storage.from(PUBLIC_BUCKET).getPublicUrl(path).data.publicUrl
}

/** Short-lived link to a private object (default 60 seconds). Call only after the permission and branch checks. */
export async function createSignedViewUrl(path: string, seconds = 60, downloadName?: string): Promise<string> {
  const admin = createSupabaseAdminClient()
  const { data, error } = await admin.storage
    .from(PRIVATE_BUCKET)
    .createSignedUrl(path, seconds, downloadName ? { download: downloadName } : undefined)
  if (error || !data) throw new Error("Could not open the file.")
  return data.signedUrl
}

export async function removeObject(bucket: StorageBucket, path: string): Promise<void> {
  const admin = createSupabaseAdminClient()
  const { error } = await admin.storage.from(bucket).remove([path])
  if (error) console.error("removeObject error:", error.message)
}
