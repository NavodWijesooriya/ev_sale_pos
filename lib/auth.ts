import { NextAuthOptions, getServerSession } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { PrismaAdapter } from "@auth/prisma-adapter"
import bcrypt from "bcrypt"
import { prisma } from "@/lib/prisma"

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as any,
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email", placeholder: "admin@evdealership.com" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Please enter your email and password")
        }

        const email = credentials.email.toLowerCase().trim()

        // 1. Check Platform Users (PlatformAdmin / Support)
        const platformUser = await prisma.platformUser.findUnique({
          where: { email },
        })

        if (platformUser && platformUser.passwordHash) {
          const isPasswordValid = await bcrypt.compare(
            credentials.password,
            platformUser.passwordHash
          )

          if (!isPasswordValid) {
            throw new Error("Invalid email or password")
          }

          return {
            id: platformUser.id,
            name: platformUser.name,
            email: platformUser.email,
            role: platformUser.role, // "PlatformAdmin" | "Support"
            organizationId: "platform",
            organizationName: "Platform Control Center",
          }
        }

        // 2. Check Tenant Users (OrgAdmin, BranchManager, SalesRep, Cashier, Technician)
        const user = await prisma.user.findUnique({
          where: { email },
          include: {
            organization: true,
          },
        })

        if (!user || !user.passwordHash) {
          throw new Error("Invalid email or password")
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.passwordHash
        )

        if (!isPasswordValid) {
          throw new Error("Invalid email or password")
        }

        // Block login if staff member is disabled/inactive
        if (user.isActive === false) {
          throw new Error("Your account has been deactivated. Please contact your Dealership Administrator.")
        }

        // Block login if the dealership organization is suspended
        if (user.organization?.subscriptionStatus === "Suspended") {
          throw new Error("Your account is suspended. Contact Support.")
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          organizationId: user.organizationId,
          organizationName: user.organization?.businessName || "Dealership",
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = user.role
        token.organizationId = user.organizationId
        token.organizationName = user.organizationName
      }
      return token
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as string
        session.user.organizationId = token.organizationId as string
        session.user.organizationName = (token.organizationName as string) || "Dealership"
      }
      return session
    },
  },
  secret: process.env.NEXTAUTH_SECRET || "fallback-secret-for-development-ev-sale-pos",
}

/**
 * Reusable helper to get the server session anywhere in Server Components or API routes
 */
export async function getAuthSession() {
  return await getServerSession(authOptions)
}

/**
 * Reusable helper to get the currently authenticated user with tenant context
 */
export async function getCurrentUser() {
  const session = await getAuthSession()
  return session?.user
}
