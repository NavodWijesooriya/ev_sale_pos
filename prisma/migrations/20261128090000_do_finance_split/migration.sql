-- Delivery Order drives the finance split: additional down payment, its payments, and the owner's receipt-without-DO override.

-- AlterTable
ALTER TABLE "DeliveryOrder" ADD COLUMN     "amountNote" TEXT,
ADD COLUMN     "receiptOverrideAt" TIMESTAMP(3),
ADD COLUMN     "receiptOverrideByName" TEXT,
ADD COLUMN     "receiptOverrideReason" TEXT;

-- AlterTable
ALTER TABLE "Sale" ADD COLUMN     "additionalDownPaymentDue" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "additionalDownPaymentPaid" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "originalFinanceAmount" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "DownPaymentPayment" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "saleId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "method" TEXT NOT NULL,
    "paymentDate" TIMESTAMP(3) NOT NULL,
    "reference" TEXT,
    "receivedById" TEXT,
    "receivedByName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DownPaymentPayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DownPaymentPayment_organizationId_paymentDate_idx" ON "DownPaymentPayment"("organizationId", "paymentDate");

-- CreateIndex
CREATE INDEX "DownPaymentPayment_saleId_idx" ON "DownPaymentPayment"("saleId");

-- AddForeignKey
ALTER TABLE "DownPaymentPayment" ADD CONSTRAINT "DownPaymentPayment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DownPaymentPayment" ADD CONSTRAINT "DownPaymentPayment_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE CASCADE ON UPDATE CASCADE;
