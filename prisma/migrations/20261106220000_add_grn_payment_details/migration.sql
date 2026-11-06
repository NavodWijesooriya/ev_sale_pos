ALTER TYPE "PaymentMethod" ADD VALUE IF NOT EXISTS 'CHEQUE';

DO $$
BEGIN
  CREATE TYPE "ChequeStatus" AS ENUM ('PENDING', 'CLEARED', 'BOUNCED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "PaymentStatus" AS ENUM ('Pending', 'Paid', 'PartiallyPaid');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "Payment" (
  "id" TEXT NOT NULL,
  "saleId" TEXT,
  "grnId" TEXT,
  "amount" DOUBLE PRECISION NOT NULL,
  "paymentMethod" "PaymentMethod",
  "chequeNumber" TEXT,
  "bankName" TEXT,
  "chequeDate" TIMESTAMP(3),
  "dueDate" TIMESTAMP(3),
  "chequeStatus" "ChequeStatus",
  "status" "PaymentStatus" NOT NULL DEFAULT 'Pending',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Payment" ALTER COLUMN "saleId" DROP NOT NULL;
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "grnId" TEXT;
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "dueDate" TIMESTAMP(3);
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "status" "PaymentStatus" NOT NULL DEFAULT 'Pending';

DO $$
BEGIN
  ALTER TABLE "Payment"
    ADD CONSTRAINT "Payment_saleId_fkey"
    FOREIGN KEY ("saleId") REFERENCES "Sale"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "Payment"
    ADD CONSTRAINT "Payment_grnId_fkey"
    FOREIGN KEY ("grnId") REFERENCES "GRN"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
