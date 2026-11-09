"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useTransition } from "react"
import { toast } from "sonner"
import { createCRMCustomer } from "@/app/actions/customer"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CRMCustomerFormFields } from "@/components/customers/crm-customer-form-fields"

interface AddCRMCustomerProps {
  models: Array<{ id: string; name: string }>
  cities: string[]
}

export function AddCRMCustomer({ models, cities }: AddCRMCustomerProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorMessage(null)
    const form = event.currentTarget
    const formData = new FormData(form)

    startTransition(async () => {
      const result = await createCRMCustomer(formData)
      if (!result.success) {
        setErrorMessage(result.error)
        return
      }

      toast.success(`CRM customer added with CRN ${result.crn}.`)
      form.reset()
      router.refresh()
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add CRM Customer</CardTitle>
        <CardDescription>
          Register a lead and track vehicle interest and follow-up conversations.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {errorMessage && (
            <p role="alert" className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
              {errorMessage}
            </p>
          )}

          <CRMCustomerFormFields models={models} cities={cities} requireLeadSource />

          <div className="flex justify-end">
            <Button type="submit" disabled={isPending}>
              {isPending ? "Adding customer..." : "Add CRM Customer"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
