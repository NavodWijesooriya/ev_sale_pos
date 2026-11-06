"use client"

import * as React from "react"
import Image from "next/image"
import {
  ArrowUpRight,
  BatteryCharging,
  Bike,
  Building2,
  Check,
  Gauge,
  MessageCircle,
  Phone,
  Zap,
} from "lucide-react"
import { formatLKR } from "@/lib/currency"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

export interface StockModelItem {
  brand: string
  modelName: string
  batteryCapacity: string | null
  range: string | null
  motorPower?: string | null
  rangePerCharge?: string | null
  topSpeed?: string | null
  chargingTime?: string | null
  defaultPrice: number
  minDownPayment: number | null
  inStockCount: number
  availableColors: string[]
  stockByBranch: {
    branchName: string
    count: number
  }[]
}

interface StockGridProps {
  models: StockModelItem[]
  dealershipName: string
  dealerPhone?: string | null
}

export const officialAtherImages: Record<string, string> = {
  "450X LR": "https://media.atherenergy.com/450x-mono-cosmic-black-d.webp",
  "450X HR": "https://media.atherenergy.com/450x-mono-cosmic-black-d.webp",
  "Rizta S": "https://media.atherenergy.com/Blue-Mono.png",
}

function getModelSpecs(model: StockModelItem) {
  return [
    { label: "Range", value: model.rangePerCharge || model.range, icon: Gauge },
    { label: "Battery", value: model.batteryCapacity, icon: BatteryCharging },
    { label: "Motor", value: model.motorPower, icon: Zap },
  ].filter((spec): spec is typeof spec & { value: string } => Boolean(spec.value))
}

