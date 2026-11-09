"use client"

import * as React from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const leadSources = ["Hotline", "Social Media", "Dealer BTL (Promotion)", "Website"]
const socialMediaPlatforms = ["Facebook", "TikTok", "Instagram"]
const websiteSources = ["Jayakodi Groups", "Ather Energy", "Evolution Auto"]

const callNotes = [
  { name: "firstCallNote", label: "First Call" },
  { name: "secondCallNote", label: "Second Call" },
  { name: "thirdCallNote", label: "Third Call" },
  { name: "fourthCallNote", label: "Fourth Call" },
] as const

export interface CRMCustomerFormValues {
  name?: string | null
  phone?: string | null
  email?: string | null
  nic?: string | null
  address?: string | null
  title?: string | null
  city?: string | null
  interestedModel?: string | null
  quantity?: number
  testRide?: boolean
  leadSource?: string | null
  socialMediaPlatform?: string | null
  websiteSource?: string | null
  firstCallNote?: string | null
  secondCallNote?: string | null
  thirdCallNote?: string | null
  fourthCallNote?: string | null
}

interface CRMCustFormFieldsProps {
  models: Array<{ id: string; name: string }>
  cities: string[]
  initialValues?: CRMCustomerFormValues
  requireLeadSource?: boolean
}

export function CRMCustomerFormFields({
  models,
  cities,
  initialValues,
  requireLeadSource = false,
}: CRMCustFormFieldsProps) {
  const [leadSource, setLeadSource] = React.useState(initialValues?.leadSource || "")
  const modelExists = models.some((model) => model.name === initialValues?.interestedModel)

  return (
    <>
      <section className="space-y-4">
        <h2 className="text-sm font-semibold">Customer details</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="crm-title">Title</Label>
            <select
              id="crm-title"
              name="title"
              defaultValue={initialValues?.title || ""}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">Select title</option>
              <option value="Mr">Mr</option>
              <option value="Mrs">Mrs</option>
              <option value="Miss">Miss</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="crm-name">Full name *</Label>
            <Input id="crm-name" name="name" required maxLength={120} autoComplete="name" defaultValue={initialValues?.name || ""} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="crm-phone">Phone number *</Label>
            <Input id="crm-phone" name="phone" type="tel" required maxLength={32} autoComplete="tel" defaultValue={initialValues?.phone || ""} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="crm-email">Email address</Label>
            <Input id="crm-email" name="email" type="email" maxLength={254} autoComplete="email" defaultValue={initialValues?.email || ""} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="crm-nic">NIC / Passport</Label>
            <Input id="crm-nic" name="nic" maxLength={64} defaultValue={initialValues?.nic || ""} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="crm-city">City</Label>
            <Input
              id="crm-city"
              name="city"
              maxLength={120}
              autoComplete="address-level2"
              list="crm-city-suggestions"
              placeholder="Type to search or enter a city"
              defaultValue={initialValues?.city || ""}
            />
            <datalist id="crm-city-suggestions">
              {cities.map((city) => <option key={city} value={city} />)}
            </datalist>
          </div>
          <div className="space-y-1.5 sm:col-span-2 lg:col-span-3">
            <Label htmlFor="crm-address">Address</Label>
            <Input id="crm-address" name="address" maxLength={500} autoComplete="street-address" defaultValue={initialValues?.address || ""} />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold">Vehicle interest</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="crm-model">Interested model</Label>
            <select
              id="crm-model"
              name="interestedModel"
              defaultValue={initialValues?.interestedModel || ""}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">Select an EV model</option>
              {!modelExists && initialValues?.interestedModel && (
                <option value={initialValues.interestedModel}>{initialValues.interestedModel}</option>
              )}
              {models.map((model) => (
                <option key={model.id} value={model.name}>{model.name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="crm-quantity">Quantity</Label>
            <Input id="crm-quantity" name="quantity" type="number" min={1} step={1} defaultValue={initialValues?.quantity ?? 1} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="crm-lead-source">Lead source{requireLeadSource ? " *" : ""}</Label>
            <select
              id="crm-lead-source"
              name="leadSource"
              defaultValue={initialValues?.leadSource || ""}
              required={requireLeadSource}
              onChange={(event) => setLeadSource(event.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">Select lead source</option>
              {leadSources.map((source) => (
                <option key={source} value={source}>{source}</option>
              ))}
            </select>
          </div>
          {leadSource === "Social Media" && (
            <div className="space-y-1.5">
              <Label htmlFor="crm-social-platform">Social media platform *</Label>
              <select
                id="crm-social-platform"
                name="socialMediaPlatform"
                required
                defaultValue={initialValues?.socialMediaPlatform || ""}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="" disabled>Select a platform</option>
                {socialMediaPlatforms.map((platform) => (
                  <option key={platform} value={platform}>{platform}</option>
                ))}
              </select>
            </div>
          )}
          {leadSource === "Website" && (
            <div className="space-y-1.5">
              <Label htmlFor="crm-website-source">Website source *</Label>
              <select
                id="crm-website-source"
                name="websiteSource"
                required
                defaultValue={initialValues?.websiteSource || ""}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="" disabled>Select a website source</option>
                {websiteSources.map((source) => (
                  <option key={source} value={source}>{source}</option>
                ))}
              </select>
            </div>
          )}
          <label className="flex items-center gap-2 text-sm sm:col-span-2 lg:col-span-3">
            <input
              name="testRide"
              type="checkbox"
              defaultChecked={initialValues?.testRide ?? false}
              className="size-4 accent-primary"
            />
            Test ride completed
          </label>
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-sm font-semibold">Follow-up call notes</h2>
          <p className="text-xs text-muted-foreground">Record the discussion and next steps for each follow-up.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {callNotes.map(({ name, label }) => (
            <div key={name} className="space-y-1.5">
              <Label htmlFor={`crm-${name}`}>{label}</Label>
              <textarea
                id={`crm-${name}`}
                name={name}
                rows={4}
                maxLength={10000}
                defaultValue={initialValues?.[name] || ""}
                className="flex min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              />
            </div>
          ))}
        </div>
      </section>
    </>
  )
}
