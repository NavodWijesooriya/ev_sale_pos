import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Building2, SearchX, ArrowLeft, ShieldAlert } from "lucide-react"

interface NotFoundViewProps {
  domain: string
  isSuspended?: boolean
  dealershipName?: string
}

export function DealershipNotFoundView({
  domain,
  isSuspended = false,
  dealershipName,
}: NotFoundViewProps) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-muted/20 to-background flex flex-col justify-center items-center px-4 py-16 text-center">
      <div className="max-w-md w-full p-8 rounded-2xl border bg-card/60 backdrop-blur-xl shadow-lg space-y-6">
        <div className="size-16 rounded-2xl bg-gradient-to-br from-amber-500/20 to-red-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 flex items-center justify-center mx-auto shadow-inner">
          {isSuspended ? (
            <ShieldAlert className="size-8" />
          ) : (
            <SearchX className="size-8" />
          )}
        </div>

        <div className="space-y-2">
          <span className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">
            {isSuspended ? "Showroom Inactive" : "404 Error"}
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {isSuspended
              ? `${dealershipName || "Dealership"} is Temporarily Offline`
              : "Dealership Showroom Not Found"}
          </h1>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {isSuspended
              ? "This dealership account is currently suspended. Please contact the dealership or support team for assistance."
              : `We could not locate any active EV dealership registered under the domain or subdomain identifier "${domain}".`}
          </p>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row gap-2 justify-center">
          <Link href="/">
            <Button variant="outline" size="sm" className="w-full sm:w-auto text-xs">
              <ArrowLeft className="mr-1.5 size-3.5" />
              Platform Home
            </Button>
          </Link>
          <Link href="/login">
            <Button size="sm" className="w-full sm:w-auto text-xs bg-primary text-primary-foreground">
              <Building2 className="mr-1.5 size-3.5" />
              Dealer Staff Login
            </Button>
          </Link>
        </div>

        <div className="pt-4 border-t text-[11px] text-muted-foreground">
          VoltPOS Multi-Tenant EV Platform • Code GN
        </div>
      </div>
    </div>
  )
}
