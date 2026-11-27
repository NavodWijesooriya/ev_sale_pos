/**
 * Creates (or updates) the two Supabase Storage buckets the app uses. Safe to run again.
 *
 *   node --env-file=.env scripts/setup-storage.mjs
 *
 *  - public-media       public   vehicle model photos, storefront logo, other public images
 *  - private-documents  PRIVATE  Delivery Order scans (nothing else, for now). Never served by a public URL:
 *                                the app hands out short-lived signed URLs after its permission + branch checks.
 *
 * Objects live at <organizationId>/<type>/<recordId>/<uuid>.<ext>.
 * Uses the service-role key: run it from a trusted machine only.
 */
import { createClient } from "@supabase/supabase-js"

const MB = 1024 * 1024
const IMAGES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"]

const BUCKETS = [
  { id: "public-media", public: true, fileSizeLimit: 10 * MB, allowedMimeTypes: IMAGES },
  { id: "private-documents", public: false, fileSizeLimit: 10 * MB, allowedMimeTypes: [...IMAGES, "application/pdf"] },
]

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.")
  process.exit(1)
}

const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
const { data: existing, error: listError } = await supabase.storage.listBuckets()
if (listError) {
  console.error("Could not list buckets:", listError.message)
  process.exit(1)
}

for (const bucket of BUCKETS) {
  const { id, ...options } = bucket
  const found = existing.find((b) => b.id === id)
  const { error } = found ? await supabase.storage.updateBucket(id, options) : await supabase.storage.createBucket(id, options)
  if (error) {
    console.error(`${id}: ${error.message}`)
    process.exit(1)
  }
  console.log(`${id}: ${found ? "updated" : "created"} (${options.public ? "public" : "private"}, max ${options.fileSizeLimit / MB} MB)`)
}

const { data: after } = await supabase.storage.listBuckets()
for (const b of after.filter((x) => BUCKETS.some((c) => c.id === x.id))) console.log(`verify ${b.id}: public=${b.public}`)
