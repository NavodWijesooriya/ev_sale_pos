import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { ArrowRight, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getHostContext } from "@/lib/host-tenant"

export const instant = false

export const metadata = {
  title: "Ev Sale Pos | EV dealership management platform",
  description: "Sign in to manage your EV dealership: stock, sales, finance, service and reports.",
}

/**
 * The platform's own root page (vercel.app / localhost). It is deliberately neutral: it never shows any dealership's
 * stock. A dealership's showroom lives on its own domain (middleware rewrites "/" to /site/<slug>) or at /site/<slug>.
 */
export default async function PlatformLandingPage() {
  // Safety net: on a custom domain middleware has already rewritten "/", but never fall through to anything else.
  const context = await getHostContext()
  if (context.info.kind === "custom") {
    if (context.subdomain) redirect(`/site/${encodeURIComponent(context.subdomain)}`)
    notFound()
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f7f8f6] p-5 text-[#17221f]">
      <main className="w-full max-w-lg rounded-3xl border border-black/[0.07] bg-white p-7 text-center shadow-sm sm:p-10">
        <div className="mx-auto mb-5 flex size-14 items-center justify-center rounded-2xl bg-[#e8f0ea] text-[#31584d]">
          <Zap className="size-6" />
        </div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#628070]">EV Sale POS</p>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight">Run your EV dealership in one place.</h1>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-[#69756e]">
          Stock, sales, finance, service and reports for electric bike dealerships. Dealers sign in to manage their showroom.
        </p>
        <Link href="/login" className="mt-7 inline-block">
          <Button className="h-11 rounded-full bg-[#183a34] px-5 text-white hover:bg-[#24544a]">
            Dealer login
            <ArrowRight className="ml-1.5 size-4" />
          </Button>
        </Link>
      </main>
    </div>
  )
}
