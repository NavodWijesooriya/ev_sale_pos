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
import { Zap, Lock, Mail, ArrowLeft, Loader2, AlertCircle } from "lucide-react"

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard"

  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [isLoading, setIsLoading] = React.useState(false)
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setErrorMessage(null)

    try {
      const res = await signIn("credentials", {
        redirect: false,
        email,
        password,
        callbackUrl,
      })

      if (res?.error) {
        if (res.error === "CredentialsSignin") {
          setErrorMessage("Invalid email or password. Please verify your credentials.")
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

  return (
    <div className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-teal-50 via-background to-slate-50 p-4 text-foreground">
      <div className="pointer-events-none absolute -right-24 -top-28 size-96 rounded-full border border-teal-900/5" />
      <div className="pointer-events-none absolute -right-12 -top-16 size-72 rounded-full border border-teal-900/5" />

      {/* Back to public showroom button */}
      <div className="absolute top-6 left-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-full border border-border bg-card/80 px-3.5 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-card hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          Back to Showroom
        </Link>
      </div>

      <div className="w-full max-w-md z-10">
        <div className="text-center mb-6">
          <div className="mb-3 inline-flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
            <Zap className="size-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Ev Sale Pos</h1>
          <p className="mt-1 text-sm text-muted-foreground">Multi-tenant EV dealership management</p>
        </div>

        <Card className="rounded-2xl border-border/80 bg-card shadow-xl shadow-slate-900/5 text-card-foreground">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl font-semibold tracking-tight text-foreground">
              Dealership Staff Sign In
            </CardTitle>
            <CardDescription className="text-sm text-muted-foreground">
              Enter your corporate email and password to access your branch dashboard
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {errorMessage && (
                <div className="flex items-center gap-2 p-3 text-xs rounded-lg bg-red-500/10 border border-red-500/20 text-red-400">
                  <AlertCircle className="size-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-foreground">
                  Work Email Address
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 size-4 text-muted-foreground pointer-events-none" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="manager@evdealership.com"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-sm font-medium text-foreground">
                    Password
                  </Label>
                  <span className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
                    Forgot password?
                  </span>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 size-4 text-muted-foreground pointer-events-none" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Demo hint for instant testing */}
              <div className="flex items-center justify-between gap-3 rounded-xl border border-primary/15 bg-primary/5 p-3 text-xs leading-relaxed text-foreground/80">
                <div>
                  <span className="font-semibold text-primary">Demo Admin:</span>{" "}
                  <code>admin@voltpos.com</code> / <code>password123</code>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setEmail("admin@voltpos.com")
                    setPassword("password123")
                  }}
                  className="rounded-lg border border-primary/20 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/15"
                >
                  Auto-fill
                </button>
              </div>
            </CardContent>

            <CardFooter className="pt-2 pb-6 flex flex-col gap-3">
              <Button
                type="submit"
                disabled={isLoading}
                className="h-11 w-full rounded-xl text-sm font-semibold shadow-sm"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Authenticating...
                  </>
                ) : (
                  "Sign In to Dashboard"
                )}
              </Button>

              <div className="text-center text-xs text-muted-foreground">
                Protected by tenant isolation & enterprise RBAC encryption.
              </div>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <React.Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
          <Loader2 className="size-6 animate-spin text-primary" />
        </div>
      }
    >
      <LoginForm />
    </React.Suspense>
  )
}
