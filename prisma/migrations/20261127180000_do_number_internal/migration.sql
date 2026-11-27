-- Delivery Order: mark an internally generated DO reference (DO-0001) as internal.

-- AlterTable
ALTER TABLE "DeliveryOrder" ADD COLUMN     "doNumberInternal" BOOLEAN NOT NULL DEFAULT false;
