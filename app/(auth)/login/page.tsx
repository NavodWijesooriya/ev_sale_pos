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
    <div className="min-h-screen w-full flex flex-col justify-center items-center p-4 bg-gradient-to-tr from-slate-950 via-slate-900 to-indigo-950 text-white relative overflow-hidden">
      {/* Background glowing ambient orbs */}
      <div className="absolute top-1/4 -left-20 size-80 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 size-80 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />

      {/* Back to public showroom button */}
      <div className="absolute top-6 left-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-medium text-slate-400 hover:text-white transition-colors bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-full border border-white/10 backdrop-blur-sm"
        >
          <ArrowLeft className="size-3.5" />
          Back to Showroom
        </Link>
      </div>

      <div className="w-full max-w-md z-10">
        <div className="text-center mb-6">
          <div className="inline-flex size-12 rounded-2xl bg-gradient-to-br from-indigo-500 via-blue-600 to-cyan-400 items-center justify-center text-white shadow-lg shadow-indigo-500/30 mb-3">
            <Zap className="size-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Ev Sale Pos</h1>
          <p className="text-xs text-slate-400 mt-1">Multi-Tenant EV Dealership Management System</p>
        </div>

        <Card className="border-white/10 bg-slate-900/80 backdrop-blur-xl shadow-2xl text-white">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl font-semibold tracking-tight text-white">
              Dealership Staff Sign In
            </CardTitle>
            <CardDescription className="text-slate-400 text-xs">
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
                <Label htmlFor="email" className="text-xs font-medium text-slate-200">
                  Work Email Address
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 size-4 text-slate-400 pointer-events-none" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="manager@evdealership.com"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-9 h-10 bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus-visible:border-blue-500 focus-visible:ring-blue-500/30 text-sm"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-xs font-medium text-slate-200">
                    Password
                  </Label>
                  <span className="text-[11px] text-slate-400 hover:text-slate-300 cursor-pointer">
                    Forgot password?
                  </span>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 size-4 text-slate-400 pointer-events-none" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-9 h-10 bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus-visible:border-blue-500 focus-visible:ring-blue-500/30 text-sm"
                  />
                </div>
              </div>

              {/* Demo hint for instant testing */}
              <div className="rounded-lg bg-blue-950/40 border border-blue-800/30 p-2.5 text-[11px] text-blue-200/90 leading-relaxed flex items-center justify-between">
                <div>
                  <span className="font-semibold text-blue-400">Demo Admin:</span>{" "}
                  <code>admin@voltpos.com</code> / <code>password123</code>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setEmail("admin@voltpos.com")
                    setPassword("password123")
                  }}
                  className="text-[10px] px-2 py-0.5 rounded bg-blue-600/30 hover:bg-blue-600/50 text-blue-300 font-medium border border-blue-500/30 transition-colors"
                >
                  Auto-fill
                </button>
              </div>
            </CardContent>

            <CardFooter className="pt-2 pb-6 flex flex-col gap-3">
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-10 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium shadow-md shadow-blue-600/30 text-sm"
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

              <div className="text-center text-[11px] text-slate-400">
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
        <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
          <Loader2 className="size-6 animate-spin text-blue-500" />
        </div>
      }
    >
      <LoginForm />
    </React.Suspense>
  )
}
