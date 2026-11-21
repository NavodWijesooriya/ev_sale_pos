DROP INDEX IF EXISTS "Vehicle_stockNumber_key";

ALTER TABLE "Vehicle"
DROP COLUMN IF EXISTS "stockNumber";
