"use client"

import * as React from "react"
import { useState, useTransition } from "react"
import { toast } from "sonner"
import {
  FileCheck2,
  FileText,
  ShieldCheck,
  Send,
  MessageSquare,
  CheckCircle2,
  Clock,
  Save,
  RotateCw,
  ExternalLink,
  Car,
  Bike,
  Sparkles,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { updateVehicleDocumentStatus, logCustomerNotification } from "@/app/actions/sales"

export function formatSriLankanPhoneForWhatsApp(phone: string): string {
  const digits = phone.replace(/\D/g, "")
  if (digits.startsWith("94")) {
    return digits
  }
  if (digits.startsWith("0")) {
    return `94${digits.slice(1)}`
  }
  if (digits.length === 9) {
    return `94${digits}`
  }
  return digits
}

export interface VehicleDocumentTrackerProps {
  saleId: string
  customerName: string
  customerPhone: string
  dealershipName?: string
  modelName: string
  chassisNumber: string
  unitGrnNumber?: string | null
  initialRegistrationNumber?: string | null
  initialIsBookOk?: boolean
  initialIsNumberPlateOk?: boolean
  initialIsInsuranceOk?: boolean
  initialLastNotifiedAt?: Date | string | null
  compact?: boolean
  onUpdated?: () => void
}

export function VehicleDocumentTracker({
  saleId,
  customerName,
  customerPhone,
  dealershipName = "Wijesooriya Motors",
  modelName,
  chassisNumber,
  unitGrnNumber,
  initialRegistrationNumber = "",
  initialIsBookOk = false,
  initialIsNumberPlateOk = false,
  initialIsInsuranceOk = false,
  initialLastNotifiedAt,
  compact = false,
  onUpdated,
}: VehicleDocumentTrackerProps) {
  const [isPending, startTransition] = useTransition()
  const [isSaving, setIsSaving] = useState(false)

  // Local document state
  const [isBookOk, setIsBookOk] = useState(initialIsBookOk)
  const [isNumberPlateOk, setIsNumberPlateOk] = useState(initialIsNumberPlateOk)
  const [isInsuranceOk, setIsInsuranceOk] = useState(initialIsInsuranceOk)
  const [registrationNumber, setRegistrationNumber] = useState(
    initialRegistrationNumber || ""
  )
  const [lastNotifiedAt, setLastNotifiedAt] = useState<Date | string | null>(
    initialLastNotifiedAt || null
  )

  // Notify Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [customMessage, setCustomMessage] = useState("")

  // Generate dynamic message based on ready documents
  const generateDefaultMessage = React.useCallback(
    (bookOk: boolean, plateOk: boolean, insuranceOk: boolean, regNo: string) => {
      const readyItems: string[] = []
      if (bookOk) readyItems.push("Vehicle Registration Book (CR Book / පොත)")
      if (plateOk) {
        readyItems.push(
          `Number Plate${regNo.trim() ? ` (${regNo.trim().toUpperCase()})` : ""}`
        )
      }
      if (insuranceOk) readyItems.push("Insurance Card / Policy Certificate")

      let docListText = ""
      if (readyItems.length === 0) {
        docListText = "documents"
      } else if (readyItems.length === 1) {
        docListText = readyItems[0]
      } else if (readyItems.length === 2) {
        docListText = `${readyItems[0]} and ${readyItems[1]}`
      } else {
        docListText = `${readyItems.slice(0, -1).join(", ")}, and ${readyItems[readyItems.length - 1]}`
      }

      const vehicleRef = `${modelName} (Chassis: ${chassisNumber}${
        unitGrnNumber ? ` / Unit GRN: ${unitGrnNumber}` : ""
      })`

      const plateLine = regNo.trim()
        ? `\nRegistration Plate No: ${regNo.trim().toUpperCase()}`
        : ""

      return `Dear ${customerName || "Valued Customer"},\n\nWe are pleased to inform you that your vehicle (${vehicleRef}) ${docListText} is/are now ready for collection at ${dealershipName}.${plateLine}\n\nPlease bring your original sale invoice and National Identity Card (NIC) when visiting to collect your items.\n\nDealership: ${dealershipName}\nContact: Thank you for choosing us!`
    },
    [customerName, dealershipName, modelName, chassisNumber, unitGrnNumber]
  )

  // Open modal and compute initial text
  const handleOpenNotifyModal = () => {
    const text = generateDefaultMessage(
      isBookOk,
      isNumberPlateOk,
      isInsuranceOk,
      registrationNumber
    )
    setCustomMessage(text)
    setIsModalOpen(true)
  }

  // Save document tracking changes
  const handleSaveChanges = async () => {
    setIsSaving(true)
    try {
      const res = await updateVehicleDocumentStatus({
        saleId,
        isBookOk,
        isNumberPlateOk,
        isInsuranceOk,
        registrationNumber: registrationNumber.trim().toUpperCase(),
      })

      if (!res.success) {
        toast.error(res.error || "Failed to update document status.")
        return
      }

      toast.success("RMV & vehicle document status saved!")
      onUpdated?.()
    } catch (err) {
      toast.error((err as Error).message || "An unexpected error occurred.")
    } finally {
      setIsSaving(false)
    }
  }

  // Send WhatsApp
  const handleSendWhatsApp = async () => {
    const intlPhone = formatSriLankanPhoneForWhatsApp(customerPhone)
    if (!intlPhone || intlPhone.length < 9) {
      toast.error("Valid customer phone number is required for WhatsApp.")
      return
    }

    // Trigger external WhatsApp link
    const waUrl = `https://wa.me/${intlPhone}?text=${encodeURIComponent(customMessage)}`
    window.open(waUrl, "_blank")

    // Log notification in DB
    startTransition(async () => {
      const res = await logCustomerNotification({ saleId })
      if (res.success && res.lastNotifiedAt) {
        setLastNotifiedAt(res.lastNotifiedAt)
        toast.success("WhatsApp message opened & notification logged!")
        setIsModalOpen(false)
        onUpdated?.()
      } else {
        toast.error(res.error || "Failed to log notification timestamp.")
      }
    })
  }

  // Send SMS
  const handleSendSMS = async () => {
    const intlPhone = formatSriLankanPhoneForWhatsApp(customerPhone)
    const smsUrl = `sms:${intlPhone}?&body=${encodeURIComponent(customMessage)}`
    window.location.href = smsUrl

    // Log notification in DB
    startTransition(async () => {
      const res = await logCustomerNotification({ saleId })
      if (res.success && res.lastNotifiedAt) {
        setLastNotifiedAt(res.lastNotifiedAt)
        toast.success("SMS app opened & notification logged!")
        setIsModalOpen(false)
        onUpdated?.()
      } else {
        toast.error(res.error || "Failed to log notification timestamp.")
      }
    })
  }

  const readyCount = [isBookOk, isNumberPlateOk, isInsuranceOk].filter(Boolean).length

  return (
    <div className={`rounded-xl border border-border/60 bg-card p-4 transition-all shadow-xs ${compact ? "space-y-3" : "space-y-4"}`}>
      {/* Header Info */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/40 pb-3">
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <FileCheck2 className="size-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-foreground">{modelName}</span>
              {unitGrnNumber && (
                <Badge variant="outline" className="font-mono text-[10px] font-bold bg-muted/40">
                  {unitGrnNumber}
                </Badge>
              )}
            </div>
            <p className="text-[11px] font-mono text-muted-foreground">
              Chassis: <span className="font-semibold text-foreground">{chassisNumber}</span>
            </p>
          </div>
        </div>

        {/* Readiness overview badge */}
        <div className="flex items-center gap-2">
          <Badge
            variant={readyCount === 3 ? "default" : readyCount > 0 ? "secondary" : "outline"}
            className={
              readyCount === 3
                ? "bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold gap-1"
                : readyCount > 0
                ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30 text-[11px] font-semibold gap-1"
                : "text-[11px] text-muted-foreground"
            }
          >
            {readyCount === 3 ? (
              <>
                <CheckCircle2 className="size-3" />
                All 3 Docs Ready
              </>
            ) : (
              `${readyCount}/3 Docs Ready`
            )}
          </Badge>

          {lastNotifiedAt && (
            <Badge variant="outline" className="text-[10px] gap-1 text-muted-foreground hidden sm:flex">
              <Clock className="size-2.5" />
              Notified: {new Date(lastNotifiedAt).toLocaleDateString()}
            </Badge>
          )}
        </div>
      </div>

      {/* Grid of the 3 Key Documents */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* 1. Registration Book (CR Book / පොත) */}
        <div
          className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
            isBookOk
              ? "bg-emerald-500/5 border-emerald-500/30"
              : "bg-muted/20 border-border/60"
          }`}
        >
          <div className="space-y-0.5">
            <div className="flex items-center gap-1.5">
              <FileText className={`size-3.5 ${isBookOk ? "text-emerald-600" : "text-muted-foreground"}`} />
              <span className="text-xs font-semibold">Reg. Book (පොත)</span>
            </div>
            <Badge
              variant="outline"
              className={`text-[10px] font-semibold py-0 px-1.5 h-4 ${
                isBookOk
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                  : "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400"
              }`}
            >
              {isBookOk ? "Ready (OK)" : "Pending"}
            </Badge>
          </div>
          <Switch
            checked={isBookOk}
            onCheckedChange={setIsBookOk}
            aria-label="Toggle Registration Book Status"
          />
        </div>

        {/* 2. Number Plate */}
        <div
          className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
            isNumberPlateOk
              ? "bg-emerald-500/5 border-emerald-500/30"
              : "bg-muted/20 border-border/60"
          }`}
        >
          <div className="space-y-0.5">
            <div className="flex items-center gap-1.5">
              <Car className={`size-3.5 ${isNumberPlateOk ? "text-emerald-600" : "text-muted-foreground"}`} />
              <span className="text-xs font-semibold">Number Plate</span>
            </div>
            <Badge
              variant="outline"
              className={`text-[10px] font-semibold py-0 px-1.5 h-4 ${
                isNumberPlateOk
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                  : "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400"
              }`}
            >
              {isNumberPlateOk ? "Ready (OK)" : "Pending"}
            </Badge>
          </div>
          <Switch
            checked={isNumberPlateOk}
            onCheckedChange={setIsNumberPlateOk}
            aria-label="Toggle Number Plate Status"
          />
        </div>

        {/* 3. Insurance Card / Policy */}
        <div
          className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
            isInsuranceOk
              ? "bg-emerald-500/5 border-emerald-500/30"
              : "bg-muted/20 border-border/60"
          }`}
        >
          <div className="space-y-0.5">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className={`size-3.5 ${isInsuranceOk ? "text-emerald-600" : "text-muted-foreground"}`} />
              <span className="text-xs font-semibold">Insurance Policy</span>
            </div>
            <Badge
              variant="outline"
              className={`text-[10px] font-semibold py-0 px-1.5 h-4 ${
                isInsuranceOk
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                  : "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400"
              }`}
            >
              {isInsuranceOk ? "Ready (OK)" : "Pending"}
            </Badge>
          </div>
          <Switch
            checked={isInsuranceOk}
            onCheckedChange={setIsInsuranceOk}
            aria-label="Toggle Insurance Policy Status"
          />
        </div>
      </div>

      {/* Plate Input & Action Buttons */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-2 flex-1 max-w-sm">
          <Label htmlFor={`plate-${saleId}`} className="text-xs font-bold whitespace-nowrap text-muted-foreground">
            Plate No:
          </Label>
          <Input
            id={`plate-${saleId}`}
            placeholder="e.g. WP BHE-1234"
            value={registrationNumber}
            onChange={(e) => setRegistrationNumber(e.target.value.toUpperCase())}
            className="font-mono text-xs font-bold tracking-wider h-8 uppercase bg-background"
          />
        </div>

        <div className="flex items-center justify-end gap-2 flex-wrap">
          {/* Quick Save button */}
          <Button
            size="sm"
            variant="outline"
            onClick={handleSaveChanges}
            disabled={isSaving}
            className="h-8 text-xs font-semibold gap-1.5"
          >
            {isSaving ? (
              <RotateCw className="size-3 animate-spin" />
            ) : (
              <Save className="size-3 text-muted-foreground" />
            )}
            Save Changes
          </Button>

          {/* Notify Customer Modal Button */}
          <Button
            size="sm"
            onClick={handleOpenNotifyModal}
            className="h-8 text-xs font-semibold gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
          >
            <Send className="size-3" />
            Notify Customer
          </Button>

          <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogContent className="sm:max-w-[540px]">
              <DialogHeader>
                <div className="flex items-center gap-2 text-emerald-600">
                  <MessageSquare className="size-5" />
                  <DialogTitle className="text-base font-bold text-foreground">
                    Notify Customer (SMS / WhatsApp)
                  </DialogTitle>
                </div>
                <DialogDescription className="text-xs">
                  Send an instant pickup notification to {customerName} for ready vehicle documents.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-2">
                <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-lg bg-muted/40 text-xs">
                  <div>
                    <span className="text-muted-foreground font-medium">Customer: </span>
                    <span className="font-bold text-foreground">{customerName}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground font-medium">Phone: </span>
                    <span className="font-mono font-semibold text-foreground">{customerPhone}</span>
                  </div>
                  {lastNotifiedAt && (
                    <div className="w-full text-[11px] text-muted-foreground pt-1 border-t border-border/40">
                      Last notified: {new Date(lastNotifiedAt).toLocaleString()}
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="notify-message" className="text-xs font-semibold">
                      Message Content (Editable)
                    </Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setCustomMessage(
                          generateDefaultMessage(
                            isBookOk,
                            isNumberPlateOk,
                            isInsuranceOk,
                            registrationNumber
                          )
                        )
                      }
                      className="h-6 text-[11px] text-primary gap-1 px-2"
                    >
                      <Sparkles className="size-3" />
                      Regenerate
                    </Button>
                  </div>
                  <Textarea
                    id="notify-message"
                    rows={8}
                    value={customMessage}
                    onChange={(e) => setCustomMessage(e.target.value)}
                    className="text-xs font-sans leading-relaxed resize-y"
                    placeholder="Type notification message here..."
                  />
                  <p className="text-[11px] text-muted-foreground">
                    This message will be pre-filled when opening WhatsApp or your mobile SMS app.
                  </p>
                </div>
              </div>

              <DialogFooter className="gap-2 sm:gap-0">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsModalOpen(false)}
                  className="text-xs"
                >
                  Cancel
                </Button>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isPending}
                    onClick={handleSendSMS}
                    className="text-xs font-semibold gap-1.5 hover:bg-muted"
                  >
                    <MessageSquare className="size-3.5 text-blue-600" />
                    Send SMS
                  </Button>

                  <Button
                    type="button"
                    size="sm"
                    disabled={isPending}
                    onClick={handleSendWhatsApp}
                    className="text-xs font-semibold gap-1.5 bg-[#25D366] hover:bg-[#1EBE5D] text-white shadow-xs"
                  >
                    <Send className="size-3.5" />
                    Send via WhatsApp
                  </Button>
                </div>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  )
}
