CREATE TYPE "CustomerType" AS ENUM ('CRM', 'SALE');

ALTER TABLE "Customer"
ADD COLUMN "customerType" "CustomerType" NOT NULL DEFAULT 'CRM',
ADD COLUMN "title" TEXT,
ADD COLUMN "city" TEXT,
ADD COLUMN "interestedModel" TEXT,
ADD COLUMN "quantity" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN "testRide" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "leadSource" TEXT,
ADD COLUMN "socialMediaPlatform" TEXT,
ADD COLUMN "websiteSource" TEXT,
ADD COLUMN "firstCallNote" TEXT,
ADD COLUMN "secondCallNote" TEXT,
ADD COLUMN "thirdCallNote" TEXT,
ADD COLUMN "fourthCallNote" TEXT;

UPDATE "Customer" AS customer
SET "customerType" = 'SALE'
WHERE EXISTS (
  SELECT 1
  FROM "Sale" AS sale
  WHERE sale."customerId" = customer."id"
);
