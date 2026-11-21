-- AlterTable ServiceRecord: remove nextServiceDueDate, add mileage and date columns
ALTER TABLE "ServiceRecord" DROP COLUMN IF EXISTS "nextServiceDueDate";
ALTER TABLE "ServiceRecord" ADD COLUMN "inMileage" TEXT;
ALTER TABLE "ServiceRecord" ADD COLUMN "nextServiceMileage" TEXT;
ALTER TABLE "ServiceRecord" ADD COLUMN "inDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "ServiceRecord" ADD COLUMN "outDate" TIMESTAMP(3);

-- AlterTable SparePart: add partNumber column
ALTER TABLE "SparePart" ADD COLUMN "partNumber" TEXT;
