-- Received documents: Delivery Orders (finance sales), explicit delivery date, RMV document hand-over tracking.

-- CreateEnum
CREATE TYPE "DeliveryOrderStatus" AS ENUM ('AWAITING_DO', 'DO_RECEIVED', 'DELIVERED', 'CLAIM_SUBMITTED', 'CANCELLED');

-- AlterTable
ALTER TABLE "DMTRegistration" ADD COLUMN     "crHandedOverAt" TIMESTAMP(3),
ADD COLUMN     "crHandedToName" TEXT,
ADD COLUMN     "crHandedToNic" TEXT,
ADD COLUMN     "crHandoverNotes" TEXT,
ADD COLUMN     "crHandoverReference" TEXT,
ADD COLUMN     "crHandoverTarget" TEXT,
ADD COLUMN     "crReceivedAt" TIMESTAMP(3),
ADD COLUMN     "plateHandedOverAt" TIMESTAMP(3),
ADD COLUMN     "plateHandedToName" TEXT,
ADD COLUMN     "plateHandoverNotes" TEXT,
ADD COLUMN     "plateReceivedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Sale" ADD COLUMN     "deliveredAt" TIMESTAMP(3),
ADD COLUMN     "deliveredByName" TEXT;

-- CreateTable
CREATE TABLE "DeliveryOrder" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "saleId" TEXT NOT NULL,
    "status" "DeliveryOrderStatus" NOT NULL DEFAULT 'AWAITING_DO',
    "doNumber" TEXT,
    "doDate" TIMESTAMP(3),
    "financeCompanyId" TEXT,
    "financeCompanyName" TEXT NOT NULL,
    "financeOfficeName" TEXT,
    "doAmount" DOUBLE PRECISION,
    "expiryDate" TIMESTAMP(3),
    "notes" TEXT,
    "scanUrl" TEXT,
    "scanName" TEXT,
    "stageChangedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deliveryOverrideReason" TEXT,
    "deliveryOverriddenByName" TEXT,
    "claimSubmittedAt" TIMESTAMP(3),
    "claimReference" TEXT,
    "claimChecklist" JSONB,
    "claimSubmittedByName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "DeliveryOrder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DeliveryOrder_saleId_key" ON "DeliveryOrder"("saleId");

-- CreateIndex
CREATE INDEX "DeliveryOrder_organizationId_status_idx" ON "DeliveryOrder"("organizationId", "status");

-- AddForeignKey
ALTER TABLE "DeliveryOrder" ADD CONSTRAINT "DeliveryOrder_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryOrder" ADD CONSTRAINT "DeliveryOrder_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE CASCADE ON UPDATE CASCADE;
