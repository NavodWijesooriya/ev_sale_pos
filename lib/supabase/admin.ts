import { createClient, type SupabaseClient } from "@supabase/supabase-js"

/** Service-role client for Auth admin calls (ban, unban, delete). Server-side only. */
export function createSupabaseAdminClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error("Supabase admin credentials are not configured.")
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

/** Finds the Supabase Auth user id for an email (the database does not store it). */
export async function findAuthUserIdByEmail(admin: SupabaseClient, email: string): Promise<string | null> {
  const wanted = email.toLowerCase().trim()
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 })
    if (error) throw new Error(`Could not look up the login account: ${error.message}`)
    const match = data.users.find((u) => u.email?.toLowerCase() === wanted)
    if (match) return match.id
    if (data.users.length < 1000) return null
  }
  return null
}

/** About 100 years: effectively "until enabled again". */
export const BAN_FOREVER = "876000h"
