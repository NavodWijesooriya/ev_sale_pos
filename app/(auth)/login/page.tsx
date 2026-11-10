"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { AlertCircle, ArrowRight, KeyRound, Loader2, Mail } from "lucide-react"
import { loginAction } from "@/app/actions/auth"
import { LoginExperience } from "@/components/auth/login-experience"
import { PasswordField } from "@/components/auth/password-field"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

function LoginForm() {
  const router = useRouter()
  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)
  const [isLoading, setIsLoading] = React.useState(false)

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsLoading(true)
    setErrorMessage(null)
    const formData = new FormData()
    formData.set("email", email)
    formData.set("password", password)

    try {
      const result = await loginAction(formData)
      if (!result.success) {
        setErrorMessage(result.error)
        return
      }

      router.replace("/dashboard")
      router.refresh()
    } catch (error: unknown) {
      setErrorMessage(error instanceof Error ? error.message : "Authentication error")
    } finally {
      setIsLoading(false)
    }
  }

  const fillDemoCredentials = () => {
    setEmail("admin@voltpos.com")
    setPassword("password123")
    setErrorMessage(null)
  }

  return (
    <LoginExperience portal="dealership">
      <form onSubmit={handleSubmit} className="space-y-5">
        {errorMessage && (
          <div
            role="alert"
            className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3.5 text-sm text-red-700"
          >
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            <span className="leading-5">{errorMessage}</span>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="email" className="text-sm font-medium text-[#34443a]">Work email</Label>
          <div className="relative">
            <Mail aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[#89968e]" />
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="username"
              placeholder="you@dealership.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              disabled={isLoading}
              className="h-12 rounded-xl border-[#dfe6e0] bg-white pl-11 text-[15px] shadow-none transition-colors placeholder:text-[#a0aaa3] focus-visible:border-[#57806a] focus-visible:ring-[#57806a]/15"
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="password" className="text-sm font-medium text-[#34443a]">Password</Label>
            <span className="text-xs text-[#869188]">Contact your administrator if you need help</span>
          </div>
          <PasswordField
            id="password"
            name="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            disabled={isLoading}
          />
        </div>

       
        <Button
          type="submit"
          disabled={isLoading}
          className="h-12 w-full rounded-xl bg-[#183a34] text-sm font-semibold text-white shadow-none transition-colors hover:bg-[#24544a]"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              Signing in...
            </>
          ) : (
            <>
              Sign in to your workspace
              <ArrowRight className="ml-2 size-4" />
            </>
          )}
        </Button>
      </form>
    </LoginExperience>
  )
}

export default function LoginPage() {
  return <LoginForm />
}