export function StockGrid({ models, dealershipName, dealerPhone }: StockGridProps) {
  const [selectedModel, setSelectedModel] = React.useState<StockModelItem | null>(null)
  const cleanPhone = dealerPhone?.replace(/[^\d]/g, "")

  const whatsappUrl = selectedModel && cleanPhone
    ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(
        `Hello ${dealershipName}, I am interested in the Ather ${selectedModel.modelName}. Is it available for a test ride?`
      )}`
    : null

  return (
    <div className="space-y-7">
      {models.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card px-5 py-14 text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <Bike className="size-5" />
          </div>
          <h3 className="mt-4 text-base font-semibold">No Ather models currently available</h3>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
            Contact the showroom to ask about availability and upcoming stock.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {models.map((model) => {
            const specs = getModelSpecs(model)
            const imageUrl = officialAtherImages[model.modelName]
            const minDownPayment = model.minDownPayment

            return (
              <article
                key={model.modelName}
                className="group flex min-w-0 flex-col overflow-hidden rounded-2xl border border-border bg-card transition duration-300 hover:-translate-y-1 hover:border-primary/35 hover:shadow-lg"
              >
                <div className="relative aspect-[1.55] overflow-hidden bg-[#f0f3f0]">
                  <Image
                    src={imageUrl}
                    alt={`Official Ather ${model.modelName} electric scooter`}
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
                    className="object-contain p-5 transition-transform duration-500 group-hover:scale-[1.04]"
                  />
                  <div className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full border border-white/80 bg-white/90 px-3 py-1.5 text-xs font-medium text-foreground shadow-sm backdrop-blur">
                    <span className="size-1.5 rounded-full bg-emerald-500" />
                    {model.inStockCount} available
                  </div>
                </div>

                <div className="flex flex-1 flex-col p-5 sm:p-6">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Ather</p>
                      <h3 className="mt-1 text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                        {model.modelName}
                      </h3>
                    </div>
                    <span className="shrink-0 rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                      New
                    </span>
                  </div>

                  <div className="mt-5 flex items-end justify-between gap-3 border-b border-border pb-5">
                    <div>
                      <p className="text-xs text-muted-foreground">Showroom price</p>
                      <p className="mt-1 text-xl font-semibold tracking-tight tabular-nums sm:text-2xl">
                        {formatLKR(model.defaultPrice)}
                      </p>
                    </div>
                    {minDownPayment !== null && minDownPayment > 0 && (
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Down payment</p>
                        <p className="mt-1 text-sm font-medium tabular-nums">
                          {formatLKR(minDownPayment)}
                        </p>
                      </div>
                    )}
                  </div>

                  {specs.length > 0 && (
                    <dl className="mt-5 grid grid-cols-2 gap-3">
                      {specs.map(({ label, value, icon: Icon }) => (
                        <div key={label} className="flex min-w-0 items-center gap-2.5">
                          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/8 text-primary">
                            <Icon className="size-4" />
                          </span>
                          <div className="min-w-0">
                            <dt className="text-[11px] text-muted-foreground">{label}</dt>
                            <dd className="truncate text-sm font-medium">{value}</dd>
                          </div>
                        </div>
                      ))}
                    </dl>
                  )}

                  {model.availableColors.length > 0 && (
                    <div className="mt-5">
                      <p className="text-xs font-medium text-muted-foreground">Available colours</p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {model.availableColors.map((color) => (
                          <span
                            key={color}
                            className="rounded-full border border-border px-2.5 py-1 text-xs text-foreground"
                          >
                            {color}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <Button
                    type="button"
                    className="mt-6 h-11 w-full justify-between rounded-xl px-4"
                    onClick={() => setSelectedModel(model)}
                  >
                    <span>Enquire or book a test ride</span>
                    <ArrowUpRight className="size-4" />
                  </Button>
                </div>
              </article>
            )
          })}
        </div>
      )}

      <Dialog open={selectedModel !== null} onOpenChange={(open) => !open && setSelectedModel(null)}>
        {selectedModel && (
          <DialogContent className="w-[calc(100%-2rem)] max-w-lg rounded-2xl p-5 sm:p-7">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold">
                Ather {selectedModel.modelName}
              </DialogTitle>
              <DialogDescription>
                Talk to {dealershipName} about availability or arrange a showroom test ride.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-xl bg-muted/60 p-4">
                <span className="text-sm text-muted-foreground">Showroom price</span>
                <span className="font-semibold tabular-nums">{formatLKR(selectedModel.defaultPrice)}</span>
              </div>

              {selectedModel.stockByBranch.length > 0 && (
                <div>
                  <p className="mb-2 text-sm font-medium">Available at</p>
                  <ul className="space-y-2">
                    {selectedModel.stockByBranch.map((branch) => (
                      <li
                        key={branch.branchName}
                        className="flex items-center justify-between rounded-xl border border-border px-3.5 py-3 text-sm"
                      >
                        <span className="flex min-w-0 items-center gap-2">
                          <Building2 className="size-4 shrink-0 text-muted-foreground" />
                          <span className="truncate">{branch.branchName}</span>
                        </span>
                        <span className="ml-3 shrink-0 text-muted-foreground">
                          {branch.count} available
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {whatsappUrl && (
                  <a
                    className="inline-flex h-11 items-center justify-center rounded-xl bg-[#15803d] px-4 text-sm font-medium text-white transition-colors hover:bg-[#166534]"
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <MessageCircle className="mr-2 size-4" />
                    WhatsApp
                  </a>
                )}
                {dealerPhone && (
                  <a
                    className="inline-flex h-11 items-center justify-center rounded-xl border border-border bg-background px-4 text-sm font-medium transition-colors hover:bg-muted"
                    href={`tel:${dealerPhone.replace(/[^\d+]/g, "")}`}
                  >
                    <Phone className="mr-2 size-4" />
                    Call showroom
                  </a>
                )}
              </div>

              {!dealerPhone && (
                <p className="flex items-center gap-2 rounded-xl bg-muted/60 p-3 text-sm text-muted-foreground">
                  <Check className="size-4 shrink-0 text-primary" />
                  Visit a listed showroom to enquire in person.
                </p>
              )}
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  )
}
