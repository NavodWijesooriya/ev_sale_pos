ALTER TABLE "Vehicle"
ADD COLUMN "stockNumber" TEXT;

UPDATE "Vehicle"
SET "stockNumber" = 'LEGACY-' || "id"
WHERE "stockNumber" IS NULL;

ALTER TABLE "Vehicle"
ALTER COLUMN "stockNumber" SET NOT NULL;

CREATE UNIQUE INDEX "Vehicle_stockNumber_key" ON "Vehicle"("stockNumber");
