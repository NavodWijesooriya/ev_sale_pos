-- AlterTable
ALTER TABLE "DMTRegistration" ADD COLUMN     "ownerCustomerId" TEXT;

-- CreateTable
CREATE TABLE "VehicleOwnershipTransfer" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "slipNumber" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "saleId" TEXT,
    "fromCustomerId" TEXT NOT NULL,
    "toCustomerId" TEXT NOT NULL,
    "transferDate" TIMESTAMP(3) NOT NULL,
    "reason" TEXT,
    "transferFee" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "docTransferForm" BOOLEAN NOT NULL DEFAULT false,
    "docNicCopies" BOOLEAN NOT NULL DEFAULT false,
    "docRegistrationBook" BOOLEAN NOT NULL DEFAULT false,
    "dmtOwnerUpdated" BOOLEAN NOT NULL DEFAULT false,
    "dmtPreviousOwnerId" TEXT,
    "financeWarningConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT NOT NULL,
    "createdByName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VehicleOwnershipTransfer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VehicleOwnershipTransfer_slipNumber_key" ON "VehicleOwnershipTransfer"("slipNumber");

-- CreateIndex
CREATE INDEX "VehicleOwnershipTransfer_vehicleId_transferDate_idx" ON "VehicleOwnershipTransfer"("vehicleId", "transferDate");

-- CreateIndex
CREATE INDEX "VehicleOwnershipTransfer_fromCustomerId_idx" ON "VehicleOwnershipTransfer"("fromCustomerId");

-- CreateIndex
CREATE INDEX "VehicleOwnershipTransfer_toCustomerId_idx" ON "VehicleOwnershipTransfer"("toCustomerId");

-- CreateIndex
CREATE INDEX "VehicleOwnershipTransfer_organizationId_transferDate_idx" ON "VehicleOwnershipTransfer"("organizationId", "transferDate");

-- AddForeignKey
ALTER TABLE "DMTRegistration" ADD CONSTRAINT "DMTRegistration_ownerCustomerId_fkey" FOREIGN KEY ("ownerCustomerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleOwnershipTransfer" ADD CONSTRAINT "VehicleOwnershipTransfer_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleOwnershipTransfer" ADD CONSTRAINT "VehicleOwnershipTransfer_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleOwnershipTransfer" ADD CONSTRAINT "VehicleOwnershipTransfer_fromCustomerId_fkey" FOREIGN KEY ("fromCustomerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleOwnershipTransfer" ADD CONSTRAINT "VehicleOwnershipTransfer_toCustomerId_fkey" FOREIGN KEY ("toCustomerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
