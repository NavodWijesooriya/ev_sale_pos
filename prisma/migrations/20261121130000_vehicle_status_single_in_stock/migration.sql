-- AVAILABLE is now the single "in stock" status. Existing InStock rows are converted first,
-- then the unused InStock value is removed from the enum.
UPDATE "Vehicle" SET "status" = 'AVAILABLE' WHERE "status" = 'InStock';

-- AlterEnum
BEGIN;
CREATE TYPE "VehicleStatus_new" AS ENUM ('AVAILABLE', 'Sold', 'InTransit', 'Reserved');
ALTER TABLE "Vehicle" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Vehicle" ALTER COLUMN "status" TYPE "VehicleStatus_new" USING ("status"::text::"VehicleStatus_new");
ALTER TYPE "VehicleStatus" RENAME TO "VehicleStatus_old";
ALTER TYPE "VehicleStatus_new" RENAME TO "VehicleStatus";
DROP TYPE "VehicleStatus_old";
ALTER TABLE "Vehicle" ALTER COLUMN "status" SET DEFAULT 'AVAILABLE';
COMMIT;
