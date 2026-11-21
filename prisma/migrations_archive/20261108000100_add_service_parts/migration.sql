CREATE TABLE "SparePart" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "stockQuantity" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SparePart_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ServiceJob" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "serviceRecordId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'COMPLETED',
    "partsCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ServiceJob_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ServicePart" (
    "id" TEXT NOT NULL,
    "serviceJobId" TEXT NOT NULL,
    "sparePartId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "totalPrice" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ServicePart_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SparePart_organizationId_sku_key"
ON "SparePart"("organizationId", "sku");
CREATE INDEX "SparePart_organizationId_name_idx"
ON "SparePart"("organizationId", "name");
CREATE UNIQUE INDEX "ServiceJob_serviceRecordId_key"
ON "ServiceJob"("serviceRecordId");
CREATE INDEX "ServiceJob_organizationId_createdAt_idx"
ON "ServiceJob"("organizationId", "createdAt");
CREATE UNIQUE INDEX "ServicePart_serviceJobId_sparePartId_key"
ON "ServicePart"("serviceJobId", "sparePartId");
CREATE INDEX "ServicePart_sparePartId_idx" ON "ServicePart"("sparePartId");

ALTER TABLE "SparePart"
ADD CONSTRAINT "SparePart_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ServiceJob"
ADD CONSTRAINT "ServiceJob_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ServiceJob"
ADD CONSTRAINT "ServiceJob_serviceRecordId_fkey"
FOREIGN KEY ("serviceRecordId") REFERENCES "ServiceRecord"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ServicePart"
ADD CONSTRAINT "ServicePart_serviceJobId_fkey"
FOREIGN KEY ("serviceJobId") REFERENCES "ServiceJob"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ServicePart"
ADD CONSTRAINT "ServicePart_sparePartId_fkey"
FOREIGN KEY ("sparePartId") REFERENCES "SparePart"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
