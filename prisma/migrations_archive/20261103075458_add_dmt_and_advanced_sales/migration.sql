/*
  Warnings:

  - You are about to drop the column `createdAt` on the `Vehicle` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[batterySerialNumber]` on the table `Vehicle` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "DMTStatus" AS ENUM ('Pending', 'DocumentsCollected', 'Processing', 'Completed');

-- AlterTable
ALTER TABLE "Sale" ADD COLUMN     "additionalCharges" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "deliveryDate" TIMESTAMP(3),
ADD COLUMN     "discount" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Vehicle" DROP COLUMN "createdAt",
ADD COLUMN     "batterySerialNumber" TEXT,
ADD COLUMN     "warrantyPeriod" TEXT;

-- CreateTable
CREATE TABLE "DMTRegistration" (
    "id" TEXT NOT NULL,
    "saleId" TEXT NOT NULL,
    "status" "DMTStatus" NOT NULL DEFAULT 'Pending',
    "hasMTA2" BOOLEAN NOT NULL DEFAULT false,
    "hasNIC" BOOLEAN NOT NULL DEFAULT false,
    "hasPhotos" BOOLEAN NOT NULL DEFAULT false,
    "hasTIN" BOOLEAN NOT NULL DEFAULT false,
    "registeredNumber" TEXT,

    CONSTRAINT "DMTRegistration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DMTRegistration_saleId_key" ON "DMTRegistration"("saleId");

-- CreateIndex
CREATE UNIQUE INDEX "Vehicle_batterySerialNumber_key" ON "Vehicle"("batterySerialNumber");

-- AddForeignKey
ALTER TABLE "DMTRegistration" ADD CONSTRAINT "DMTRegistration_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE CASCADE ON UPDATE CASCADE;
