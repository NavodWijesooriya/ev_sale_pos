"use client"

import * as React from "react"
import { CommissionReportsView } from "@/components/finance/commission-reports-view"
import type { CommissionReportData } from "@/app/actions/finance-reports"

interface CommissionsTabProps {
  initialData: CommissionReportData
}

export function CommissionsTab({ initialData }: CommissionsTabProps) {
  return <CommissionReportsView initialData={initialData} />
}
