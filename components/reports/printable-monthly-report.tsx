"use client"

import * as React from "react"
import { AdvancedReportsData } from "@/app/actions/reports"

interface PrintableMonthlyReportProps {
  data: AdvancedReportsData
}

export function PrintableMonthlyReport({ data }: PrintableMonthlyReportProps) {
  const currentDate = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  return (
    <div className="hidden print:block text-slate-900 bg-white font-sans text-xs leading-normal p-6 max-w-5xl mx-auto space-y-6">
      {/* 1. Official Header */}
      <div className="border-b-2 border-slate-900 pb-4 flex justify-between items-start">
        <div>
          <div className="flex items-center gap-3">
            {data.organization.logoUrl ? (
              <img
                src={data.organization.logoUrl}
                alt="Logo"
                className="h-12 w-auto object-contain"
              />
            ) : (
              <div className="h-10 w-10 bg-slate-900 text-white font-bold flex items-center justify-center rounded text-sm">
                EV
              </div>
            )}
            <div>
              <h1 className="text-xl font-black uppercase tracking-tight text-slate-900">
                {data.organization.businessName}
              </h1>
              <p className="text-[11px] text-slate-600">
                Authorized Electric Vehicle Dealership & Service Network
              </p>
              {data.organization.phone && (
                <p className="text-[10px] text-slate-500">Contact: {data.organization.phone}</p>
              )}
            </div>
          </div>
        </div>

        <div className="text-right">
          <div className="inline-block bg-slate-900 text-white font-bold text-xs uppercase px-3 py-1 rounded">
            Official Executive Report
          </div>
          <p className="text-[10px] text-slate-500 mt-1">Generated: {currentDate}</p>
          <p className="text-[10px] text-slate-500">Classification: Confidential / Board Level</p>
        </div>
      </div>

      {/* 2. Executive Summary KPIs */}
      <div>
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800 mb-2 border-b border-slate-300 pb-1">
          1. Executive Performance Summary
        </h2>
        <div className="grid grid-cols-4 gap-3 text-center">
          <div className="border border-slate-300 p-2.5 rounded bg-slate-50">
            <span className="text-[10px] uppercase font-semibold text-slate-600 block">Gross Revenue</span>
            <span className="text-base font-extrabold text-slate-900 font-mono">
              ${data.financial.totalRevenue.toLocaleString()}
            </span>
          </div>
          <div className="border border-slate-300 p-2.5 rounded bg-slate-50">
            <span className="text-[10px] uppercase font-semibold text-slate-600 block">Net Gross Profit</span>
            <span className="text-base font-extrabold text-slate-900 font-mono">
              ${data.financial.netGrossProfit.toLocaleString()}
            </span>
            <span className="text-[9px] text-slate-600 block font-bold">({data.financial.profitMarginPercent}% Margin)</span>
          </div>
          <div className="border border-slate-300 p-2.5 rounded bg-slate-50">
            <span className="text-[10px] uppercase font-semibold text-slate-600 block">Stock In Hand</span>
            <span className="text-base font-extrabold text-slate-900 font-mono">
              {data.inventoryAging.summary.totalInStock} units
            </span>
            <span className="text-[9px] text-slate-600 block font-mono">
              (${data.inventoryAging.summary.totalTiedCapital.toLocaleString()})
            </span>
          </div>
          <div className="border border-slate-300 p-2.5 rounded bg-slate-50">
            <span className="text-[10px] uppercase font-semibold text-slate-600 block">Pending DMT Files</span>
            <span className="text-base font-extrabold text-slate-900 font-mono">
              {data.pendingDMT.summary.totalPending} files
            </span>
            <span className="text-[9px] text-slate-600 block">Awaiting compliance</span>
          </div>
        </div>
      </div>

      {/* 3. 6-Month Financial Ledger */}
      <div>
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800 mb-2 border-b border-slate-300 pb-1">
          2. Financial & Profitability Ledger (Last 6 Months)
        </h2>
        <table className="w-full border-collapse border border-slate-300 text-[11px]">
          <thead>
            <tr className="bg-slate-100 text-slate-800">
              <th className="border border-slate-300 p-1.5 text-left font-bold">Month</th>
              <th className="border border-slate-300 p-1.5 text-center font-bold">Units</th>
              <th className="border border-slate-300 p-1.5 text-right font-bold">Gross Revenue</th>
              <th className="border border-slate-300 p-1.5 text-right font-bold">COGS (Acquisition)</th>
              <th className="border border-slate-300 p-1.5 text-right font-bold">Commission</th>
              <th className="border border-slate-300 p-1.5 text-right font-bold">Net Gross Profit</th>
              <th className="border border-slate-300 p-1.5 text-center font-bold">Margin</th>
            </tr>
          </thead>
          <tbody>
            {data.financial.monthlyPerformance.map((row) => (
              <tr key={row.monthKey} className="border-b border-slate-200">
                <td className="border border-slate-300 p-1.5 font-medium">{row.monthLabel}</td>
                <td className="border border-slate-300 p-1.5 text-center font-mono">{row.units}</td>
                <td className="border border-slate-300 p-1.5 text-right font-mono">${row.revenue.toLocaleString()}</td>
                <td className="border border-slate-300 p-1.5 text-right font-mono">${row.acquisitionCost.toLocaleString()}</td>
                <td className="border border-slate-300 p-1.5 text-right font-mono">${row.commission.toLocaleString()}</td>
                <td className="border border-slate-300 p-1.5 text-right font-mono font-bold">${row.netProfit.toLocaleString()}</td>
                <td className="border border-slate-300 p-1.5 text-center font-mono">{row.marginPercent}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 4. Inventory Aging & Dead Stock Summary */}
      <div className="page-break-before">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800 mb-2 border-b border-slate-300 pb-1">
          3. Dead Stock & Inventory Aging Breakdown
        </h2>
        <div className="mb-2 text-[10px] text-slate-600">
          Showing current unsold EV stock categorized by floor age. Critical (&gt;90d):{" "}
          <strong>{data.inventoryAging.summary.criticalOver90Count} units</strong> (${data.inventoryAging.summary.criticalOver90Capital.toLocaleString()}) |
          Warning (60-90d): <strong>{data.inventoryAging.summary.warningOver60Count} units</strong> |
          Aging (30-60d): <strong>{data.inventoryAging.summary.agingOver30Count} units</strong>.
        </div>
        <table className="w-full border-collapse border border-slate-300 text-[10px]">
          <thead>
            <tr className="bg-slate-100 text-slate-800">
              <th className="border border-slate-300 p-1.5 text-left font-bold">VIN / Chassis</th>
              <th className="border border-slate-300 p-1.5 text-left font-bold">Model Name</th>
              <th className="border border-slate-300 p-1.5 text-left font-bold">Branch</th>
              <th className="border border-slate-300 p-1.5 text-right font-bold">Acquisition Cost</th>
              <th className="border border-slate-300 p-1.5 text-center font-bold">In-Stock Since</th>
              <th className="border border-slate-300 p-1.5 text-center font-bold">Days in Stock</th>
              <th className="border border-slate-300 p-1.5 text-center font-bold">Category</th>
            </tr>
          </thead>
          <tbody>
            {data.inventoryAging.vehicles.slice(0, 15).map((v) => (
              <tr key={v.id} className="border-b border-slate-200">
                <td className="border border-slate-300 p-1 font-mono">{v.chassisNumber}</td>
                <td className="border border-slate-300 p-1 font-medium">{v.brand} {v.modelName}</td>
                <td className="border border-slate-300 p-1">{v.branchName}</td>
                <td className="border border-slate-300 p-1 text-right font-mono">${v.purchasePrice.toLocaleString()}</td>
                <td className="border border-slate-300 p-1 text-center font-mono">
                  {new Date(v.inStockSince).toISOString().split("T")[0]}
                </td>
                <td className="border border-slate-300 p-1 text-center font-mono font-bold">{v.daysInStock} d</td>
                <td className="border border-slate-300 p-1 text-center font-bold uppercase text-[9px]">
                  {v.agingTier === "critical"
                    ? "CRITICAL (>90D)"
                    : v.agingTier === "warning"
                    ? "WARNING (60-90D)"
                    : v.agingTier === "aging"
                    ? "AGING (30-60D)"
                    : "FRESH (<30D)"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 5. Pending DMT Compliance */}
      <div>
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800 mb-2 border-b border-slate-300 pb-1">
          4. Department of Motor Traffic (DMT) Compliance Status
        </h2>
        <table className="w-full border-collapse border border-slate-300 text-[10px]">
          <thead>
            <tr className="bg-slate-100 text-slate-800">
              <th className="border border-slate-300 p-1.5 text-left font-bold">Sale Date</th>
              <th className="border border-slate-300 p-1.5 text-left font-bold">Customer Name</th>
              <th className="border border-slate-300 p-1.5 text-left font-bold">Vehicle Model & VIN</th>
              <th className="border border-slate-300 p-1.5 text-left font-bold">Missing Documentation</th>
              <th className="border border-slate-300 p-1.5 text-center font-bold">DMT Status</th>
            </tr>
          </thead>
          <tbody>
            {data.pendingDMT.registrations.length === 0 ? (
              <tr>
                <td colSpan={5} className="border border-slate-300 p-2 text-center text-slate-500">
                  All vehicle registrations are fully completed with DMT.
                </td>
              </tr>
            ) : (
              data.pendingDMT.registrations.map((r) => (
                <tr key={r.id} className="border-b border-slate-200">
                  <td className="border border-slate-300 p-1 font-mono">
                    {new Date(r.saleDate).toISOString().split("T")[0]}
                  </td>
                  <td className="border border-slate-300 p-1 font-medium">
                    {r.customerName} ({r.customerPhone})
                  </td>
                  <td className="border border-slate-300 p-1">
                    {r.vehicleSummary} - <span className="font-mono">{r.chassisNumber}</span>
                  </td>
                  <td className="border border-slate-300 p-1 text-red-600 font-medium">
                    {r.missingDocuments.length > 0 ? r.missingDocuments.join("; ") : "All Collected"}
                  </td>
                  <td className="border border-slate-300 p-1 text-center font-bold">
                    {r.status}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 6. Signature Sign-off Block */}
      <div className="pt-8 border-t-2 border-slate-900 grid grid-cols-2 gap-12 mt-8">
        <div>
          <div className="border-b border-slate-400 h-14" />
          <p className="font-bold text-xs mt-1 text-slate-900">Prepared by: Finance Manager / Accountant</p>
          <p className="text-[10px] text-slate-500">Date: ________________________</p>
        </div>
        <div>
          <div className="border-b border-slate-400 h-14" />
          <p className="font-bold text-xs mt-1 text-slate-900">Approved by: Managing Director / Dealership Owner</p>
          <p className="text-[10px] text-slate-500">Date: ________________________</p>
        </div>
      </div>
    </div>
  )
}
