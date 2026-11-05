"use client"

import * as React from "react"
import Link from "next/link"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  HelpCircle,
  Palette,
  Users,
  Building2,
  Bike,
  ShoppingCart,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  Search,
  FileText,
  Sparkles,
  ExternalLink,
  Zap,
  BatteryCharging,
  Gauge,
  Clock,
  CreditCard,
  Layers,
  Wrench,
  BookOpen,
} from "lucide-react"

interface HelpCenterViewProps {
  organizationName?: string
  userRole?: string
}

export function HelpCenterView({
  organizationName = "Ev Sale Pos Dealership",
  userRole = "OrgAdmin",
}: HelpCenterViewProps) {
  const [searchQuery, setSearchQuery] = React.useState("")
  const [selectedCategory, setSelectedCategory] = React.useState<string>("all")

  const categories = [
    { id: "all", label: "All Guides", icon: BookOpen },
    { id: "appearance", label: "Appearance & Storefront", icon: Palette },
    { id: "staff", label: "Staff & Branches", icon: Users },
    { id: "inventory", label: "EV Bikes & GRN", icon: Bike },
    { id: "sales", label: "Sales & POS Terminal", icon: ShoppingCart },
  ]

  const guideSections = [
    {
      id: "appearance",
      title: "Getting Started: Storefront Appearance & Branding",
      icon: Palette,
      badge: "Onboarding",
      badgeColor: "bg-primary/10 text-primary border-primary/20",
      description: "Customize your customer-facing digital showroom, header branding, tagline, and theme accents.",
      actionLink: "/dashboard/settings/appearance",
      actionText: "Configure Storefront",
      faqs: [
        {
          question: "How do I customize my dealership storefront branding and theme colors?",
          answer: (
            <div className="space-y-3 text-xs leading-relaxed">
              <p>
                As an <strong>OrgAdmin</strong>, you can personalize the public-facing storefront website that your customers see when visiting your custom domain or subdomain (e.g. <code>apex.evsalepos.com</code>).
              </p>
              <div className="p-3 rounded-lg bg-muted/50 border space-y-2">
                <p className="font-semibold text-foreground">Step-by-Step Instructions:</p>
                <ol className="list-decimal list-inside space-y-1.5 text-muted-foreground">
                  <li>
                    Navigate to <strong className="text-foreground">Settings &rarr; Appearance</strong> from your dashboard sidebar.
                  </li>
                  <li>
                    <strong className="text-foreground">Brand Identity:</strong> Update your official Dealership Trade Name and upload your high-resolution PNG/SVG showroom logo.
                  </li>
                  <li>
                    <strong className="text-foreground">Hero Banner & Tagline:</strong> Enter an engaging headline (e.g. <em>"Premier Eco-Friendly Urban Electric Scooters"</em>) and showroom promotional message.
                  </li>
                  <li>
                    <strong className="text-foreground">Brand Colors:</strong> Select an electric accent theme (Electric Cyan, Emerald Green, Royal Indigo, or Sleek Slate) to tint your storefront buttons and badges.
                  </li>
                  <li>
                    Click <strong className="text-foreground">Save Appearance Settings</strong>. Your changes immediately update your live showroom!
                  </li>
                </ol>
              </div>
              <div className="flex items-center gap-2 p-2 rounded-md bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400">
                <Sparkles className="size-4 shrink-0" />
                <span>
                  <strong>Pro Tip:</strong> Your public storefront automatically pulls in-stock EV bikes, pricing, and branch phone numbers without needing manual HTML edits.
                </span>
              </div>
            </div>
          ),
        },
        {
          question: "Where can I view my live public dealership showroom?",
          answer: (
            <div className="space-y-2 text-xs leading-relaxed">
              <p>
                Each registered dealership has an isolated storefront route mapped to their unique subdomain or domain name.
              </p>
              <p className="text-muted-foreground">
                You can access it by going to <code>/site/[your-subdomain]</code> or by testing the public homepage at <code>/</code>. Customers can browse available electric bikes, filter by brand, review motor and battery capacities, and submit purchase inquiries directly.
              </p>
            </div>
          ),
        },
      ],
    },
    {
      id: "staff",
      title: "Managing Staff Logins, Roles & Multi-Branch Network",
      icon: Users,
      badge: "Administration",
      badgeColor: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
      description: "Provision employee logins with Role-Based Access Control (RBAC) and manage showrooms & service centers.",
      actionLink: "/dashboard/settings/users",
      actionText: "Manage Staff",
      faqs: [
        {
          question: "How do I create logins for Cashiers, Sales Representatives, and Branch Managers?",
          answer: (
            <div className="space-y-3 text-xs leading-relaxed">
              <p>
                Dealership Owners (<code>OrgAdmin</code>) have exclusive access to manage staff accounts and enforce strict Role-Based Access Control (RBAC).
              </p>
              <div className="p-3 rounded-lg bg-muted/50 border space-y-2">
                <p className="font-semibold text-foreground">How to Add a New Staff Member:</p>
                <ol className="list-decimal list-inside space-y-1.5 text-muted-foreground">
                  <li>
                    Click <strong className="text-foreground">Settings (Staff)</strong> in the dashboard sidebar (accessible only to <code>OrgAdmin</code>).
                  </li>
                  <li>
                    Click the <strong className="text-foreground">+ Add New Staff</strong> button in the top right.
                  </li>
                  <li>
                    Fill in the member's <strong>Full Name</strong>, <strong>Work Email</strong>, and secure <strong>Password</strong> (minimum 6 characters).
                  </li>
                  <li>
                    <strong className="text-foreground">Select System Role:</strong>
                    <ul className="list-disc list-inside pl-4 mt-1 space-y-1">
                      <li><strong>Branch Manager:</strong> Full operational control over inventory, sales, and service records for their assigned branch.</li>
                      <li><strong>Sales Rep:</strong> Can browse stock, create customer records, and generate new POS sales & lease quotes.</li>
                      <li><strong>Cashier:</strong> Fast POS terminal checkout, invoice printing, and payment collection.</li>
                      <li><strong>Technician:</strong> Maintenance logging, battery serial inspection, and DMT service job cards.</li>
                    </ul>
                  </li>
                  <li>
                    Assign the staff member to their designated <strong>Branch Showroom</strong> and click <strong>Create Staff Account</strong>.
                  </li>
                </ol>
              </div>
              <p className="text-muted-foreground">
                The new user can immediately sign in at <code>/login</code> with their credentials.
              </p>
            </div>
          ),
        },
        {
          question: "How do I add and manage multiple showroom or warehouse branches?",
          answer: (
            <div className="space-y-3 text-xs leading-relaxed">
              <p>
                Ev Sale Pos supports true multi-branch dealership networks. You can track inventory quantities separately per showroom branch while maintaining centralized financial reporting.
              </p>
              <div className="p-3 rounded-lg bg-muted/50 border space-y-2">
                <p className="font-semibold text-foreground">Adding a Branch:</p>
                <ol className="list-decimal list-inside space-y-1.5 text-muted-foreground">
                  <li>Go to <strong className="text-foreground">Branches</strong> (or <strong className="text-foreground">Settings &rarr; Branches</strong>).</li>
                  <li>Click <strong className="text-foreground">+ Add New Branch</strong>.</li>
                  <li>Enter the <strong>Branch Name</strong> (e.g. <em>Colombo Flagship Showroom</em>, <em>Kandy Service Center</em>), address location, and official contact phone.</li>
                  <li>Click <strong>Save Branch</strong>. Physical bike stock and employee assignments can now be linked directly to this branch.</li>
                </ol>
              </div>
            </div>
          ),
        },
      ],
    },
    {
      id: "inventory",
      title: "Adding EV Bikes & Goods Received Notes (GRN)",
      icon: Bike,
      badge: "Inventory & Stock",
      badgeColor: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
      description: "Define bike models with motor/battery specs, upload imagery, and intake physical stock via GRN.",
      actionLink: "/dashboard/inventory",
      actionText: "Open Inventory",
      faqs: [
        {
          question: "How do I add a new EV Bike Model with Motor Power, Battery Capacity, and Range?",
          answer: (
            <div className="space-y-3 text-xs leading-relaxed">
              <p>
                Before intaking physical bikes into stock, you define the <strong>EV Bike Model</strong> in your catalog. This ensures consistent specifications across all physical units:
              </p>
              <div className="p-3 rounded-lg bg-muted/50 border space-y-2">
                <p className="font-semibold text-foreground">Catalog Setup Steps:</p>
                <ol className="list-decimal list-inside space-y-1.5 text-muted-foreground">
                  <li>Navigate to <strong className="text-foreground">EV Bikes (GRN & Stock)</strong> &rarr; select the <strong className="text-foreground">EV Bike Models</strong> tab.</li>
                  <li>Click <strong className="text-foreground">+ Add EV Bike Model</strong>.</li>
                  <li>Enter the <strong>Brand / Make</strong> (e.g., <em>Volt Motors</em>, <em>Super Soco</em>) and <strong>Model Name</strong> (e.g., <em>Apex 2000W Scooter</em>).</li>
                  <li>Provide an optional <strong>Image URL</strong> (URL to a clean side-profile photo of the bike).</li>
                  <li>
                    Fill in the core EV specifications:
                    <ul className="list-disc list-inside pl-4 mt-1 space-y-0.5">
                      <li><strong>Motor Power:</strong> e.g., <code>2000W BLDC Hub Motor</code></li>
                      <li><strong>Battery Capacity:</strong> e.g., <code>60V 32Ah Lithium-ion</code></li>
                      <li><strong>Range per Charge:</strong> e.g., <code>120km Eco Mode</code></li>
                      <li><strong>Top Speed:</strong> e.g., <code>55 km/h</code></li>
                      <li><strong>Charging Time:</strong> e.g., <code>4-6 Hours Smart Charger</code></li>
                    </ul>
                  </li>
                  <li>Set the <strong>Default Retail Cash Price</strong> and <strong>Minimum Down Payment</strong>.</li>
                  <li>Click <strong>Save Model</strong>.</li>
                </ol>
              </div>
              <p className="text-muted-foreground">
                Once saved, this model is instantly available for Goods Received Notes (GRN) and featured on your public showroom cards.
              </p>
            </div>
          ),
        },
        {
          question: "How do I intake physical bikes with chassis/VIN and battery serials using a GRN?",
          answer: (
            <div className="space-y-3 text-xs leading-relaxed">
              <p>
                Every physical electric bike in your showroom has a unique chassis frame number and motor/battery serial. In Ev Sale Pos, you intake them using a <strong>Goods Received Note (GRN)</strong>:
              </p>
              <div className="p-3 rounded-lg bg-muted/50 border space-y-2">
                <p className="font-semibold text-foreground">Intake Workflow:</p>
                <ol className="list-decimal list-inside space-y-1.5 text-muted-foreground">
                  <li>In <strong className="text-foreground">EV Bikes (GRN & Stock)</strong>, click <strong className="text-foreground">Create GRN (Intake Stock)</strong>.</li>
                  <li>Select the <strong>Supplier</strong> and destination <strong>Branch Showroom</strong>.</li>
                  <li>Enter the supplier invoice / GRN reference number.</li>
                  <li>
                    Add items: For each physical bike arriving on the shipment:
                    <ul className="list-disc list-inside pl-4 mt-1 space-y-0.5">
                      <li>Select the <strong>Bike Model</strong>.</li>
                      <li>Type or scan the <strong>Chassis Number (VIN)</strong>.</li>
                      <li>Enter the <strong>Electric Motor Number</strong>.</li>
                      <li>Enter the <strong>Battery Pack Serial Number</strong>.</li>
                      <li>Select the bike color and enter the procurement unit cost.</li>
                    </ul>
                  </li>
                  <li>Click <strong>Submit GRN & Intake Units</strong>.</li>
                </ol>
              </div>
              <p className="text-muted-foreground">
                The bikes will immediately appear in your <strong>Stock Tab</strong> with status <code>InStock</code> and be displayed on your public storefront for customer discovery.
              </p>
            </div>
          ),
        },
      ],
    },
    {
      id: "sales",
      title: "Making a Sale & Automated Stock Synchronization",
      icon: ShoppingCart,
      badge: "POS & Checkout",
      badgeColor: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
      description: "Process cash, card, and bank lease transactions with instant VIN allocation and invoice generation.",
      actionLink: "/dashboard/sales",
      actionText: "New POS Sale",
      faqs: [
        {
          question: "How do I process a sale, and how does stock synchronization work?",
          answer: (
            <div className="space-y-3 text-xs leading-relaxed">
              <p>
                When a customer buys an EV bike in your showroom, follow the fast 4-step POS checkout:
              </p>
              <div className="p-3 rounded-lg bg-muted/50 border space-y-2">
                <p className="font-semibold text-foreground">POS Sale Procedure:</p>
                <ol className="list-decimal list-inside space-y-1.5 text-muted-foreground">
                  <li>Navigate to <strong className="text-foreground">Sales (Cash & Lease)</strong> &rarr; click <strong className="text-foreground">New Sale / POS</strong>.</li>
                  <li>
                    <strong className="text-foreground">Step 1 (Select Sold Bike):</strong> Choose an available in-stock bike by searching chassis number, model, or color.
                  </li>
                  <li>
                    <strong className="text-foreground">Step 2 (Customer Dossier):</strong> Search an existing customer by phone/NIC or enter details for a new customer.
                  </li>
                  <li>
                    <strong className="text-foreground">Step 3 (Payment & Lease Calculation):</strong> Select payment method (<em>Cash, Card, Bank Transfer, or Finance/Lease</em>). If financed, enter the bank partner and approved down payment.
                  </li>
                  <li>
                    <strong className="text-foreground">Step 4 (Finalize & Print):</strong> Click <strong>Finalize Sale & Generate Invoice</strong>.
                  </li>
                </ol>
              </div>
              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 space-y-1">
                <div className="flex items-center gap-2 font-semibold">
                  <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
                  <span>Automated Stock Synchronization:</span>
                </div>
                <p className="pl-6 text-[11px] leading-relaxed">
                  Upon completion, the system automatically changes the vehicle's status to <code>Sold</code>. It is immediately removed from the active stock count and disappears from the public storefront so other buyers cannot purchase or reserve the same chassis!
                </p>
              </div>
            </div>
          ),
        },
        {
          question: "How do I print the Vehicle Sale Invoice and Delivery Handover Note?",
          answer: (
            <div className="space-y-2 text-xs leading-relaxed">
              <p>
                After finalizing a sale, you can immediately click <strong>Print Tax Invoice</strong> or <strong>Print Delivery Note</strong>.
              </p>
              <p className="text-muted-foreground">
                The invoice includes official business tax details, itemized bike chassis and motor specs, warranty periods, and customer signature handoff fields formatted perfectly for <code>Ctrl + P</code> thermal or A4 printing.
              </p>
            </div>
          ),
        },
      ],
    },
  ]

  const filteredSections = guideSections
    .filter((sec) => selectedCategory === "all" || sec.id === selectedCategory)
    .filter((sec) => {
      if (!searchQuery.trim()) return true
      const q = searchQuery.toLowerCase()
      const matchTitle = sec.title.toLowerCase().includes(q)
      const matchDesc = sec.description.toLowerCase().includes(q)
      const matchFaqs = sec.faqs.some(
        (f) =>
          f.question.toLowerCase().includes(q)
      )
      return matchTitle || matchDesc || matchFaqs
    })

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      {/* Top Header Banner */}
      <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-card via-card/90 to-primary/5 p-6 sm:p-8 shadow-xs">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 size-48 rounded-full bg-primary/10 blur-3xl pointer-events-none" />

        <div className="max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border bg-muted/60 text-xs font-semibold text-foreground">
            <HelpCircle className="size-3.5 text-primary" />
            <span>Interactive Dealership Knowledge Base</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            Help Center & Operational Guide
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            Welcome to the comprehensive onboarding documentation for <strong className="text-foreground">{organizationName}</strong>. Learn how to configure your storefront, manage staff roles, intake EV bike inventory, and process seamless POS checkout.
          </p>

          {/* Search Bar */}
          <div className="relative pt-2 max-w-md">
            <Search className="absolute left-3 top-4.5 size-4 text-muted-foreground pointer-events-none" />
            <Input
              type="text"
              placeholder="Search guides, setup questions, GRN, sales..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-10 bg-background/80 text-xs shadow-xs"
            />
          </div>
        </div>
      </div>

      {/* Category Filter Pills */}
      <div className="flex flex-wrap items-center gap-2">
        {categories.map((cat) => {
          const Icon = cat.icon
          const isActive = selectedCategory === cat.id
          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`h-9 px-3.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                isActive
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-card border border-border/70 text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              <Icon className="size-3.5" />
              <span>{cat.label}</span>
            </button>
          )
        })}
      </div>

      {/* 4 Quick Start Navigation Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {guideSections.map((sec) => {
          const Icon = sec.icon
          return (
            <Card
              key={sec.id}
              className="border border-border/80 hover:border-primary/40 hover:shadow-md transition-all flex flex-col justify-between group cursor-pointer"
              onClick={() => setSelectedCategory(sec.id)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="size-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Icon className="size-4.5" />
                  </div>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${sec.badgeColor}`}>
                    {sec.badge}
                  </span>
                </div>
                <CardTitle className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                  {sec.title.split(":")[1]?.trim() || sec.title}
                </CardTitle>
                <CardDescription className="text-[11px] line-clamp-2">
                  {sec.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <Link
                  href={sec.actionLink}
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-primary hover:underline"
                >
                  <span>{sec.actionText}</span>
                  <ArrowRight className="size-3" />
                </Link>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Accordion FAQ & Step-by-Step Sections */}
      <div className="space-y-6">
        <div className="flex items-center justify-between pb-2 border-b">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-foreground">
              Detailed Workflows & Setup Guides
            </h2>
            <p className="text-xs text-muted-foreground">
              Click on any guide below to expand step-by-step procedures and operational tips.
            </p>
          </div>
          <span className="text-xs text-muted-foreground font-mono">
            {filteredSections.reduce((acc, s) => acc + s.faqs.length, 0)} Topics
          </span>
        </div>

        {filteredSections.length === 0 ? (
          <div className="p-12 text-center rounded-2xl border border-dashed bg-card/40">
            <HelpCircle className="size-10 text-muted-foreground mx-auto mb-2 opacity-50" />
            <h3 className="text-sm font-semibold text-foreground">No documentation found</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Try searching with a different keyword or select "All Guides".
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchQuery("")
                setSelectedCategory("all")
              }}
              className="mt-4 text-xs h-8"
            >
              Reset Filters
            </Button>
          </div>
        ) : (
          filteredSections.map((sec) => {
            const Icon = sec.icon
            return (
              <Card key={sec.id} className="border border-border/80 shadow-xs overflow-hidden">
                <CardHeader className="bg-muted/20 border-b pb-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="size-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <Icon className="size-4.5" />
                      </div>
                      <div>
                        <CardTitle className="text-base font-bold text-foreground">
                          {sec.title}
                        </CardTitle>
                        <CardDescription className="text-xs">
                          {sec.description}
                        </CardDescription>
                      </div>
                    </div>

                    <Link href={sec.actionLink}>
                      <Button size="sm" variant="outline" className="text-xs h-8 gap-1.5 shrink-0">
                        <span>{sec.actionText}</span>
                        <ExternalLink className="size-3 text-muted-foreground" />
                      </Button>
                    </Link>
                  </div>
                </CardHeader>

                <CardContent className="p-4 sm:p-6">
                  <Accordion type="multiple" className="w-full">
                    {sec.faqs.map((faq, idx) => (
                      <AccordionItem key={idx} value={`item-${sec.id}-${idx}`}>
                        <AccordionTrigger className="hover:no-underline font-semibold text-sm text-foreground">
                          <span className="flex items-center gap-2">
                            <span className="flex size-5 items-center justify-center rounded-full bg-primary/10 text-primary text-[10px] font-bold">
                              {idx + 1}
                            </span>
                            {faq.question}
                          </span>
                        </AccordionTrigger>
                        <AccordionContent className="pt-2 pl-7 pr-2 text-xs">
                          {faq.answer}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>

      {/* Support & Assistance Card */}
      <Card className="border border-border/80 bg-gradient-to-r from-card via-muted/20 to-card p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="size-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <ShieldCheck className="size-6" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-foreground">
                Need Advanced Technical Assistance or ERP Integration?
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Our platform engineers provide dedicated onboarding assistance and custom API integration for high-volume dealerships.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Link href="/dashboard/settings/users">
              <Button variant="outline" size="sm" className="text-xs h-8">
                Staff Permissions
              </Button>
            </Link>
            <Link href="/dashboard/sales">
              <Button size="sm" className="text-xs h-8 bg-primary text-primary-foreground font-semibold">
                Launch POS Terminal
              </Button>
            </Link>
          </div>
        </div>
      </Card>
    </div>
  )
}
