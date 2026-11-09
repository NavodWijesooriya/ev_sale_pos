"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useFieldArray, useForm } from "react-hook-form"
import { toast } from "sonner"
import { createGRN, type CreateGRNInput, type GRNBikeInput } from "@/app/actions/grn"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus, Trash2 } from "lucide-react"

interface CreateGRNFormProps {
  branches: Array<{ id: string; name: string }>
  models: Array<{ id: string; label: string }>
  colors: readonly string[]
}

function createEmptyBike(modelId: string): GRNBikeInput {
  return {
    chassisNumber: "",
    motorNumber: "",
    chargingSerialNumber: "",
    vehicleModelId: modelId,
    year: undefined,
    color: "",
  }
}

export function CreateGRNForm({ branches, models, colors }: CreateGRNFormProps) {
  const router = useRouter()
  const [isSubmitting, startTransition] = React.useTransition()
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)
  const { register, control, handleSubmit, reset, formState: { errors } } = useForm<CreateGRNInput>({
    defaultValues: {
      date: new Date().toISOString().slice(0, 10),
      branchId: branches[0]?.id || "",
      transportRefNumber: "",
      orderNumber: "",
      transportCost: undefined,
      bikes: [createEmptyBike(models[0]?.id || "")],
    },
  })
  const { fields, append, remove } = useFieldArray({ control, name: "bikes" })

  function submitForm(values: CreateGRNInput) {
    setErrorMessage(null)
    startTransition(async () => {
      const result = await createGRN(values)
      if (!result.success) {
        setErrorMessage(result.message)
        return
      }

      toast.success(result.message)
      reset({
        date: new Date().toISOString().slice(0, 10),
        branchId: branches[0]?.id || "",
        transportRefNumber: "",
        orderNumber: "",
        transportCost: undefined,
        bikes: [createEmptyBike(models[0]?.id || "")],
      })
      router.refresh()
    })
  }

  return (
    <form onSubmit={handleSubmit(submitForm)} className="space-y-6">
      {errorMessage && (
        <p role="alert" className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
          {errorMessage}
        </p>
      )}

      {(branches.length === 0 || models.length === 0) && (
        <p role="alert" className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm">
          {branches.length === 0
            ? "Create a showroom branch before adding a GRN."
            : "Create an EV model before adding bikes to a GRN."}
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle>GRN Details</CardTitle>
          <CardDescription>Enter the delivery date, destination showroom, and transport references.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="grn-date">Date *</Label>
            <Input id="grn-date" type="date" required {...register("date", { required: "Select a date." })} />
            {errors.date && <p className="text-xs text-destructive">{errors.date.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="grn-branch">Showroom *</Label>
            <select
              id="grn-branch"
              required
              {...register("branchId", { required: "Select a showroom." })}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">Select a showroom</option>
              {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
            </select>
            {errors.branchId && <p className="text-xs text-destructive">{errors.branchId.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="grn-transport-ref">Transport reference number</Label>
            <Input id="grn-transport-ref" maxLength={120} {...register("transportRefNumber")} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="grn-order-number">Order number</Label>
            <Input id="grn-order-number" maxLength={120} {...register("orderNumber")} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="grn-transport-cost">Transport cost</Label>
            <Input
              id="grn-transport-cost"
              type="number"
              min="0"
              step="0.01"
              {...register("transportCost", {
                setValueAs: (value: string) => value === "" ? undefined : Number(value),
              })}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>Bike Intake</CardTitle>
            <CardDescription>Add every bike received under this GRN.</CardDescription>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={fields.length >= 99 || models.length === 0}
            onClick={() => append(createEmptyBike(models[0]?.id || ""))}
          >
            <Plus className="mr-1.5 size-4" />
            Add bike
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {fields.map((field, index) => (
            <div key={field.id} className="rounded-xl border border-border/70 bg-muted/20 p-4 sm:p-5">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-semibold">Bike {index + 1}</h3>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={fields.length === 1}
                  onClick={() => remove(index)}
                  aria-label={`Remove bike ${index + 1}`}
                >
                  <Trash2 className="mr-1.5 size-4" />
                  Remove
                </Button>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div className="space-y-1.5">
                  <Label htmlFor={`bike-${index}-chassis`}>Chassis number *</Label>
                  <Input
                    id={`bike-${index}-chassis`}
                    maxLength={120}
                    required
                    {...register(`bikes.${index}.chassisNumber`, { required: "Chassis number is required." })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={`bike-${index}-motor`}>Motor number</Label>
                  <Input id={`bike-${index}-motor`} maxLength={120} {...register(`bikes.${index}.motorNumber`)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={`bike-${index}-charging`}>Charging serial number</Label>
                  <Input id={`bike-${index}-charging`} maxLength={120} {...register(`bikes.${index}.chargingSerialNumber`)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={`bike-${index}-model`}>Model *</Label>
                  <select
                    id={`bike-${index}-model`}
                    required
                    {...register(`bikes.${index}.vehicleModelId`, { required: "Select a model." })}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">Select an EV model</option>
                    {models.map((model) => <option key={model.id} value={model.id}>{model.label}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={`bike-${index}-year`}>Year</Label>
                  <Input
                    id={`bike-${index}-year`}
                    type="number"
                    min={1900}
                    max={2200}
                    step={1}
                    {...register(`bikes.${index}.year`, {
                      setValueAs: (value: string) => value === "" ? undefined : Number(value),
                    })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={`bike-${index}-color`}>Color *</Label>
                  <select
                    id={`bike-${index}-color`}
                    required
                    {...register(`bikes.${index}.color`, { required: "Select a bike color." })}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">Select a color</option>
                    {colors.map((color) => <option key={color} value={color}>{color}</option>)}
                  </select>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" disabled={isSubmitting || branches.length === 0 || models.length === 0}>
          {isSubmitting ? "Saving GRN..." : "Create GRN"}
        </Button>
      </div>
    </form>
  )
}
