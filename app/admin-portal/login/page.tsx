"use client"

import * as React from "react"
import { signIn } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  ShieldCheck,
  Lock,
  Mail,
  ArrowLeft,
  Loader2,
  AlertCircle,
  Sparkles,
  KeyRound,
  CheckCircle2,
} from "lucide-react"

export default function SuperAdminLoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get("callbackUrl") || "/admin-portal"

  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [isLoading, setIsLoading] = React.useState(false)
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setErrorMessage(null)

    try {
      // Authenticate explicitly with portal: "admin" so only PlatformUser is checked
      const res = await signIn("credentials", {
        redirect: false,
        email,
        password,
        portal: "admin",
        callbackUrl,
      })

      if (res?.error) {
        if (res.error === "CredentialsSignin") {
          setErrorMessage("Invalid Platform Administrator credentials. Please verify your email and password.")
        } else {
          setErrorMessage(res.error)
        }
      } else if (res?.ok) {
        router.push(callbackUrl)
        router.refresh()
      }
    } catch {
      setErrorMessage("An unexpected authentication error occurred. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleFillDemo = () => {
    setEmail("superadmin@evsalepos.com")
    setPassword("admin123")
  }

  return (
    <div className="min-h-screen w-full flex flex-col justify-center items-center p-4 bg-gradient-to-tr from-slate-950 via-slate-900 to-purple-950 text-white relative overflow-hidden">
      {/* Background ambient glow orbs */}
      <div className="absolute top-1/4 -left-20 size-96 bg-primary/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 size-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />

      {/* Top Left Navigation Link */}
      <div className="absolute top-6 left-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-medium text-slate-400 hover:text-white transition-colors bg-white/5 hover:bg-white/10 px-3.5 py-1.5 rounded-full border border-white/10 backdrop-blur-sm"
        >
          <ArrowLeft className="size-3.5" />
          Public Showroom
        </Link>
      </div>

      <div className="w-full max-w-md z-10 space-y-6">
        {/* Brand & Platform Identity Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex size-14 rounded-2xl bg-gradient-to-br from-purple-500 via-indigo-600 to-blue-500 items-center justify-center text-white shadow-xl shadow-purple-500/25 mb-1">
            <ShieldCheck className="size-7" />
          </div>
          <div className="flex items-center justify-center gap-2">
            <h1 className="text-2xl font-black tracking-tight text-white">Ev Sale Pos</h1>
            <Badge
              variant="outline"
              className="bg-primary/20 text-purple-300 border-purple-500/40 text-[10px] font-bold uppercase tracking-wider"
            >
              Platform Control Plane
            </Badge>
          </div>
          <p className="text-xs text-slate-400 max-w-xs mx-auto">
            Multi-Tenant SaaS Infrastructure & Super Admin Operations
          </p>
        </div>

        {/* Super Admin Login Card */}
        <Card className="border border-primary/20 bg-slate-900/85 backdrop-blur-2xl shadow-2xl text-white rounded-2xl overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-purple-500 via-indigo-500 to-cyan-500" />
          <CardHeader className="space-y-1 pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl font-bold tracking-tight text-white">
                Super Admin Sign In
              </CardTitle>
              <Badge className="bg-primary/30 text-purple-300 border border-primary/30 text-[10px] font-mono">
                PlatformAdmin
              </Badge>
            </div>
            <CardDescription className="text-slate-400 text-xs">
              Enter your master platform credentials to access the global admin console
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {errorMessage && (
                <div className="flex items-start gap-2.5 p-3 text-xs rounded-xl bg-red-500/10 border border-red-500/30 text-red-400">
                  <AlertCircle className="size-4 shrink-0 mt-0.5" />
                  <span className="leading-snug">{errorMessage}</span>
                </div>
              )}

              {/* Email Address */}
              <div className="space-y-1.5">
                <Label htmlFor="admin-email" className="text-xs font-semibold text-slate-300">
                  Super Admin Email
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 size-4 text-slate-500 pointer-events-none" />
                  <Input
                    id="admin-email"
                    type="email"
                    placeholder="superadmin@evsalepos.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={isLoading}
                    className="pl-9 text-xs h-10 rounded-xl bg-slate-950/70 border-white/10 text-white placeholder:text-slate-500 focus-visible:ring-purple-500 focus-visible:border-purple-500"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="admin-password" className="text-xs font-semibold text-slate-300">
                    Master Password
                  </Label>
                  <span className="text-[10px] text-purple-400 font-mono">256-bit encrypted</span>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 size-4 text-slate-500 pointer-events-none" />
                  <Input
                    id="admin-password"
                    type="password"
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={isLoading}
                    className="pl-9 text-xs h-10 rounded-xl bg-slate-950/70 border-white/10 text-white placeholder:text-slate-500 focus-visible:ring-purple-500 focus-visible:border-purple-500"
                  />
                </div>
              </div>

              {/* Demo Helper Button */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={handleFillDemo}
                  className="w-full text-left p-2.5 rounded-xl border border-dashed border-primary/30 bg-primary/5 hover:bg-primary/10 text-[11px] text-purple-300 transition-colors flex items-center justify-between cursor-pointer"
                >
                  <span className="flex items-center gap-1.5">
                    <KeyRound className="size-3.5 text-purple-400" />
                    Fill Root SuperAdmin Demo Account
                  </span>
                  <span className="text-[10px] font-mono text-purple-400 bg-primary/20 px-1.5 py-0.5 rounded">
                    Auto-Fill
                  </span>
                </button>
              </div>
            </CardContent>

            <CardFooter className="flex flex-col gap-3 pt-2">
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full text-xs h-10 font-bold bg-primary hover:from-purple-700 hover:to-indigo-700 text-white shadow-lg shadow-purple-600/30 rounded-xl cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Authenticating Platform Admin...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="mr-1.5 size-4" />
                    Sign In to Platform Admin Portal
                  </>
                )}
              </Button>

              <div className="text-center pt-2">
                <Link
                  href="/login"
                  className="text-[11px] text-slate-400 hover:text-purple-300 transition-colors"
                >
                  Looking for tenant dealership login? Click here
                </Link>
              </div>
            </CardFooter>
          </form>
        </Card>

        {/* Security Notice */}
        <div className="text-center text-[11px] text-slate-500 space-y-1">
          <p>Restricted Area: Authorized Platform Administrators Only.</p>
          <p>Tenant staff and branch accounts are blocked from this portal.</p>
        </div>
      </div>
    </div>
  )
}

