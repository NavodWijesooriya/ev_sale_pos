import { redirect } from "next/navigation"
import { getGRNFormOptions } from "@/app/actions/grn"
import { CreateGRNForm } from "@/components/grn/create-grn-form"
import { getAuthSession } from "@/lib/auth"

export const instant = false

export const metadata = {
  title: "Create GRN | Ev Sale Pos",
  description: "Receive EV bikes into dealership inventory",
}

export default async function CreateGRNPage() {
  const session = await getAuthSession()
  if (!session?.user?.organizationId) {
    redirect("/login?callbackUrl=/dashboard/grn/create")
  }

  const options = await getGRNFormOptions()
  if (!options.success) throw new Error(options.error)

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Create GRN</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Record a delivery and register the bikes received into showroom stock.
        </p>
      </div>
      <CreateGRNForm
        branches={options.data.branches}
        models={options.data.models}
        colors={options.data.colors}
      />
    </div>
  )
}
