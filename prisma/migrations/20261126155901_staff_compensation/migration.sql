-- CreateTable
CREATE TABLE "StaffCompensation" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "basicSalary" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "saleCommissionType" TEXT NOT NULL DEFAULT 'FIXED',
    "saleCommissionValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "financeCommissionType" TEXT NOT NULL DEFAULT 'FIXED',
    "financeCommissionValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StaffCompensation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffSaleCommission" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "saleId" TEXT NOT NULL,
    "saleDate" TIMESTAMP(3) NOT NULL,
    "saleCommission" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "financeCommission" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "bikePrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "financeAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "saleCommissionType" TEXT NOT NULL DEFAULT 'FIXED',
    "saleCommissionValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "financeCommissionType" TEXT NOT NULL DEFAULT 'FIXED',
    "financeCommissionValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "source" TEXT NOT NULL DEFAULT 'SALE',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "voidedAt" TIMESTAMP(3),
    "voidReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StaffSaleCommission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StaffCompensation_organizationId_userId_idx" ON "StaffCompensation"("organizationId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "StaffCompensation_userId_effectiveFrom_key" ON "StaffCompensation"("userId", "effectiveFrom");

-- CreateIndex
CREATE UNIQUE INDEX "StaffSaleCommission_saleId_key" ON "StaffSaleCommission"("saleId");

-- CreateIndex
CREATE INDEX "StaffSaleCommission_organizationId_userId_saleDate_idx" ON "StaffSaleCommission"("organizationId", "userId", "saleDate");

-- AddForeignKey
ALTER TABLE "StaffCompensation" ADD CONSTRAINT "StaffCompensation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffSaleCommission" ADD CONSTRAINT "StaffSaleCommission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffSaleCommission" ADD CONSTRAINT "StaffSaleCommission_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE CASCADE ON UPDATE CASCADE;
