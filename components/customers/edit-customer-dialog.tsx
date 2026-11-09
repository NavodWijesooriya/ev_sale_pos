"use client"

import * as React from "react"
import { Pencil } from "lucide-react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { getCRMCustomerFormOptions, updateCustomer } from "@/app/actions/customers"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { CRMCustomerFormFields, type CRMCustomerFormValues } from "@/components/customers/crm-customer-form-fields"

interface EditCustomerDialogProps {
  customer: CRMCustomerFormValues & { id: string }
  compact?: boolean
}

export function EditCustomerDialog({ customer, compact = false }: EditCustomerDialogProps) {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [isLoadingOptions, setIsLoadingOptions] = React.useState(false)
  const [isSaving, setIsSaving] = React.useState(false)
  const [options, setOptions] = React.useState<{
    models: Array<{ id: string; name: string }>
    cities: string[]
  } | null>(null)
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)

  async function handleOpen() {
    setOpen(true)
    setErrorMessage(null)
    if (options) return

    setIsLoadingOptions(true)
    try {
      const result = await getCRMCustomerFormOptions()
      if (!result.success) {
        setErrorMessage(result.error || "Failed to load customer form options.")
      } else {
        setOptions(result.data)
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to load customer form options.")
    } finally {
      setIsLoadingOptions(false)
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorMessage(null)
    const formData = new FormData(event.currentTarget)

    setIsSaving(true)
    try {
      const result = await updateCustomer(customer.id, formData)
      if (!result.success) {
        setErrorMessage(result.error || "Failed to update customer.")
        return
      }

      toast.success("Customer profile updated.")
      setOpen(false)
      router.refresh()
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to update customer.")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (nextOpen) {
          void handleOpen()
        } else {
          setOpen(false)
        }
      }}
    >
      <Button
        type="button"
        variant={compact ? "outline" : "default"}
        size={compact ? "sm" : "default"}
        className={compact ? "h-8 gap-1.5 text-xs font-semibold" : "gap-2"}
        onClick={() => void handleOpen()}
      >
        <Pencil className="size-4" />
        {compact ? "Edit" : "Edit Profile"}
      </Button>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Edit Customer Profile</DialogTitle>
          <DialogDescription>Update contact details, vehicle interest, lead source, and call notes.</DialogDescription>
        </DialogHeader>

        {errorMessage && (
          <p role="alert" className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
            {errorMessage}
          </p>
        )}

        {isLoadingOptions && <p className="py-8 text-center text-sm text-muted-foreground">Loading customer form options...</p>}

        {options && (
          <form onSubmit={handleSubmit} className="space-y-6">
            <CRMCustomerFormFields
              key={`${customer.id}-${open}`}
              models={options.models}
              cities={options.cities}
              initialValues={customer}
            />
            <div className="flex justify-end gap-2 border-t pt-4">
              <Button type="button" variant="outline" disabled={isSaving} onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
