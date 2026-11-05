"use client"

import * as React from "react"
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
import { platformLoginAction } from "@/app/actions/auth"
import {
  ShieldCheck,
  Lock,
  Mail,
  ArrowLeft,
  Loader2,
  AlertCircle,
  KeyRound,
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
      const formData = new FormData()
      formData.set("email", email)
      formData.set("password", password)
      const res = await platformLoginAction(formData)

      if (!res.success) {
        setErrorMessage(res.error)
      } else {
        router.push(callbackUrl)
        router.refresh()
      }
    } catch (error: unknown) {
      setErrorMessage(error instanceof Error ? error.message : "Login failed")
    } finally {
      setIsLoading(false)
    }
  }

  const handleFillDemo = () => {
    setEmail("superadmin@evsalepos.com")
    setPassword("admin123")
  }

  return (
    <div className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-teal-50 via-background to-slate-50 p-4 text-foreground">
      <div className="pointer-events-none absolute -right-24 -top-28 size-96 rounded-full border border-teal-900/5" />
      <div className="pointer-events-none absolute -right-12 -top-16 size-72 rounded-full border border-teal-900/5" />

      {/* Top Left Navigation Link */}
      <div className="absolute top-6 left-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-full border border-border bg-card/80 px-3.5 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-card hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          Public Showroom
        </Link>
      </div>

      <div className="w-full max-w-md z-10 space-y-6">
        {/* Brand & Platform Identity Header */}
        <div className="text-center space-y-2">
          <div className="mb-1 inline-flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
            <ShieldCheck className="size-7" />
          </div>
          <div className="flex items-center justify-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Ev Sale Pos</h1>
            <Badge
              variant="outline"
              className="border-primary/20 bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wider"
            >
              Platform Control Plane
            </Badge>
          </div>
          <p className="mx-auto max-w-xs text-sm text-muted-foreground">
            Multi-Tenant SaaS Infrastructure & Super Admin Operations
          </p>
        </div>

        {/* Super Admin Login Card */}
        <Card className="overflow-hidden rounded-2xl border-border/80 bg-card text-card-foreground shadow-xl shadow-slate-900/5">
          <CardHeader className="space-y-1 pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl font-semibold tracking-tight text-foreground">
                Super Admin Sign In
              </CardTitle>
              <Badge               className="border-primary/20 bg-primary/10 text-primary text-[10px] font-mono">
                PlatformAdmin
              </Badge>
            </div>
            <CardDescription className="text-sm text-muted-foreground">
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
                <Label htmlFor="admin-email" className="text-sm font-medium text-foreground">
                  Super Admin Email
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 size-4 text-muted-foreground pointer-events-none" />
                  <Input
                    id="admin-email"
                    type="email"
                    placeholder="superadmin@evsalepos.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={isLoading}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="admin-password" className="text-sm font-medium text-foreground">
                    Master Password
                  </Label>
                  <span className="text-xs text-muted-foreground">Secure administrator access</span>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 size-4 text-muted-foreground pointer-events-none" />
                  <Input
                    id="admin-password"
                    type="password"
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={isLoading}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Demo Helper Button */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={handleFillDemo}
                  className="w-full text-left flex items-center justify-between gap-3 rounded-xl border border-dashed border-primary/25 bg-primary/5 p-3 text-xs text-foreground/80 transition-colors hover:bg-primary/10 cursor-pointer"
                >
                  <span className="flex items-center gap-1.5">
                    <KeyRound className="size-4 text-primary" />
                    Fill Root SuperAdmin Demo Account
                  </span>
                  <span className="rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                    Auto-Fill
                  </span>
                </button>
              </div>
            </CardContent>

            <CardFooter className="flex flex-col gap-3 pt-2">
              <Button
                type="submit"
                disabled={isLoading}
                className="h-11 w-full rounded-xl text-sm font-semibold shadow-sm"
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
                  className="text-xs text-muted-foreground transition-colors hover:text-primary"
                >
                  Looking for tenant dealership login? Click here
                </Link>
              </div>
            </CardFooter>
          </form>
        </Card>

        {/* Security Notice */}
        <div className="space-y-1 text-center text-xs text-muted-foreground">
          <p>Restricted Area: Authorized Platform Administrators Only.</p>
          <p>Tenant staff and branch accounts are blocked from this portal.</p>
        </div>
      </div>
    </div>
  )
}
