-- AlterTable
ALTER TABLE "AdvancePayment" ADD COLUMN     "vehicleModelId" TEXT;

-- CreateIndex
CREATE INDEX "AdvancePayment_vehicleModelId_idx" ON "AdvancePayment"("vehicleModelId");

-- AddForeignKey
ALTER TABLE "AdvancePayment" ADD CONSTRAINT "AdvancePayment_vehicleModelId_fkey" FOREIGN KEY ("vehicleModelId") REFERENCES "VehicleModel"("id") ON DELETE SET NULL ON UPDATE CASCADE;
