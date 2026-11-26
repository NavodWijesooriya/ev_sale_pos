-- Supplier monthly target commission (owner-only dealership income).

-- CreateTable
CREATE TABLE "SupplierCommissionSlab" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "fromPercent" DOUBLE PRECISION NOT NULL,
    "amountPerUnit" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SupplierCommissionSlab_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierMonthlyTarget" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "targetUnits" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SupplierMonthlyTarget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierCommissionMonth" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "closedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedById" TEXT,
    "closedByName" TEXT,
    "slabsSnapshot" JSONB NOT NULL,
    CONSTRAINT "SupplierCommissionMonth_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierCommissionLine" (
    "id" TEXT NOT NULL,
    "monthId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "supplierName" TEXT NOT NULL,
    "targetUnits" INTEGER NOT NULL,
    "unitsSold" INTEGER NOT NULL,
    "achievementPercent" DOUBLE PRECISION NOT NULL,
    "slabFromPercent" DOUBLE PRECISION,
    "amountPerUnit" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalCommission" DOUBLE PRECISION NOT NULL DEFAULT 0,
    CONSTRAINT "SupplierCommissionLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierCommissionReceipt" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "supplierName" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL,
    "reference" TEXT,
    "recordedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SupplierCommissionReceipt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SupplierCommissionSlab_organizationId_fromPercent_key" ON "SupplierCommissionSlab"("organizationId", "fromPercent");

-- CreateIndex
CREATE INDEX "SupplierMonthlyTarget_organizationId_month_idx" ON "SupplierMonthlyTarget"("organizationId", "month");

-- CreateIndex
CREATE UNIQUE INDEX "SupplierMonthlyTarget_supplierId_month_key" ON "SupplierMonthlyTarget"("supplierId", "month");

-- CreateIndex
CREATE UNIQUE INDEX "SupplierCommissionMonth_organizationId_month_key" ON "SupplierCommissionMonth"("organizationId", "month");

-- CreateIndex
CREATE UNIQUE INDEX "SupplierCommissionLine_monthId_supplierId_key" ON "SupplierCommissionLine"("monthId", "supplierId");

-- CreateIndex
CREATE UNIQUE INDEX "SupplierCommissionReceipt_organizationId_supplierId_month_key" ON "SupplierCommissionReceipt"("organizationId", "supplierId", "month");

-- AddForeignKey
ALTER TABLE "SupplierCommissionSlab" ADD CONSTRAINT "SupplierCommissionSlab_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierMonthlyTarget" ADD CONSTRAINT "SupplierMonthlyTarget_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierMonthlyTarget" ADD CONSTRAINT "SupplierMonthlyTarget_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierCommissionMonth" ADD CONSTRAINT "SupplierCommissionMonth_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierCommissionLine" ADD CONSTRAINT "SupplierCommissionLine_monthId_fkey" FOREIGN KEY ("monthId") REFERENCES "SupplierCommissionMonth"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierCommissionReceipt" ADD CONSTRAINT "SupplierCommissionReceipt_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Default commission slabs for every existing organization
-- (new organizations get the same defaults the first time the slabs are read).
INSERT INTO "SupplierCommissionSlab" ("id", "organizationId", "fromPercent", "amountPerUnit", "updatedAt")
SELECT gen_random_uuid()::text, o."id", d."fromPercent", d."amountPerUnit", CURRENT_TIMESTAMP
FROM "Organization" o
CROSS JOIN (VALUES (1, 20000), (60, 22500), (70, 25000), (80, 27500), (90, 30000), (100, 32500)) AS d("fromPercent", "amountPerUnit");
