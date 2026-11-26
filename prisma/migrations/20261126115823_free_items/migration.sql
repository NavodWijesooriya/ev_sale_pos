-- CreateTable
CREATE TABLE "FreeItem" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FreeItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SaleFreeItem" (
    "id" TEXT NOT NULL,
    "saleId" TEXT NOT NULL,
    "freeItemId" TEXT,
    "itemName" TEXT NOT NULL,

    CONSTRAINT "SaleFreeItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FreeItem_organizationId_name_key" ON "FreeItem"("organizationId", "name");

-- CreateIndex
CREATE INDEX "SaleFreeItem_saleId_idx" ON "SaleFreeItem"("saleId");

-- CreateIndex
CREATE INDEX "SaleFreeItem_freeItemId_idx" ON "SaleFreeItem"("freeItemId");

-- AddForeignKey
ALTER TABLE "FreeItem" ADD CONSTRAINT "FreeItem_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleFreeItem" ADD CONSTRAINT "SaleFreeItem_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleFreeItem" ADD CONSTRAINT "SaleFreeItem_freeItemId_fkey" FOREIGN KEY ("freeItemId") REFERENCES "FreeItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Keep what the sale form offered today: add the five hard-coded items to every existing organization.
INSERT INTO "FreeItem" ("id", "organizationId", "name", "isActive", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, o."id", n."name", true, now(), now()
FROM "Organization" o
CROSS JOIN (VALUES ('Helmet'), ('Jacket'), ('Carpet'), ('Number Plate Holder'), ('Key Tag')) AS n("name")
ON CONFLICT ("organizationId", "name") DO NOTHING;
