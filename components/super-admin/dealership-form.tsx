"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { registerDealership } from "@/app/actions/dealership"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import {
  Building2,
  Mail,
  User,
  Lock,
  Phone,
  Sparkles,
  Loader2,
  CheckCircle2,
  Eye,
  EyeOff,
} from "lucide-react"
import { toast } from "sonner"
import { SubscriptionPlan } from "@prisma/client"

interface DealershipFormProps {
  onSuccess?: () => void
}

export function DealershipForm({ onSuccess }: DealershipFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [showPassword, setShowPassword] = React.useState(false)

  const [formData, setFormData] = React.useState({
    businessName: "",
    phone: "",
    plan: SubscriptionPlan.Pro,
    adminName: "",
    adminEmail: "",
    adminPassword: "",
  })

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Client-side validations
    if (!formData.businessName.trim()) {
      toast.error("Please enter the dealership business name")
      return
    }
    if (!formData.adminName.trim()) {
      toast.error("Please enter the primary administrator name")
      return
    }
    if (!formData.adminEmail.trim() || !formData.adminEmail.includes("@")) {
      toast.error("Please enter a valid administrator email address")
      return
    }
    if (!formData.adminPassword || formData.adminPassword.length < 6) {
      toast.error("Password must be at least 6 characters long")
      return
    }

    setIsSubmitting(true)

    try {
      const result = await registerDealership({
        businessName: formData.businessName,
        phone: formData.phone,
        plan: formData.plan,
        adminName: formData.adminName,
        adminEmail: formData.adminEmail,
        adminPassword: formData.adminPassword,
      })

      if (result.success) {
        toast.success(result.message, {
          description: `Admin ${formData.adminEmail} can now log into their dedicated tenant portal.`,
        })

        // Reset form
        setFormData({
          businessName: "",
          phone: "",
          plan: SubscriptionPlan.Pro,
          adminName: "",
          adminEmail: "",
          adminPassword: "",
        })

        if (onSuccess) {
          onSuccess()
        }
        router.refresh()
      } else {
        toast.error("Registration Failed", {
          description: result.message,
        })
      }
    } catch (err) {
      toast.error("Error", {
        description: err instanceof Error ? err.message : "An unexpected error occurred",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card className="border-border shadow-sm">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
            <Building2 className="size-4" />
          </div>
          <div>
            <CardTitle className="text-base font-semibold">
              Onboard New EV Dealership
            </CardTitle>
            <CardDescription className="text-xs">
              Provision a new isolated tenant schema, primary showroom branch, and owner admin account.
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {/* Section 1: Organization Details */}
          <div className="space-y-3">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              1. Dealership Profile
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="businessName" className="text-xs font-medium">
                  Dealership Business Name <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Building2 className="absolute left-2.5 top-2.5 size-4 text-muted-foreground pointer-events-none" />
                  <Input
                    id="businessName"
                    placeholder="e.g. Apex EV Motors Ltd"
                    value={formData.businessName}
                    onChange={(e) => handleChange("businessName", e.target.value)}
                    className="pl-8 text-xs h-9"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="phone" className="text-xs font-medium">
                  Contact Phone
                </Label>
                <div className="relative">
                  <Phone className="absolute left-2.5 top-2.5 size-4 text-muted-foreground pointer-events-none" />
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="e.g. +94 11 234 5678"
                    value={formData.phone}
                    onChange={(e) => handleChange("phone", e.target.value)}
                    className="pl-8 text-xs h-9"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="plan" className="text-xs font-medium">
                  Subscription Tier <span className="text-red-500">*</span>
                </Label>
                <select
                  id="plan"
                  value={formData.plan}
                  onChange={(e) => handleChange("plan", e.target.value as SubscriptionPlan)}
                  className="w-full h-9 rounded-lg border border-input bg-transparent px-2.5 py-1 text-xs outline-none focus:ring-1 focus:ring-ring dark:bg-input/30"
                >
                  <option value={SubscriptionPlan.Free} className="bg-popover text-popover-foreground">
                    Free (1 Branch • Basic POS)
                  </option>
                  <option value={SubscriptionPlan.Basic} className="bg-popover text-popover-foreground">
                    Basic (3 Branches • Stock Barcodes)
                  </option>
                  <option value={SubscriptionPlan.Pro} className="bg-popover text-popover-foreground">
                    Pro (10 Branches • Lease & Bank POS)
                  </option>
                  <option value={SubscriptionPlan.Enterprise} className="bg-popover text-popover-foreground">
                    Enterprise (Unlimited Branches • Custom API)
                  </option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: OrgAdmin Account */}
          <div className="space-y-3 pt-2 border-t">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              2. Dealership Owner (OrgAdmin) Credentials
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="adminName" className="text-xs font-medium">
                  Admin Full Name <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <User className="absolute left-2.5 top-2.5 size-4 text-muted-foreground pointer-events-none" />
                  <Input
                    id="adminName"
                    placeholder="e.g. Samantha Vance"
                    value={formData.adminName}
                    onChange={(e) => handleChange("adminName", e.target.value)}
                    className="pl-8 text-xs h-9"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="adminEmail" className="text-xs font-medium">
                  Admin Work Email <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Mail className="absolute left-2.5 top-2.5 size-4 text-muted-foreground pointer-events-none" />
                  <Input
                    id="adminEmail"
                    type="email"
                    placeholder="admin@dealership.com"
                    value={formData.adminEmail}
                    onChange={(e) => handleChange("adminEmail", e.target.value)}
                    className="pl-8 text-xs h-9"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="adminPassword" className="text-xs font-medium">
                  Initial Password <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Lock className="absolute left-2.5 top-2.5 size-4 text-muted-foreground pointer-events-none" />
                  <Input
                    id="adminPassword"
                    type={showPassword ? "text" : "password"}
                    placeholder="Min 6 characters"
                    value={formData.adminPassword}
                    onChange={(e) => handleChange("adminPassword", e.target.value)}
                    className="pl-8 pr-8 text-xs h-9"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                    aria-label="Toggle password visibility"
                  >
                    {showPassword ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Info Box */}
          <div className="flex items-center gap-2 rounded-lg bg-muted/50 p-2.5 text-[11px] text-muted-foreground border">
            <Sparkles className="size-3.5 text-blue-500 shrink-0" />
            <span>
              Transactions execute atomically with bcrypt hashing and auto-generate the initial showroom branch.
            </span>
          </div>

          <div className="flex justify-end pt-2">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full sm:w-auto h-9 text-xs px-6 bg-primary text-primary-foreground font-medium shadow-xs"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 size-3.5 animate-spin" />
                  Provisioning Tenant...
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-1.5 size-3.5" />
                  Register & Provision Dealership
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </form>
    </Card>
  )
}
