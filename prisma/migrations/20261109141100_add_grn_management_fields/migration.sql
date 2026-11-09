ALTER TABLE "GRN"
ADD COLUMN "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN "transportRefNumber" TEXT,
ADD COLUMN "orderNumber" TEXT,
ADD COLUMN "transportCost" DOUBLE PRECISION,
ALTER COLUMN "supplierId" DROP NOT NULL,
ALTER COLUMN "totalAmount" SET DEFAULT 0;

WITH duplicate_grns AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (PARTITION BY "grnNumber" ORDER BY "id") AS duplicate_position
  FROM "GRN"
)
UPDATE "GRN" AS grn
SET "grnNumber" = grn."grnNumber" || '-' || LEFT(grn."id", 8)
FROM duplicate_grns
WHERE grn."id" = duplicate_grns."id"
  AND duplicate_grns.duplicate_position > 1;

CREATE UNIQUE INDEX "GRN_grnNumber_key" ON "GRN"("grnNumber");
CREATE INDEX "GRN_organizationId_date_idx" ON "GRN"("organizationId", "date");

ALTER TABLE "Vehicle"
ADD COLUMN "grnId" TEXT,
ADD COLUMN "chargingSerialNumber" TEXT,
ADD COLUMN "year" INTEGER,
ALTER COLUMN "status" SET DEFAULT 'AVAILABLE';

UPDATE "Vehicle"
SET "status" = 'AVAILABLE'
WHERE "status" = 'InStock';

ALTER TABLE "Vehicle"
ADD CONSTRAINT "Vehicle_grnId_fkey"
FOREIGN KEY ("grnId") REFERENCES "GRN"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
