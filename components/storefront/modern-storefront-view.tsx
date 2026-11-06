"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import {
  ArrowDown,
  ArrowRight,
  BatteryCharging,
  Download,
  MapPin,
  Menu,
  MessageCircle,
  Phone,
  ShieldCheck,
  Sparkles,
  X,
  Zap,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { StockGrid, StockModelItem, officialAtherImages } from "@/components/storefront/stock-grid"

interface BranchItem {
  name: string
  location?: string | null
  contactNumber?: string | null
}

interface ModernStorefrontViewProps {
  dealershipName: string
  domain: string
  subdomain?: string | null
  logoUrl?: string | null
  phone?: string | null
  branches: BranchItem[]
  stockModels: StockModelItem[]
}

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

export function ModernStorefrontView({
  dealershipName,
  domain,
  subdomain,
  logoUrl,
  phone,
  branches,
  stockModels,
}: ModernStorefrontViewProps) {
  const [installPrompt, setInstallPrompt] = React.useState<InstallPromptEvent | null>(null)
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false)
  const primaryBranch = branches[0]
  const displayPhone = phone || primaryBranch?.contactNumber || null
  const cleanPhone = displayPhone?.replace(/[^\d]/g, "")
  const featuredModel = stockModels[0]
  const featuredImage = featuredModel ? officialAtherImages[featuredModel.modelName] : null

  React.useEffect(() => {
    const handleBeforeInstall = (event: Event) => {
      event.preventDefault()
      setInstallPrompt(event as InstallPromptEvent)
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstall)

    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstall)
  }, [])

  const handleInstallClick = async () => {
    if (!installPrompt) return
    await installPrompt.prompt()
    const { outcome } = await installPrompt.userChoice
    if (outcome === "accepted") {
      setInstallPrompt(null)
    }
  }

  const closeMobileMenu = () => setMobileMenuOpen(false)

  return (
    <div
      className="showroom min-h-screen overflow-x-clip bg-[#f7f8f6] text-[#17221f]"
      data-showroom-domain={subdomain || domain}
    >
      <div className="showroom-announcement flex min-h-9 items-center justify-center gap-2 bg-[#183a34] px-4 py-2 text-center text-[11px] font-medium tracking-wide text-white sm:text-xs">
        <Sparkles className="size-3.5 text-[#b8d7c6]" />
        <span>Discover the Ather electric scooter range, available at {dealershipName}</span>
      </div>

      <header className="sticky top-0 z-40 border-b border-black/[0.07] bg-[#f7f8f6]/95 backdrop-blur-xl">
        <div className="mx-auto flex h-[4.5rem] max-w-[1440px] items-center justify-between gap-4 px-4 sm:px-7 lg:px-10">
          <Link href="/" className="flex min-w-0 items-center gap-3" aria-label={`${dealershipName} home`}>
            {logoUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={logoUrl} alt="" className="size-9 shrink-0 rounded-lg object-contain" />
            ) : (
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#183a34] text-white">
                <Zap className="size-4" />
              </span>
            )}
            <span className="truncate text-sm font-semibold tracking-tight sm:text-base">{dealershipName}</span>
          </Link>

          <nav aria-label="Main navigation" className="hidden items-center gap-8 text-sm font-medium text-[#52615b] lg:flex">
            <a className="transition-colors hover:text-[#183a34]" href="#models">The range</a>
            <a className="transition-colors hover:text-[#183a34]" href="#experience">The experience</a>
            <a className="transition-colors hover:text-[#183a34]" href="#showrooms">Showrooms</a>
          </nav>

          <div className="hidden items-center gap-2 lg:flex">
            {installPrompt && (
              <Button variant="ghost" size="sm" onClick={handleInstallClick} className="h-10 rounded-full px-3 text-xs">
                <Download className="mr-1.5 size-4" />
                Install
              </Button>
            )}
            {cleanPhone && (
              <a
                className="inline-flex h-10 items-center justify-center rounded-full border border-[#183a34]/20 px-4 text-sm font-medium text-[#183a34] transition-colors hover:bg-[#eaf0ec]"
                href={`https://wa.me/${cleanPhone}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <MessageCircle className="mr-2 size-4" />
                WhatsApp
              </a>
            )}
            <Link
              href="#models"
              className="inline-flex h-10 items-center justify-center rounded-full bg-[#183a34] px-5 text-sm font-medium text-white transition-colors hover:bg-[#24544a]"
            >
              Explore models
              <ArrowRight className="ml-2 size-4" />
            </Link>
          </div>

          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label={mobileMenuOpen ? "Close navigation" : "Open navigation"}
            aria-expanded={mobileMenuOpen}
            className="size-10 shrink-0 rounded-full lg:hidden"
            onClick={() => setMobileMenuOpen((open) => !open)}
          >
            {mobileMenuOpen ? <X className="size-4" /> : <Menu className="size-4" />}
          </Button>
        </div>

        {mobileMenuOpen && (
          <nav aria-label="Mobile navigation" className="border-t border-black/[0.07] bg-[#f7f8f6] px-4 py-3 lg:hidden">
            <div className="mx-auto flex max-w-[1440px] flex-col gap-1">
              <a onClick={closeMobileMenu} className="rounded-lg px-3 py-3 text-sm font-medium hover:bg-black/[0.04]" href="#models">The range</a>
              <a onClick={closeMobileMenu} className="rounded-lg px-3 py-3 text-sm font-medium hover:bg-black/[0.04]" href="#experience">The experience</a>
              <a onClick={closeMobileMenu} className="rounded-lg px-3 py-3 text-sm font-medium hover:bg-black/[0.04]" href="#showrooms">Showrooms</a>
              {cleanPhone && (
                <a
                  className="mt-1 flex min-h-11 items-center gap-2 rounded-lg bg-[#183a34] px-3 text-sm font-medium text-white"
                  href={`https://wa.me/${cleanPhone}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <MessageCircle className="size-4" />
                  Chat on WhatsApp
                </a>
              )}
            </div>
          </nav>
        )}
      </header>

      <main>
        <section className="showroom-hero relative overflow-hidden border-b border-black/[0.06]">
          <div className="mx-auto grid min-h-[620px] max-w-[1440px] items-center gap-8 px-4 py-12 sm:px-7 sm:py-16 lg:grid-cols-[0.88fr_1.12fr] lg:gap-10 lg:px-10 lg:py-20">
            <div className="showroom-reveal relative z-10 max-w-2xl">
              <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#183a34]/15 bg-white/70 px-3.5 py-2 text-xs font-medium text-[#31584d]">
                <span className="size-1.5 rounded-full bg-[#4f806b]" />
                The Ather electric experience
              </p>
              <h1 className="max-w-[12ch] text-[clamp(2.8rem,6.6vw,5.75rem)] font-medium leading-[0.98] tracking-[-0.065em] text-[#17221f]">
                A better way to move.
              </h1>
              <p className="mt-6 max-w-lg text-base leading-7 text-[#596760] sm:text-lg sm:leading-8">
                Meet the Ather 450X and Rizta. Thoughtfully designed electric scooters, ready to explore at {dealershipName}.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="#models"
                  className="inline-flex h-12 items-center justify-center rounded-full bg-[#183a34] px-6 text-sm font-medium text-white transition-colors hover:bg-[#24544a]"
                >
                  View available models
                  <ArrowRight className="ml-2 size-4" />
                </Link>
                {cleanPhone && (
                  <a
                    className="inline-flex h-12 items-center justify-center rounded-full border border-[#183a34]/20 px-6 text-sm font-medium text-[#183a34] transition-colors hover:bg-white"
                    href={`https://wa.me/${cleanPhone}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <MessageCircle className="mr-2 size-4" />
                    Enquire on WhatsApp
                  </a>
                )}
              </div>
              <div className="mt-10 flex items-center gap-3 text-xs font-medium text-[#66726c]">
                <span className="flex size-8 items-center justify-center rounded-full bg-white text-[#31584d] shadow-sm">
                  <ShieldCheck className="size-4" />
                </span>
                New models · Live showroom availability
              </div>
            </div>

            {featuredImage ? (
              <div className="showroom-reveal relative mx-auto aspect-[1.13] w-full max-w-[690px] overflow-hidden rounded-[2rem] bg-[#e8eeea] sm:rounded-[2.5rem]">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_55%_45%,rgba(255,255,255,0.9),rgba(228,236,230,0.4)_56%,rgba(209,224,214,0.2))]" />
                <Image
                  src={featuredImage}
                  alt={`Official Ather ${featuredModel?.modelName} electric scooter`}
                  fill
                  preload
                  sizes="(max-width: 1024px) 100vw, 55vw"
                  className="object-contain p-6 sm:p-10"
                />
                <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between rounded-2xl border border-white/70 bg-white/75 p-4 backdrop-blur-md sm:bottom-6 sm:left-6 sm:right-6 sm:p-5">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#688176]">In the showroom</p>
                    <p className="mt-1 text-lg font-semibold tracking-tight sm:text-xl">Ather {featuredModel?.modelName}</p>
                  </div>
                  <span className="mb-0.5 flex items-center gap-1.5 text-xs font-medium text-[#3e715c]">
                    <span className="size-1.5 rounded-full bg-[#4f9a70]" />
                    {featuredModel?.inStockCount} available
                  </span>
                </div>
              </div>
            ) : (
              <div className="relative mx-auto flex aspect-[1.13] w-full max-w-[690px] flex-col justify-between overflow-hidden rounded-[2rem] bg-[#e8eeea] p-7 sm:rounded-[2.5rem] sm:p-10">
                <div className="absolute -right-20 -top-20 size-72 rounded-full bg-white/60 blur-3xl" />
                <div className="relative flex size-12 items-center justify-center rounded-2xl bg-white text-[#31584d] shadow-sm">
                  <Zap className="size-5" />
                </div>
                <div className="relative max-w-sm">
                  <p className="text-sm font-medium text-[#688176]">The Ather electric experience</p>
                  <p className="mt-2 text-3xl font-medium tracking-tight sm:text-4xl">Your next ride starts here.</p>
                  <p className="mt-3 text-sm leading-6 text-[#66726c]">
                    No Ather scooters are currently listed as available. Contact the showroom for current stock information.
                  </p>
                </div>
              </div>
            )}
          </div>
          <a
            href="#models"
            className="absolute bottom-5 left-1/2 hidden -translate-x-1/2 items-center gap-2 text-xs font-medium text-[#738078] transition hover:text-[#183a34] lg:flex"
          >
            Scroll to explore
            <ArrowDown className="size-3.5" />
          </a>
        </section>

        <section id="models" className="scroll-mt-24 py-16 sm:py-20 lg:py-24">
          <div className="mx-auto max-w-[1440px] px-4 sm:px-7 lg:px-10">
            <div className="mb-8 flex flex-col justify-between gap-4 sm:mb-10 sm:flex-row sm:items-end">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#628070]">The range</p>
                <h2 className="mt-3 text-3xl font-medium tracking-[-0.04em] sm:text-4xl">Find your Ather.</h2>
                <p className="mt-3 max-w-xl text-sm leading-6 text-[#69756e] sm:text-base">
                  Browse only the new Ather models currently available at this showroom.
                </p>
              </div>
              <p className="text-sm text-[#69756e]">
                {stockModels.reduce((total, model) => total + model.inStockCount, 0)} available across{" "}
                {stockModels.length} {stockModels.length === 1 ? "model" : "models"}
              </p>
            </div>
            <StockGrid models={stockModels} dealershipName={dealershipName} dealerPhone={displayPhone} />
          </div>
        </section>

        <section id="experience" className="scroll-mt-24 border-y border-black/[0.06] bg-[#edf1ed] py-16 sm:py-20">
          <div className="mx-auto grid max-w-[1440px] gap-10 px-4 sm:px-7 lg:grid-cols-[0.8fr_1.2fr] lg:items-center lg:gap-16 lg:px-10">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#628070]">Made for everyday</p>
              <h2 className="mt-3 max-w-md text-3xl font-medium leading-tight tracking-[-0.04em] sm:text-4xl">
                The little details make a big difference.
              </h2>
              <p className="mt-4 max-w-md text-sm leading-7 text-[#647169] sm:text-base">
                Explore the Ather range in person, compare the models and colours currently in stock, and speak with our team about a test ride.
              </p>
              {cleanPhone && (
                <a
                  className="mt-6 inline-flex h-11 items-center justify-center rounded-full bg-[#183a34] px-5 text-sm font-medium text-white transition-colors hover:bg-[#24544a]"
                  href={`tel:${displayPhone?.replace(/[^\d+]/g, "")}`}
                >
                  <Phone className="mr-2 size-4" />
                  Call the showroom
                </a>
              )}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <article className="rounded-2xl border border-black/[0.05] bg-white p-5 sm:p-6">
                <span className="flex size-10 items-center justify-center rounded-xl bg-[#e8f0ea] text-[#426f59]">
                  <BatteryCharging className="size-5" />
                </span>
                <h3 className="mt-5 font-semibold">Electric, by design</h3>
                <p className="mt-2 text-sm leading-6 text-[#69756e]">Explore each model’s published range and battery details in the live showroom listing.</p>
              </article>
              <article className="rounded-2xl border border-black/[0.05] bg-white p-5 sm:p-6 sm:translate-y-6">
                <span className="flex size-10 items-center justify-center rounded-xl bg-[#e8f0ea] text-[#426f59]">
                  <MapPin className="size-5" />
                </span>
                <h3 className="mt-5 font-semibold">A showroom near you</h3>
                <p className="mt-2 text-sm leading-6 text-[#69756e]">See the available colours and find the branches that have your preferred model in stock.</p>
              </article>
              <article className="rounded-2xl border border-black/[0.05] bg-white p-5 sm:p-6">
                <span className="flex size-10 items-center justify-center rounded-xl bg-[#e8f0ea] text-[#426f59]">
                  <ShieldCheck className="size-5" />
                </span>
                <h3 className="mt-5 font-semibold">A more informed choice</h3>
                <p className="mt-2 text-sm leading-6 text-[#69756e]">Compare current showroom pricing and ask our team for the details that matter to you.</p>
              </article>
              <article className="rounded-2xl border border-black/[0.05] bg-[#183a34] p-5 text-white sm:p-6 sm:translate-y-6">
                <span className="flex size-10 items-center justify-center rounded-xl bg-white/10 text-[#c5ddcd]">
                  <MessageCircle className="size-5" />
                </span>
                <h3 className="mt-5 font-semibold">A real conversation</h3>
                <p className="mt-2 text-sm leading-6 text-white/70">Ask about availability, arrange a visit, or book a test ride with the showroom team.</p>
              </article>
            </div>
          </div>
        </section>

        <section id="showrooms" className="scroll-mt-24 py-16 sm:py-20">
          <div className="mx-auto max-w-[1440px] px-4 sm:px-7 lg:px-10">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#628070]">Visit us</p>
                <h2 className="mt-3 text-3xl font-medium tracking-[-0.04em] sm:text-4xl">Find your showroom.</h2>
              </div>
              {cleanPhone && (
                <a className="inline-flex items-center gap-2 text-sm font-medium text-[#31584d] hover:text-[#183a34]" href={`tel:${displayPhone?.replace(/[^\d+]/g, "")}`}>
                  <Phone className="size-4" />
                  {displayPhone}
                </a>
              )}
            </div>
            {branches.length > 0 ? (
              <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {branches.map((branch) => (
                  <article key={branch.name} className="rounded-2xl border border-black/[0.07] bg-white p-5 sm:p-6">
                    <div className="flex size-10 items-center justify-center rounded-xl bg-[#e8f0ea] text-[#426f59]">
                      <MapPin className="size-5" />
                    </div>
                    <h3 className="mt-4 font-semibold">{branch.name}</h3>
                    {branch.location && <p className="mt-1 text-sm leading-6 text-[#69756e]">{branch.location}</p>}
                    {branch.contactNumber && (
                      <a className="mt-4 inline-flex min-h-10 items-center gap-2 text-sm font-medium text-[#31584d]" href={`tel:${branch.contactNumber.replace(/[^\d+]/g, "")}`}>
                        <Phone className="size-4" />
                        {branch.contactNumber}
                      </a>
                    )}
                  </article>
                ))}
              </div>
            ) : (
              <p className="mt-6 rounded-2xl border border-dashed border-black/15 bg-white/70 p-6 text-sm text-[#69756e]">
                Contact {dealershipName} to find your nearest showroom.
              </p>
            )}
          </div>
        </section>
      </main>

      <footer className="border-t border-black/[0.07] bg-[#edf1ed]">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-4 px-4 py-7 text-xs text-[#647169] sm:flex-row sm:items-center sm:justify-between sm:px-7 lg:px-10">
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-lg bg-[#183a34] text-white">
              <Zap className="size-3.5" />
            </span>
            <span className="font-medium text-[#263b33]">{dealershipName}</span>
            <span className="text-[#9aa49d]">·</span>
            <span>Official Ather imagery from Ather Energy</span>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <Link href="/login" className="font-medium transition-colors hover:text-[#183a34]">Dealer login</Link>
            <span>Powered by EV Sale POS</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
