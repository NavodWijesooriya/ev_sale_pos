"use server"

import { prisma } from "@/lib/prisma"
import { createClient } from "@/lib/supabase/server"
import { isRedirectError } from "next/dist/client/components/redirect-error"

type LoginResult = { success: true } | { success: false; error: string }
type LoginPortal = "tenant" | "platform"

async function authenticate(
  formData: FormData,
  portal: LoginPortal,
): Promise<LoginResult> {
  const submittedEmail = formData.get("email")
  const password = formData.get("password")
  const email = typeof submittedEmail === "string" ? submittedEmail.trim() : ""

  console.log("LOGIN ATTEMPT:", email)

  let authError: { message: string } | null = null
  let dbError: unknown = null

  try {
    if (!email || typeof password !== "string" || !password) {
      authError = { message: "Email and password are required." }
      throw new Error(authError.message)
    }

    const supabase = await createClient()
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      authError = error
      throw error
    }

    const userEmail = data.user.email?.trim().toLowerCase()

    if (!userEmail) {
      authError = { message: "The authenticated account has no email address." }
      throw new Error(authError.message)
    }

    try {
      const platformUser = await prisma.platformUser.findUnique({
        where: { email: userEmail },
        select: { id: true, role: true },
      })

      if (portal === "platform") {
        if (platformUser) {
          return platformUser.role === "PlatformAdmin"
            ? { success: true }
            : { success: false, error: "This account is not a Platform Admin." }
        }

        const tenantUser = await prisma.user.findUnique({
          where: { email: userEmail },
          select: { id: true },
        })

        if (tenantUser) {
          return {
            success: false,
            error: "Dealership accounts cannot access the Platform Admin portal.",
          }
        }

        const allowedAdminEmails = (process.env.PLATFORM_ADMIN_EMAILS ?? "")
          .split(",")
          .map((allowedEmail) => allowedEmail.trim().toLowerCase())
          .filter(Boolean)

        if (!allowedAdminEmails.includes(userEmail)) {
          return {
            success: false,
            error: "This account is not authorized for Platform Admin access.",
          }
        }

        await prisma.platformUser.create({
          data: {
            email: userEmail,
            name: data.user.user_metadata?.name || "Platform Admin",
            passwordHash: "",
            role: "PlatformAdmin",
          },
        })

        return { success: true }
      }

      if (platformUser) {
        return {
          success: false,
          error: "Platform Admin accounts must sign in through the admin portal.",
        }
      }

      const tenantUser = await prisma.user.findUnique({
        where: { email: userEmail },
        select: { isActive: true },
      })

      if (!tenantUser?.isActive) {
        return {
          success: false,
          error: "No active dealership account was found for this email.",
        }
      }

      return { success: true }
    } catch (error: unknown) {
      dbError = error
      throw error
    }
  } catch (error: unknown) {
    if (isRedirectError(error)) {
      throw error
    }

    if (!authError && !dbError) {
      authError = {
        message: error instanceof Error ? error.message : String(error),
      }
    }

    console.error("SUPABASE ERROR:", authError)
    console.error("PRISMA LOOKUP ERROR:", dbError)
    return {
      success: false,
      error: authError?.message || "Login failed",
    }
  }
}

export async function loginAction(formData: FormData): Promise<LoginResult> {
  return authenticate(formData, "tenant")
}

export async function platformLoginAction(formData: FormData): Promise<LoginResult> {
  return authenticate(formData, "platform")
}
