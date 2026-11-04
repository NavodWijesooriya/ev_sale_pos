"use client"

import * as React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Palette,
  Sparkles,
  Building2,
  Phone,
  ImageIcon,
  CheckCircle2,
  Bike,
  Zap,
  Gauge,
  BatteryCharging,
  Loader2,
  ExternalLink,
  Eye,
} from "lucide-react"
import { toast } from "sonner"
import { updateDealershipAppearance } from "@/app/actions/dealership"
import Link from "next/link"

interface AppearanceSettingsProps {
  initialData: {
    businessName: string
    subdomain: string | null
    domain: string | null
    phone: string | null
    logoUrl: string | null
  }
}

const themeColors = [
  { id: "cyan", name: "Electric Cyan", primary: "bg-cyan-500", text: "text-cyan-600 dark:text-cyan-400", border: "border-cyan-500/30", ring: "ring-cyan-500" },
  { id: "emerald", name: "Emerald Eco", primary: "bg-emerald-500", text: "text-emerald-600 dark:text-emerald-400", border: "border-emerald-500/30", ring: "ring-emerald-500" },
  { id: "indigo", name: "Royal Indigo", primary: "bg-indigo-600", text: "text-indigo-600 dark:text-indigo-400", border: "border-indigo-500/30", ring: "ring-indigo-500" },
  { id: "blue", name: "Volt Blue", primary: "bg-blue-600", text: "text-blue-600 dark:text-blue-400", border: "border-blue-500/30", ring: "ring-blue-500" },
]

