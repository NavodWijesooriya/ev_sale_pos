CREATE TYPE "CustomerCategory" AS ENUM ('DIRECT', 'CRM');

ALTER TABLE "Customer"
ADD COLUMN "category" "CustomerCategory" NOT NULL DEFAULT 'CRM';

UPDATE "Customer" AS customer
SET "category" = 'DIRECT'
WHERE EXISTS (
  SELECT 1
  FROM "Sale" AS sale
  WHERE sale."customerId" = customer."id"
)
OR EXISTS (
  SELECT 1
  FROM "ServiceRecord" AS service
  WHERE service."customerId" = customer."id"
);
