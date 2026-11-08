ALTER TABLE "Vehicle"
ADD COLUMN "freeServiceEntitlement" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "freeServicesUsed" INTEGER NOT NULL DEFAULT 0;

UPDATE "Vehicle" AS vehicle
SET "freeServicesUsed" = service_counts.completed_count
FROM (
  SELECT "vehicleId", COUNT(*)::INTEGER AS completed_count
  FROM "ServiceRecord"
  WHERE "serviceType" = 'Free' AND "status" = 'COMPLETED'
  GROUP BY "vehicleId"
) AS service_counts
WHERE vehicle."id" = service_counts."vehicleId";