export function AppearanceSettings({ initialData }: AppearanceSettingsProps) {
  const [businessName, setBusinessName] = React.useState(initialData.businessName || "")
  const [phone, setPhone] = React.useState(initialData.phone || "")
  const [logoUrl, setLogoUrl] = React.useState(initialData.logoUrl || "")
  const [selectedTheme, setSelectedTheme] = React.useState("cyan")
  const [headline, setHeadline] = React.useState("Electrify Your Ride With Zero Emissions")
  const [tagline, setTagline] = React.useState("Explore live electric bike and scooter stock with transparent prices and instant lease quotes.")
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  const activeTheme = themeColors.find((t) => t.id === selectedTheme) || themeColors[0]

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const res = await updateDealershipAppearance({
        businessName,
        phone,
        logoUrl,
      })

      if (res.success) {
        toast.success(res.message)
      } else {
        toast.error(res.message || "Failed to update appearance.")
      }
    } catch {
      toast.error("An unexpected error occurred.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Palette className="size-6 text-primary" />
              Storefront Appearance & Branding
            </h1>
            <Badge variant="outline" className="text-xs bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30">
              OrgAdmin
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Customize your customer-facing digital showroom branding, hero banner headline, and color theme.
          </p>
        </div>

        {initialData.subdomain && (
          <Link
            href={`/site/${initialData.subdomain}`}
            target="_blank"
            className="inline-flex items-center gap-1.5 text-xs text-primary font-semibold hover:underline"
          >
            <span>Preview Live Showroom</span>
            <ExternalLink className="size-3.5" />
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Settings Form (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <form onSubmit={handleSave} className="space-y-6">
            {/* Card 1: Brand Identity */}
            <Card className="border border-border/80 shadow-xs">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Building2 className="size-4 text-primary" />
                  Brand Identity & Contact
                </CardTitle>
                <CardDescription className="text-xs">
                  Your official trade name and phone number rendered across your public website.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3.5 pt-0">
                <div className="space-y-1">
                  <Label htmlFor="bizName" className="text-xs font-semibold">
                    Dealership Brand Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="bizName"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="e.g. Apex EV Motors"
                    required
                    className="h-9 text-xs"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="contactPhone" className="text-xs font-semibold">
                      Public Inquiries Phone
                    </Label>
                    <Input
                      id="contactPhone"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="e.g. +94 11 234 5678"
                      className="h-9 text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="logo" className="text-xs font-semibold">
                      Logo URL (PNG / SVG)
                    </Label>
                    <Input
                      id="logo"
                      type="url"
                      value={logoUrl}
                      onChange={(e) => setLogoUrl(e.target.value)}
                      placeholder="https://.../logo.png"
                      className="h-9 text-xs"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Card 2: Hero Banner Content */}
            <Card className="border border-border/80 shadow-xs">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Sparkles className="size-4 text-amber-500" />
                  Storefront Hero Banner Content
                </CardTitle>
                <CardDescription className="text-xs">
                  Catch your customers' attention with compelling headlines on your homepage.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3.5 pt-0">
                <div className="space-y-1">
                  <Label htmlFor="headline" className="text-xs font-semibold">
                    Hero Headline
                  </Label>
                  <Input
                    id="headline"
                    value={headline}
                    onChange={(e) => setHeadline(e.target.value)}
                    placeholder="e.g. Electrify Your Ride With Zero Emissions"
                    className="h-9 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="tagline" className="text-xs font-semibold">
                    Promotional Tagline
                  </Label>
                  <Input
                    id="tagline"
                    value={tagline}
                    onChange={(e) => setTagline(e.target.value)}
                    placeholder="e.g. Explore live electric bike stock..."
                    className="h-9 text-xs"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Card 3: Theme Color Palette */}
            <Card className="border border-border/80 shadow-xs">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Palette className="size-4 text-cyan-500" />
                  Storefront Accent Theme
                </CardTitle>
                <CardDescription className="text-xs">
                  Pick the electric color palette for storefront badges, CTA buttons, and specs highlights.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {themeColors.map((theme) => {
                    const isSelected = selectedTheme === theme.id
                    return (
                      <button
                        type="button"
                        key={theme.id}
                        onClick={() => setSelectedTheme(theme.id)}
                        className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition-all cursor-pointer ${
                          isSelected
                            ? `border-primary bg-primary/5 shadow-xs ring-1 ${theme.ring}`
                            : "border-border/70 hover:border-primary/40 hover:bg-muted/30"
                        }`}
                      >
                        <div className={`size-6 rounded-full ${theme.primary} shadow-xs`} />
                        <span className="text-xs font-bold text-foreground">{theme.name}</span>
                        {isSelected && (
                          <Badge variant="outline" className="text-[9px] py-0 px-1 font-semibold">
                            Active
                          </Badge>
                        )}
                      </button>
                    )
                  })}
                </div>
              </CardContent>
              <CardFooter className="pt-2 border-t">
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full sm:w-auto h-9 text-xs bg-primary text-primary-foreground font-semibold"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                      Saving Appearance...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="mr-1.5 size-3.5" />
                      Save Appearance Settings
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>
          </form>
        </div>

        {/* Right Column: Live Interactive Preview (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-muted-foreground">
            <Eye className="size-3.5" />
            <span>Storefront Live Preview</span>
          </div>

          {/* Mini Storefront Preview Box */}
          <div className="rounded-2xl border border-border/80 bg-background overflow-hidden shadow-md">
            {/* Browser top-bar mockup */}
            <div className="bg-muted/70 px-3.5 py-2 border-b flex items-center justify-between text-[11px] text-muted-foreground font-mono">
              <div className="flex items-center gap-1.5">
                <div className="size-2 rounded-full bg-red-400" />
                <div className="size-2 rounded-full bg-amber-400" />
                <div className="size-2 rounded-full bg-emerald-400" />
              </div>
              <span className="truncate max-w-[200px]">
                https://{initialData.subdomain || "dealership"}.evsalepos.com
              </span>
              <div className="size-3" />
            </div>

            {/* Mini Showroom Hero Preview */}
            <div className="p-4 bg-gradient-to-b from-card via-card/90 to-background border-b text-center space-y-2">
              <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${activeTheme.border} ${activeTheme.text}`}>
                <Sparkles className="size-2.5" />
                Certified EV Bike Dealer
              </span>
              <h3 className="text-sm font-black text-foreground">
                {headline || "Electrify Your Ride With Zero Emissions"}
              </h3>
              <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">
                {tagline}
              </p>
              <div className="pt-1">
                <span className={`inline-block text-[10px] text-white font-bold px-3 py-1 rounded-lg ${activeTheme.primary}`}>
                  Explore Available EV Bikes
                </span>
              </div>
            </div>

            {/* Mini EV Bike Card Preview */}
            <div className="p-3 bg-muted/20 space-y-2.5">
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Sample Card Preview
              </div>

              <div className="rounded-xl border bg-card p-3 shadow-xs space-y-2.5">
                <div className="relative h-24 rounded-lg bg-gradient-to-br from-slate-900 to-indigo-950 flex flex-col items-center justify-center text-white">
                  <Bike className="size-8 text-cyan-400" />
                  <span className="text-[9px] font-mono text-slate-300 mt-1">Apex 2000W Scooter</span>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase text-muted-foreground">Volt Motors</span>
                    <h4 className="text-xs font-bold text-foreground">Apex 2000W GT</h4>
                  </div>
                  <span className="text-xs font-black text-foreground">$2,450</span>
                </div>

                {/* 3-Col EV Bike Specs Preview */}
                <div className="grid grid-cols-3 gap-1 p-1.5 rounded-lg bg-muted/50 border text-center text-[10px]">
                  <div>
                    <span className="text-muted-foreground text-[9px] flex items-center justify-center gap-0.5">
                      <Zap className="size-2.5 text-amber-500" /> Motor
                    </span>
                    <span className="font-bold text-foreground">2000W</span>
                  </div>
                  <div className="border-x border-border/60">
                    <span className="text-muted-foreground text-[9px] flex items-center justify-center gap-0.5">
                      <Gauge className="size-2.5 text-cyan-500" /> Range
                    </span>
                    <span className="font-bold text-foreground">120km</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-[9px] flex items-center justify-center gap-0.5">
                      <BatteryCharging className="size-2.5 text-emerald-500" /> Battery
                    </span>
                    <span className="font-bold text-foreground">60V 32Ah</span>
                  </div>
                </div>

                <Button size="sm" className={`w-full h-7 text-[10px] font-bold text-white ${activeTheme.primary}`}>
                  Reserve / Inquire EV Bike
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
