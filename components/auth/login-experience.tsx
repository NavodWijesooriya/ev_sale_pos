import type { ReactNode, ElementType } from "react"
import Link from "next/link"
import { ArrowLeft, ArrowUpRight, BadgeCheck, Bike, Boxes, ChartNoAxesCombined, Zap } from "lucide-react"

interface LoginExperienceProps {
  children: ReactNode
  portal: "dealership" | "platform"
}

const portalContent = {
  dealership: {
    label: "Dealership workspace",
    panelTitle: "Your dealership,",
    panelAccent: "in motion.",
    panelDescription: "A clearer view of your sales, stock and customer relationships starts here.",
    formTitle: "Welcome back",
    formDescription: "Sign in with your work account to continue to your dealership workspace.",
    accessLabel: "Dealership staff access",
  },
  platform: {
    label: "Platform administration",
    panelTitle: "A complete view",
    panelAccent: "of the platform.",
    panelDescription: "Manage dealership operations from a secure, dedicated control center.",
    formTitle: "Platform sign in",
    formDescription: "Use your authorized platform administrator account to continue.",
    accessLabel: "Restricted administrator access",
  },
} satisfies Record<LoginExperienceProps["portal"], {
  label: string
  panelTitle: string
  panelAccent: string
  panelDescription: string
  formTitle: string
  formDescription: string
  accessLabel: string
}>

function BrandMark({ icon: Icon }: { icon: ElementType }) {
  return (
    <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-[#dcebe1] text-[#315b47]">
      <Icon className="size-5" />
    </span>
  )
}

export function LoginExperience({ children, portal }: LoginExperienceProps) {
  const content = portalContent[portal]
  const Icon = portal === "platform" ? BadgeCheck : Zap

  return (
    <div className="login-page min-h-screen bg-[#f5f7f4] text-[#1d2b24]">
      <header className="relative z-10 flex min-h-[4.5rem] items-center justify-between border-b border-[#1d2b24]/[0.07] bg-white/80 px-4 backdrop-blur-md sm:px-7 lg:px-10">
        <Link href="/" className="group inline-flex min-h-11 items-center gap-3 rounded-lg" aria-label="EV Sale POS showroom">
          <span className="flex size-9 items-center justify-center rounded-xl bg-[#183a34] text-white transition-transform group-hover:scale-[1.03]">
            <Zap className="size-4" />
          </span>
          <span className="text-sm font-semibold tracking-tight sm:text-base">EV Sale POS</span>
        </Link>
        <Link
          href="/"
          className="inline-flex min-h-11 items-center gap-2 rounded-full px-3 text-sm font-medium text-[#68756d] transition-colors hover:bg-[#edf1ed] hover:text-[#183a34]"
        >
          <ArrowLeft className="size-4" />
          <span className="hidden sm:inline">Back to showroom</span>
          <span className="sm:hidden">Showroom</span>
        </Link>
      </header>

      <main className="mx-auto grid min-h-[calc(100svh-4.5rem)] w-full max-w-[1600px] lg:grid-cols-[1.04fr_0.96fr]">
        <section className="login-panel relative isolate flex min-h-[300px] flex-col justify-between overflow-hidden bg-[#183a34] px-6 py-8 text-white sm:px-10 sm:py-10 lg:min-h-[calc(100svh-4.5rem)] lg:px-[clamp(2.5rem,6vw,6.5rem)] lg:py-12">
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
            <div className="absolute -right-36 -top-32 size-[32rem] rounded-full border border-white/[0.08]" />
            <div className="absolute -right-20 -top-16 size-[25rem] rounded-full border border-white/[0.08]" />
            <div className="absolute -bottom-48 -left-36 size-[32rem] rounded-full bg-[#406d57]/30 blur-3xl" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_75%_5%,rgba(184,215,198,0.12),transparent_38%)]" />
          </div>

          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl border border-white/15 bg-white/[0.08] text-[#c5ddcd]">
              <Icon className="size-5" />
            </span>
            <div>
              <p className="text-sm font-semibold">EV Sale POS</p>
              <p className="mt-0.5 text-xs text-white/55">Electric mobility, better managed</p>
            </div>
          </div>

          <div className="login-reveal my-10 max-w-2xl lg:my-auto lg:py-20">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-3.5 py-2 text-xs font-medium text-[#d3e4d8]">
              <span className="size-1.5 rounded-full bg-[#a7d1b3]" />
              {content.label}
            </span>
            <h1 className="mt-6 max-w-[13ch] text-4xl font-medium leading-[1.06] tracking-[-0.055em] sm:text-5xl lg:text-[clamp(3.2rem,5vw,5rem)]">
              {content.panelTitle}
              <span className="block text-[#b8d7c6]">{content.panelAccent}</span>
            </h1>
            <p className="mt-5 max-w-lg text-sm leading-7 text-white/70 sm:text-base sm:leading-8">
              {content.panelDescription}
            </p>

            <div className="mt-9 grid max-w-lg grid-cols-3 gap-2.5 sm:gap-3">
              {[
                { label: "Sales", icon: ChartNoAxesCombined },
                { label: "Inventory", icon: Boxes },
                { label: "Customers", icon: Bike },
              ].map(({ label, icon: ItemIcon }) => (
                <div key={label} className="flex min-h-[4.25rem] items-center gap-2 rounded-xl border border-white/10 bg-white/[0.06] px-2.5 sm:gap-3 sm:px-3.5">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.09] text-[#c5ddcd]">
                    <ItemIcon className="size-4" />
                  </span>
                  <span className="text-xs font-medium text-white/85 sm:text-sm">{label}</span>
                </div>
              ))}
            </div>
          </div>

          <p className="hidden text-xs text-white/45 lg:block">
            A considered workspace for the people moving electric mobility forward.
          </p>
        </section>

        <section className="flex min-w-0 items-center justify-center px-4 py-10 sm:px-8 sm:py-14 lg:px-[clamp(2rem,6vw,6rem)]">
          <div className="login-reveal w-full max-w-[440px]">
            <div className="mb-7 sm:mb-8">
              <BrandMark icon={Icon} />
              <p className="mt-6 text-xs font-semibold uppercase tracking-[0.16em] text-[#668071]">
                {content.accessLabel}
              </p>
              <h2 className="mt-2 text-3xl font-semibold tracking-[-0.045em] sm:text-[2.15rem]">
                {content.formTitle}
              </h2>
              <p className="mt-2 max-w-md text-sm leading-6 text-[#68756d]">
                {content.formDescription}
              </p>
            </div>

            <div className="rounded-2xl border border-[#dfe6e0] bg-white p-5 shadow-[0_12px_42px_rgba(27,54,39,0.055)] sm:rounded-3xl sm:p-8">
              {children}
            </div>

            <div className="mt-5 flex items-start gap-2.5 px-1 text-xs leading-5 text-[#77827b]">
              <BadgeCheck className="mt-0.5 size-4 shrink-0 text-[#57806a]" />
              <p>
                {portal === "platform"
                  ? "This portal is reserved for authorized platform administrators."
                  : "Your access is protected by your organization’s role-based permissions."}
              </p>
            </div>
            <Link href={portal === "platform" ? "/login" : "/admin-portal/login"} className="mt-4 inline-flex min-h-11 items-center gap-1.5 px-1 text-xs font-medium text-[#5e7467] transition-colors hover:text-[#183a34]">
              {portal === "platform" ? "Need dealership staff sign in?" : "Platform administrator sign in"}
              <ArrowUpRight className="size-3.5" />
            </Link>
          </div>
        </section>
      </main>
    </div>
  )
}
