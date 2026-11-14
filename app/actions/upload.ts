"use server"

import { getAuthSession } from "@/lib/auth"
import path from "path"
import fs from "fs/promises"

export async function uploadImageAction(
  formData: FormData
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    const session = await getAuthSession()
    if (!session?.user) {
      return { success: false, error: "Unauthorized. Please login." }
    }

    const file = formData.get("file") as File | null
    if (!file) {
      return { success: false, error: "No file provided" }
    }

    // Raster formats only: SVG can carry scripts and is served from our origin.
    if (!["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"].includes(file.type)) {
      return { success: false, error: "Only JPEG, PNG, WebP, GIF or AVIF images are permitted" }
    }

    if (file.size > 10 * 1024 * 1024) {
      return { success: false, error: "Image file exceeds 10MB limit" }
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const uploadsDir = path.join(process.cwd(), "public", "uploads")
    await fs.mkdir(uploadsDir, { recursive: true })

    const originalExt = path.extname(file.name) || ".jpg"
    const safeExt = originalExt.toLowerCase().replace(/[^a-z0-9.]/g, "")
    const uniqueId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
    const fileName = `ev-${uniqueId}${safeExt}`

    const filePath = path.join(uploadsDir, fileName)
    await fs.writeFile(filePath, buffer)

    return {
      success: true,
      url: `/uploads/${fileName}`,
    }
  } catch (error: unknown) {
    console.error("uploadImageAction error:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to save uploaded image",
    }
  }
}
