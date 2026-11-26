import { Globe } from "lucide-react"

export const metadata = {
  title: "Domain not configured",
  robots: { index: false, follow: false },
}

/** Shown for a domain that points here but belongs to no active dealership. Contains no tenant data. */
export default function DomainNotConfiguredPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f7f8f6] p-5 text-[#17221f]">
      <main className="w-full max-w-md rounded-3xl border border-black/[0.07] bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-2xl bg-[#eef0ee] text-[#69756e]">
          <Globe className="size-5" />
        </div>
        <h1 className="text-xl font-semibold tracking-tight">Domain not configured</h1>
        <p className="mt-2 text-sm leading-6 text-[#69756e]">
          This address is not connected to a dealership yet. If you own this domain, contact the platform administrator.
        </p>
      </main>
    </div>
  )
}
