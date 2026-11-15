"use server"

import type { Prisma } from "@prisma/client"
import { AUDIT_ACTION_LABELS } from "@/lib/audit"
import { requireOwner } from "@/lib/authorize"
import { colomboDayRange, parseDateKey } from "@/lib/dates"
import { prisma } from "@/lib/prisma"

const AUDIT_PAGE_SIZE = 50

export interface AuditLogFilters {
  page?: number
  userId?: string
  action?: string
  /** YYYY-MM-DD, Colombo calendar day (inclusive) */
  from?: string
  to?: string
}

export interface AuditLogRow {
  id: string
  createdAt: string
  userName: string
  branchName: string | null
  action: string
  actionLabel: string
  entityType: string
  description: string
}

/** Owner-only, newest first, paginated. Never exposes other dealerships' rows. */
export async function getAuditLogs(filters: AuditLogFilters = {}) {
  const owner = await requireOwner()
  const page = Math.max(1, Math.floor(filters.page ?? 1))

  const where: Prisma.AuditLogWhereInput = { organizationId: owner.organizationId }
  if (filters.userId) where.userId = filters.userId
  if (filters.action && filters.action in AUDIT_ACTION_LABELS) where.action = filters.action

  const from = parseDateKey(filters.from)
  const to = parseDateKey(filters.to)
  if (from || to) {
    where.createdAt = {
      ...(from ? { gte: colomboDayRange(from.year, from.month, from.day).start } : {}),
      ...(to ? { lte: colomboDayRange(to.year, to.month, to.day).end } : {}),
    }
  }

  const [rows, total, users, branches] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * AUDIT_PAGE_SIZE,
      take: AUDIT_PAGE_SIZE,
    }),
    prisma.auditLog.count({ where }),
    prisma.user.findMany({
      where: { organizationId: owner.organizationId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.branch.findMany({ where: { organizationId: owner.organizationId }, select: { id: true, name: true } }),
  ])

  const branchNames = new Map(branches.map((b) => [b.id, b.name]))

  return {
    page,
    pageCount: Math.max(1, Math.ceil(total / AUDIT_PAGE_SIZE)),
    total,
    users,
    rows: rows.map(
      (r): AuditLogRow => ({
        id: r.id,
        createdAt: r.createdAt.toISOString(),
        userName: r.userName,
        branchName: r.branchId ? (branchNames.get(r.branchId) ?? "Unknown branch") : null,
        action: r.action,
        actionLabel: AUDIT_ACTION_LABELS[r.action as keyof typeof AUDIT_ACTION_LABELS] ?? r.action,
        entityType: r.entityType,
        description: r.description,
      }),
    ),
  }
}
