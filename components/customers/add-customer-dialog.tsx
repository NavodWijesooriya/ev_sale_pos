"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Plus, UserRoundPlus } from "lucide-react"
import { createCustomer } from "@/app/actions/customer"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"

export function AddCustomerDialog() {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [isPending, startTransition] = React.useTransition()
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorMessage(null)
    const form = event.currentTarget
    const formData = new FormData(form)

    startTransition(async () => {
      const result = await createCustomer(formData)
      if (!result.success) {
        setErrorMessage(result.error)
        return
      }

      toast.success(`Customer added with CRN ${result.crn}.`)
      form.reset()
      setOpen(false)
      router.refresh()
    })
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen)
        if (nextOpen) setErrorMessage(null)
      }}
    >
      <Button className="h-9 gap-2 text-xs font-semibold" onClick={() => setOpen(true)}>
        <Plus className="size-4" />
        Add Customer
      </Button>
      <DialogContent className="sm:max-w-md rounded-2xl">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <UserRoundPlus className="size-5" />
            </div>
            <div>
              <DialogTitle>Add a customer</DialogTitle>
              <DialogDescription>
                A unique customer relationship number will be assigned automatically.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {errorMessage && (
            <p role="alert" className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
              {errorMessage}
            </p>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="customer-name">Customer name</Label>
            <Input id="customer-name" name="name" autoComplete="name" required maxLength={120} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="customer-phone">Phone number</Label>
            <Input
              id="customer-phone"
              name="phone"
              type="tel"
              autoComplete="tel"
              required
              maxLength={32}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="customer-email">Email address</Label>
            <Input
              id="customer-email"
              name="email"
              type="email"
              autoComplete="email"
              maxLength={254}
            />
          </div>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Adding customer..." : "Add customer"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
