"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Plus } from "lucide-react"
import { toast } from "sonner"
import { createCRMCustomer } from "@/app/actions/customer"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { CRMCustomerFormFields } from "@/components/customers/crm-customer-form-fields"

interface AddCRMCustomerProps {
  models: Array<{ id: string; name: string }>
  cities: string[]
}

/** The "Add CRM Customer" button and the dialog it opens (same pattern as the other add dialogs). */
export function AddCRMCustomer({ models, cities }: AddCRMCustomerProps) {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [isPending, startTransition] = React.useTransition()
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorMessage(null)
    const formData = new FormData(event.currentTarget)

    startTransition(async () => {
      const result = await createCRMCustomer(formData)
      if (!result.success) {
        // Stay open: the message (for example a duplicate NIC) is shown inside the dialog.
        setErrorMessage(result.error)
        return
      }

      toast.success(`CRM customer added with CRN ${result.crn}.`)
      setOpen(false)
      router.refresh()
    })
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (isPending) return
        setOpen(nextOpen)
        if (nextOpen) setErrorMessage(null)
      }}
    >
      <div className="flex justify-end">
        <Button type="button" className="gap-2" onClick={() => setOpen(true)}>
          <Plus className="size-4" />
          Add CRM Customer
        </Button>
      </div>

      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Add CRM Customer</DialogTitle>
          <DialogDescription>
            Register a lead and track vehicle interest and follow-up conversations.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {errorMessage && (
            <p role="alert" className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
              {errorMessage}
            </p>
          )}

          {/* Mounted only while open, so every opening starts with an empty form. */}
          {open && <CRMCustomerFormFields models={models} cities={cities} requireLeadSource />}

          <div className="flex justify-end gap-2 border-t pt-4">
            <Button type="button" variant="outline" disabled={isPending} onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Adding customer..." : "Save CRM Customer"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
