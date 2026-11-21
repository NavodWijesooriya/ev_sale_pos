-- AlterTable
ALTER TABLE "AdvancePayment" ADD COLUMN IF NOT EXISTS "vehicleId" TEXT;
ALTER TABLE "AdvancePayment" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "AdvancePayment" ADD COLUMN IF NOT EXISTS "paymentMethod" TEXT DEFAULT 'Cash';
ALTER TABLE "AdvancePayment" ADD COLUMN IF NOT EXISTS "notes" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AdvancePayment_vehicleId_idx" ON "AdvancePayment"("vehicleId");

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'AdvancePayment_vehicleId_fkey'
    ) THEN
        ALTER TABLE "AdvancePayment" ADD CONSTRAINT "AdvancePayment_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;
