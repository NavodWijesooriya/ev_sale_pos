-- CreateEnum
CREATE TYPE "StockTransferStatus" AS ENUM ('IN_TRANSIT', 'RECEIVED', 'CANCELLED');

-- CreateTable
CREATE TABLE "StockTransfer" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "transferNumber" TEXT NOT NULL,
    "fromBranchId" TEXT NOT NULL,
    "toBranchId" TEXT NOT NULL,
    "status" "StockTransferStatus" NOT NULL DEFAULT 'IN_TRANSIT',
    "notes" TEXT,
    "dispatchedById" TEXT NOT NULL,
    "dispatchedByName" TEXT NOT NULL,
    "dispatchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "receivedById" TEXT,
    "receivedByName" TEXT,
    "receivedAt" TIMESTAMP(3),
    "cancelledById" TEXT,
    "cancelledByName" TEXT,
    "cancelledAt" TIMESTAMP(3),
    "cancelReason" TEXT,

    CONSTRAINT "StockTransfer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockTransferItem" (
    "id" TEXT NOT NULL,
    "transferId" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,

    CONSTRAINT "StockTransferItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StockTransfer_organizationId_status_idx" ON "StockTransfer"("organizationId", "status");

-- CreateIndex
CREATE INDEX "StockTransfer_fromBranchId_status_idx" ON "StockTransfer"("fromBranchId", "status");

-- CreateIndex
CREATE INDEX "StockTransfer_toBranchId_status_idx" ON "StockTransfer"("toBranchId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "StockTransfer_organizationId_transferNumber_key" ON "StockTransfer"("organizationId", "transferNumber");

-- CreateIndex
CREATE INDEX "StockTransferItem_vehicleId_idx" ON "StockTransferItem"("vehicleId");

-- CreateIndex
CREATE UNIQUE INDEX "StockTransferItem_transferId_vehicleId_key" ON "StockTransferItem"("transferId", "vehicleId");

-- AddForeignKey
ALTER TABLE "StockTransfer" ADD CONSTRAINT "StockTransfer_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockTransfer" ADD CONSTRAINT "StockTransfer_fromBranchId_fkey" FOREIGN KEY ("fromBranchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockTransfer" ADD CONSTRAINT "StockTransfer_toBranchId_fkey" FOREIGN KEY ("toBranchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockTransferItem" ADD CONSTRAINT "StockTransferItem_transferId_fkey" FOREIGN KEY ("transferId") REFERENCES "StockTransfer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockTransferItem" ADD CONSTRAINT "StockTransferItem_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

