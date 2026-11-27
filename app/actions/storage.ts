"use server"

/**
 * Public image uploads (vehicle model photos, storefront logo) into the "public-media" bucket.
 *
 * Two steps, both checked on the server:
 *   1. prepareImageUpload  validates type / size / organization / permission and returns a one-time upload token
 *   2. the browser uploads the (already compressed) file straight to Supabase Storage with that token
 *   3. finalizeImageUpload re-checks the stored file's real type and size and returns its public URL
 *
 * The service-role key is only ever used here, on the server.
 */

import { z } from "zod"
import { getCatalogManagementAccess } from "@/app/actions/inventory"
import { requireOwner, requireUser } from "@/lib/authorize"
import {
  PUBLIC_BUCKET,
  assertOwnPath,
  buildObjectPath,
  createUploadTarget,
  publicObjectUrl,
  verifyUploadedObject,
} from "@/lib/storage"
import { PUBLIC_MEDIA_TYPES, validateUpload } from "@/lib/upload-rules"

type Result<T = object> = ({ success: true } & T) | { success: false; error: string }

const prepareSchema = z.object({
  type: z.enum(PUBLIC_MEDIA_TYPES),
  /** The record the image belongs to (e.g. the vehicle model id), or a fresh random id for an unsaved record. */
  recordId: z.string().regex(/^[A-Za-z0-9_-]{1,80}$/, "Invalid record."),
  mimeType: z.string().max(100),
  size: z.number().int(),
})

async function authorize(type: (typeof PUBLIC_MEDIA_TYPES)[number]) {
  if (type === "branding") return requireOwner()
  // vehicle-model: the same people who may manage the catalog
  const user = await requireUser()
  if (!(await getCatalogManagementAccess())) throw new Error("You do not have permission to change vehicle model photos.")
  return user
}

export async function prepareImageUpload(input: z.input<typeof prepareSchema>): Promise<Result<{ bucket: string; path: string; token: string }>> {
  try {
    const data = prepareSchema.parse(input)
    const user = await authorize(data.type)
    const problem = validateUpload("public-image", { mimeType: data.mimeType, size: data.size })
    if (problem) return { success: false, error: problem }
    const path = buildObjectPath("public-image", user.organizationId, data.type, data.recordId, data.mimeType)
    const target = await createUploadTarget(PUBLIC_BUCKET, path)
    return { success: true, ...target }
  } catch (error) {
    console.error("prepareImageUpload error:", error)
    return { success: false, error: error instanceof Error ? error.message : "Could not prepare the upload." }
  }
}

export async function finalizeImageUpload(input: { path: string; type: (typeof PUBLIC_MEDIA_TYPES)[number] }): Promise<Result<{ url: string }>> {
  try {
    const type = z.enum(PUBLIC_MEDIA_TYPES).parse(input.type)
    const user = await authorize(type)
    assertOwnPath(user.organizationId, input.path, type)
    await verifyUploadedObject("public-image", input.path)
    return { success: true, url: publicObjectUrl(input.path) }
  } catch (error) {
    console.error("finalizeImageUpload error:", error)
    return { success: false, error: error instanceof Error ? error.message : "Could not save the image." }
  }
}
