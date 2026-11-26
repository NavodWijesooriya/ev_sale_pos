-- Sale cancellation (void / customer return). The sale is never deleted: it keeps status CANCELLED.

-- AlterEnum
ALTER TYPE "FinanceStatus" ADD VALUE 'Cancelled';

-- AlterEnum
ALTER TYPE "SettlementStatus" ADD VALUE 'CANCELLED';

-- AlterEnum
ALTER TYPE "DMTStatus" ADD VALUE 'Cancelled';

-- AlterTable
ALTER TABLE "Sale" ADD COLUMN     "cancelAdvanceReleased" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "cancelReason" TEXT,
ADD COLUMN     "cancelRefundAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "cancelRefundMethod" TEXT,
ADD COLUMN     "cancelType" TEXT,
ADD COLUMN     "cancelledAt" TIMESTAMP(3),
ADD COLUMN     "cancelledById" TEXT,
ADD COLUMN     "cancelledByName" TEXT;

-- CreateIndex
CREATE INDEX "Sale_organizationId_status_idx" ON "Sale"("organizationId", "status");
