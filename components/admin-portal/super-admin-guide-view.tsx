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
import {
  ShieldCheck,
  Building2,
  Globe,
  UserCheck,
  ArrowLeft,
  CheckCircle2,
  Sparkles,
  ExternalLink,
  Layers,
  Key,
  HelpCircle,
  AlertTriangle,
  Server,
  Lock,
} from "lucide-react"

export function SuperAdminGuideView() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top Header */}
      <header className="sticky top-0 z-40 border-b bg-card/85 backdrop-blur-md px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-xl bg-primary text-white shadow-md shadow-primary/20">
            <ShieldCheck className="size-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-extrabold tracking-tight text-foreground">
                Ev Sale Pos • Super Admin Knowledge Base
              </span>
              <Badge
                variant="outline"
                className="bg-primary/10 text-primary border-primary/30 text-[10px] font-bold"
              >
                Platform Guide
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Tenant Provisioning, Subdomain Routing & OrgAdmin Management Guide
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Link href="/admin-portal">
            <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs font-semibold">
              <ArrowLeft className="size-3.5" />
              <span>Platform Console</span>
            </Button>
          </Link>
          <Link href="/dashboard">
            <Button size="sm" className="h-8 gap-1.5 text-xs bg-primary text-primary-foreground font-semibold">
              <span>Dealership ERP</span>
            </Button>
          </Link>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-6 sm:p-8 space-y-8">
        {/* Hero Section */}
        <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-card via-card/90 to-purple-500/10 p-6 sm:p-8 shadow-xs">
          <div className="max-w-2xl space-y-2.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border bg-muted/60 text-xs font-semibold text-foreground">
              <Sparkles className="size-3.5 text-primary" />
              <span>Super Admin Operations Manual</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              Tenant Provisioning & Organization Management Guide
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              This guide instructs Platform Administrators on how to register new electric bike dealerships, configure isolated subdomains and domains, provision primary <code>OrgAdmin</code> user credentials, and monitor platform health.
            </p>
          </div>
        </div>

        {/* 3 Core Workflow Pillars */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border border-primary/20 bg-card/60 shadow-xs flex flex-col justify-between">
            <CardHeader className="pb-3">
              <div className="size-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-2">
                <Building2 className="size-4.5" />
              </div>
              <CardTitle className="text-sm font-bold text-foreground">
                1. Tenant Onboarding
              </CardTitle>
              <CardDescription className="text-xs">
                Register corporate dealership entity, set trade name, contact phone, and subscription tier.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border border-blue-500/20 bg-card/60 shadow-xs flex flex-col justify-between">
            <CardHeader className="pb-3">
              <div className="size-9 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-2">
                <Globe className="size-4.5" />
              </div>
              <CardTitle className="text-sm font-bold text-foreground">
                2. Subdomain & Domain Routing
              </CardTitle>
              <CardDescription className="text-xs">
                Allocate slug-based subdomains and custom domains for instant white-label public showrooms.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border border-emerald-500/20 bg-card/60 shadow-xs flex flex-col justify-between">
            <CardHeader className="pb-3">
              <div className="size-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-2">
                <Key className="size-4.5" />
              </div>
              <CardTitle className="text-sm font-bold text-foreground">
                3. OrgAdmin Provisioning
              </CardTitle>
              <CardDescription className="text-xs">
                Generate bcrypt-hashed owner credentials with complete administrative authority over the tenant.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* Detailed Accordion Workflows */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold tracking-tight text-foreground pb-2 border-b">
            Platform Operational Procedures
          </h2>

          <Accordion type="multiple" className="w-full space-y-3">
            {/* Procedure 1: Registering a Dealership */}
            <AccordionItem value="item-register" className="border border-border/80 rounded-xl px-4 bg-card/60 shadow-xs">
              <AccordionTrigger className="hover:no-underline font-bold text-sm text-foreground py-4">
                <span className="flex items-center gap-2.5">
                  <span className="flex size-6 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">
                    1
                  </span>
                  How to Register a New Dealership Organization
                </span>
              </AccordionTrigger>
              <AccordionContent className="pt-2 pb-4 text-xs space-y-3 leading-relaxed">
                <p>
                  To onboard a new EV bike dealership into the platform, navigate to the <strong>Super Admin Console</strong> (<code>/admin-portal</code> or <code>/super-admin</code>):
                </p>
                <div className="p-3.5 rounded-lg bg-muted/40 border space-y-2">
                  <p className="font-semibold text-foreground">Step-by-Step Instructions:</p>
                  <ol className="list-decimal list-inside space-y-1.5 text-muted-foreground">
                    <li>Open the <strong className="text-foreground">+ Onboard New Dealership</strong> dialog.</li>
                    <li>
                      <strong className="text-foreground">Business Name:</strong> Enter the official registered corporate entity name (e.g., <em>Apex EV Motors Ltd</em>).
                    </li>
                    <li>
                      <strong className="text-foreground">Subscription Plan:</strong> Select the contracted tier:
                      <ul className="list-disc list-inside pl-4 mt-1 space-y-0.5">
                        <li><strong>Free:</strong> Evaluation tier with single branch limit.</li>
                        <li><strong>Basic:</strong> Standard dealership with up to 2 branches.</li>
                        <li><strong>Pro:</strong> High-volume multi-branch with unlimited inventory.</li>
                        <li><strong>Enterprise:</strong> Dedicated support, white-label domain routing, and priority SLA.</li>
                      </ul>
                    </li>
                    <li>
                      <strong className="text-foreground">Primary Showroom Branch:</strong> Enter the initial showroom branch name (e.g., <em>Colombo Central Showroom</em>) and location.
                    </li>
                    <li>Click <strong>Register Dealership</strong>. The system generates an isolated <code>Organization</code> record with unique UUID.</li>
                  </ol>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Procedure 2: Subdomain Allocation */}
            <AccordionItem value="item-subdomain" className="border border-border/80 rounded-xl px-4 bg-card/60 shadow-xs">
              <AccordionTrigger className="hover:no-underline font-bold text-sm text-foreground py-4">
                <span className="flex items-center gap-2.5">
                  <span className="flex size-6 items-center justify-center rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-bold">
                    2
                  </span>
                  Assigning Subdomains & Custom Domain Routing
                </span>
              </AccordionTrigger>
              <AccordionContent className="pt-2 pb-4 text-xs space-y-3 leading-relaxed">
                <p>
                  Each dealership enjoys a branded public storefront website where customers view real-time EV bike inventory, motor power, and battery capacities.
                </p>
                <div className="p-3.5 rounded-lg bg-muted/40 border space-y-2">
                  <p className="font-semibold text-foreground">Routing Rules & Best Practices:</p>
                  <ul className="list-disc list-inside space-y-1.5 text-muted-foreground">
                    <li>
                      <strong className="text-foreground">Subdomain:</strong> Provide a unique URL-safe alphanumeric slug (e.g. <code>apex</code> or <code>metro-bikes</code>). The public showroom will be accessible at <code>[subdomain].evsalepos.com</code> or <code>/site/[subdomain]</code>.
                    </li>
                    <li>
                      <strong className="text-foreground">Custom Domain:</strong> For Enterprise clients with their own domain name (e.g. <code>apexev.com</code>), set the Custom Domain field. Point their DNS CNAME or A Record to your platform IP.
                    </li>
                    <li>
                      <strong className="text-foreground">Next.js Host Proxy:</strong> The platform proxy middleware inspects incoming host headers, strips the subdomain, and dynamically queries the database for the matching tenant in under 5ms.
                    </li>
                  </ul>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Procedure 3: Creating OrgAdmin User */}
            <AccordionItem value="item-orgadmin" className="border border-border/80 rounded-xl px-4 bg-card/60 shadow-xs">
              <AccordionTrigger className="hover:no-underline font-bold text-sm text-foreground py-4">
                <span className="flex items-center gap-2.5">
                  <span className="flex size-6 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
                    3
                  </span>
                  Creating the Initial OrgAdmin Account
                </span>
              </AccordionTrigger>
              <AccordionContent className="pt-2 pb-4 text-xs space-y-3 leading-relaxed">
                <p>
                  Every dealership requires a primary administrator (Dealership Owner) who possesses total authority over their branch staff, inventory, and POS:
                </p>
                <div className="p-3.5 rounded-lg bg-muted/40 border space-y-2">
                  <p className="font-semibold text-foreground">Credentials Setup:</p>
                  <ol className="list-decimal list-inside space-y-1.5 text-muted-foreground">
                    <li>During tenant creation, specify the <strong>Admin Contact Name</strong> and corporate <strong>Admin Email Address</strong> (e.g., <code>owner@apexev.com</code>).</li>
                    <li>Enter a temporary secure password (or default initial password <code>password123</code>).</li>
                    <li>The system hashes the password with <strong>bcrypt (10 rounds)</strong> and assigns the role <code>UserRole.OrgAdmin</code> linked to the new <code>organizationId</code>.</li>
                    <li>Deliver the login URL (<code>/login</code>) and credentials to the Dealership Owner.</li>
                  </ol>
                </div>
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300">
                  <Lock className="size-4 shrink-0" />
                  <span>
                    <strong>Security Isolation Note:</strong> The <code>OrgAdmin</code> cannot view other dealerships or access the Super Admin control plane. All queries executed by the OrgAdmin are strictly tenant-isolated at the SQL database layer.
                  </span>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Procedure 4: Tenant Suspension & Status Management */}
            <AccordionItem value="item-status" className="border border-border/80 rounded-xl px-4 bg-card/60 shadow-xs">
              <AccordionTrigger className="hover:no-underline font-bold text-sm text-foreground py-4">
                <span className="flex items-center gap-2.5">
                  <span className="flex size-6 items-center justify-center rounded-full bg-slate-500/10 text-slate-600 dark:text-slate-400 text-xs font-bold">
                    4
                  </span>
                  Subscription Lifecycle & Tenant Suspension Controls
                </span>
              </AccordionTrigger>
              <AccordionContent className="pt-2 pb-4 text-xs space-y-3 leading-relaxed">
                <p>
                  Super Admins can toggle any dealership's status between <strong>Active</strong> and <strong>Suspended</strong>:
                </p>
                <ul className="list-disc list-inside space-y-1.5 text-muted-foreground">
                  <li>
                    <strong className="text-foreground">Active:</strong> Showroom website is live; staff can create sales, print job cards, and manage stock.
                  </li>
                  <li>
                    <strong className="text-foreground">Suspended:</strong> When an account is overdue or inactive, the public showroom automatically renders a courteous suspension message (<em>"Showroom Access Temporarily Suspended"</em>), and dashboard access is restricted.
                  </li>
                  <li>
                    To reinstate, simply toggle the tenant status back to <strong>Active</strong> in the Super Admin table.
                  </li>
                </ul>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>

        {/* Quick Links Card */}
        <Card className="border border-border/80 bg-muted/30 p-5">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h4 className="text-sm font-bold text-foreground">Ready to provision a new tenant?</h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                Head back to the platform console to register a dealership or inspect system telemetry.
              </p>
            </div>
            <Link href="/admin-portal">
              <Button size="sm" className="h-8 text-xs bg-primary hover:bg-purple-700 text-white font-semibold">
                Open Super Admin Console
              </Button>
            </Link>
          </div>
        </Card>
      </main>
    </div>
  )
}
