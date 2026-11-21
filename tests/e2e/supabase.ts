import path from "node:path"
import dotenv from "dotenv"
import { createClient } from "@supabase/supabase-js"

dotenv.config({ path: path.resolve(process.cwd(), ".env") })

/** Service-role client, for reading the state of e2e logins (banned, deleted). Never used on non-e2e users. */
export const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { autoRefreshToken: false, persistSession: false },
})

export async function authUserByEmail(email: string) {
  const { data, error } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 })
  if (error) throw error
  return data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase()) ?? null
}

/** True when Supabase Auth currently blocks this login. */
export function isBanned(user: { banned_until?: string | null } | null): boolean {
  return Boolean(user?.banned_until && new Date(user.banned_until).getTime() > Date.now())
}
