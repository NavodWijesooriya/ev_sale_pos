"use client"

import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Building2,
  Globe,
  Mail,
  Lock,
  User,
  Phone,
  Sparkles,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
} from "lucide-react"
import { createTenant } from "@/app/actions/dealership"
import { SubscriptionPlan } from "@prisma/client"
import { toast } from "sonner"
import { OrganizationRow } from "@/components/admin-portal/super-admin-view"

interface CreateDealershipDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: (newOrg: OrganizationRow) => void
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

export function CreateDealershipDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreateDealershipDialogProps) {
  const [businessName, setBusinessName] = React.useState("")
  const [subdomain, setSubdomain] = React.useState("")
  const [hasManuallyEditedSubdomain, setHasManuallyEditedSubdomain] = React.useState(false)
  const [adminName, setAdminName] = React.useState("")
  const [adminEmail, setAdminEmail] = React.useState("")
  const [adminPassword, setAdminPassword] = React.useState("")
  const [showPassword, setShowPassword] = React.useState(false)
  const [phone, setPhone] = React.useState("")
  const [plan, setPlan] = React.useState<SubscriptionPlan>(SubscriptionPlan.Pro)

  const [isLoading, setIsLoading] = React.useState(false)
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)

  // Auto-generate slug while typing dealership name if not manually modified
  const handleBusinessNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setBusinessName(val)
    if (!hasManuallyEditedSubdomain) {
      setSubdomain(slugify(val))
    }
  }

  const handleSubdomainChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setHasManuallyEditedSubdomain(true)
    setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)

    if (!businessName.trim()) {
      setErrorMessage("Please enter a Dealership / Business name.")
      return
    }

    if (!subdomain.trim()) {
      setErrorMessage("Please specify a tenant subdomain.")
      return
    }

    if (!adminEmail.trim() || !adminEmail.includes("@")) {
      setErrorMessage("Please enter a valid administrator email address.")
      return
    }

    if (!adminPassword || adminPassword.length < 6) {
      setErrorMessage("Admin password must be at least 6 characters long.")
      return
    }

    setIsLoading(true)

    try {
      const res = await createTenant({
        businessName: businessName.trim(),
        subdomain: subdomain.trim(),
        adminEmail: adminEmail.trim(),
        adminPassword,
        adminName: adminName.trim() || undefined,
        phone: phone.trim() || undefined,
        plan,
      })

      if (!res.success || !res.organization) {
        setErrorMessage(res.message || "Failed to provision dealership tenant.")
        toast.error(res.message || "Failed to provision dealership.")
        return
      }

      toast.success(`Dealership "${res.organization.businessName}" created successfully!`)

      // Reset form fields
      setBusinessName("")
      setSubdomain("")
      setHasManuallyEditedSubdomain(false)
      setAdminName("")
      setAdminEmail("")
      setAdminPassword("")
      setPhone("")
      setPlan(SubscriptionPlan.Pro)

      onSuccess(res.organization)
      onOpenChange(false)
    } catch (err: any) {
      const msg = err?.message || "An unexpected error occurred while creating the tenant."
      setErrorMessage(msg)
      toast.error(msg)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-card border-border shadow-2xl p-6">
        <DialogHeader className="pb-3 border-b space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="size-9 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center border border-purple-500/20">
              <Building2 className="size-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-foreground flex items-center gap-2">
                Onboard New Dealership
                <Badge variant="outline" className="text-[10px] bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30">
                  New Tenant
                </Badge>
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Provision a multi-tenant dealership organization, assign a subdomain, and create the root OrgAdmin login.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {errorMessage && (
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs">
              <AlertCircle className="size-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Section 1: Dealership Details */}
          <div className="space-y-3">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="size-3.5 text-purple-500" />
              1. Dealership Profile
            </div>

            {/* Business Name */}
            <div className="space-y-1.5">
              <Label htmlFor="businessName" className="text-xs font-medium">
                Dealership / Business Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="businessName"
                placeholder="e.g. Kurunegala Motors"
                value={businessName}
                onChange={handleBusinessNameChange}
                disabled={isLoading}
                required
                className="h-9 text-xs rounded-xl"
              />
            </div>

            {/* Subdomain */}
            <div className="space-y-1.5">
              <Label htmlFor="subdomain" className="text-xs font-medium flex items-center justify-between">
                <span>Tenant Subdomain <span className="text-red-500">*</span></span>
                <span className="text-[11px] text-muted-foreground font-mono">lowercase, no spaces</span>
              </Label>
              <div className="relative">
                <Globe className="absolute left-3 top-2.5 size-3.5 text-muted-foreground pointer-events-none" />
                <Input
                  id="subdomain"
                  placeholder="kurunegala"
                  value={subdomain}
                  onChange={handleSubdomainChange}
                  disabled={isLoading}
                  required
                  className="pl-8 text-xs font-mono h-9 rounded-xl lowercase"
                />
              </div>
              <p className="text-[11px] text-muted-foreground">
                Public URL preview:{" "}
                <span className="text-purple-600 dark:text-purple-400 font-mono font-semibold">
                  {subdomain ? `${subdomain}.lvh.me:3000` : "[subdomain].evsalepos.com"}
                </span>
              </p>
            </div>

            {/* Subscription Plan & Phone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="plan" className="text-xs font-medium">
                  Contract Subscription Plan
                </Label>
                <select
                  id="plan"
                  value={plan}
                  onChange={(e) => setPlan(e.target.value as SubscriptionPlan)}
                  disabled={isLoading}
                  className="w-full h-9 rounded-xl border border-input bg-background px-3 text-xs outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value={SubscriptionPlan.Pro}>Pro Tier (Standard)</option>
                  <option value={SubscriptionPlan.Enterprise}>Enterprise Tier</option>
                  <option value={SubscriptionPlan.Basic}>Basic Tier</option>
                  <option value={SubscriptionPlan.Free}>Free Trial</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="phone" className="text-xs font-medium">
                  Contact Phone (Optional)
                </Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-2.5 size-3.5 text-muted-foreground pointer-events-none" />
                  <Input
                    id="phone"
                    placeholder="+94 37 222 3456"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    disabled={isLoading}
                    className="pl-8 text-xs h-9 rounded-xl"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Initial OrgAdmin Credentials */}
          <div className="space-y-3 pt-3 border-t">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Lock className="size-3.5 text-purple-500" />
              2. Initial OrgAdmin Login Credentials
            </div>

            {/* Admin Full Name */}
            <div className="space-y-1.5">
              <Label htmlFor="adminName" className="text-xs font-medium">
                Admin Full Name
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 size-3.5 text-muted-foreground pointer-events-none" />
                <Input
                  id="adminName"
                  placeholder="e.g. Priyantha Kumara"
                  value={adminName}
                  onChange={(e) => setAdminName(e.target.value)}
                  disabled={isLoading}
                  className="pl-8 text-xs h-9 rounded-xl"
                />
              </div>
            </div>

            {/* Admin Email */}
            <div className="space-y-1.5">
              <Label htmlFor="adminEmail" className="text-xs font-medium">
                Admin Corporate Email <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 size-3.5 text-muted-foreground pointer-events-none" />
                <Input
                  id="adminEmail"
                  type="email"
                  placeholder="manager@kurunegala.com"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  disabled={isLoading}
                  required
                  className="pl-8 text-xs h-9 rounded-xl"
                />
              </div>
            </div>

            {/* Admin Password */}
            <div className="space-y-1.5">
              <Label htmlFor="adminPassword" className="text-xs font-medium">
                Initial Password <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 size-3.5 text-muted-foreground pointer-events-none" />
                <Input
                  id="adminPassword"
                  type={showPassword ? "text" : "password"}
                  placeholder="Min 6 characters"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  disabled={isLoading}
                  required
                  minLength={6}
                  className="pl-8 pr-9 text-xs h-9 rounded-xl"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground p-0.5"
                >
                  {showPassword ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                </button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Password is encrypted using bcrypt (10 rounds) and linked with the <code className="text-xs font-semibold">OrgAdmin</code> role.
              </p>
            </div>
          </div>

          <DialogFooter className="pt-3 border-t gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
              className="text-xs h-9 rounded-xl"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              size="sm"
              className="text-xs h-9 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold shadow-sm"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                  Provisioning Dealership...
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-1.5 size-3.5" />
                  Provision Dealership Tenant
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
