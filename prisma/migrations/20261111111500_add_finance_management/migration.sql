CREATE TABLE "FinanceCompany" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contactNo" TEXT NOT NULL,
    "defaultCommissionRate" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinanceCompany_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "InsuranceCompany" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contactNo" TEXT NOT NULL,
    "defaultCommissionRate" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InsuranceCompany_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Sale"
ADD COLUMN "financeCompanyId" TEXT,
ADD COLUMN "insuranceCompanyId" TEXT,
ADD COLUMN "financeCommission" DOUBLE PRECISION,
ADD COLUMN "insuranceCommission" DOUBLE PRECISION;

CREATE UNIQUE INDEX "FinanceCompany_organizationId_name_key"
ON "FinanceCompany"("organizationId", "name");
CREATE UNIQUE INDEX "InsuranceCompany_organizationId_name_key"
ON "InsuranceCompany"("organizationId", "name");
CREATE INDEX "Sale_organizationId_financeCompanyId_idx"
ON "Sale"("organizationId", "financeCompanyId");
CREATE INDEX "Sale_organizationId_insuranceCompanyId_idx"
ON "Sale"("organizationId", "insuranceCompanyId");

ALTER TABLE "FinanceCompany"
ADD CONSTRAINT "FinanceCompany_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InsuranceCompany"
ADD CONSTRAINT "InsuranceCompany_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Sale"
ADD CONSTRAINT "Sale_financeCompanyId_fkey"
FOREIGN KEY ("financeCompanyId") REFERENCES "FinanceCompany"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Sale"
ADD CONSTRAINT "Sale_insuranceCompanyId_fkey"
FOREIGN KEY ("insuranceCompanyId") REFERENCES "InsuranceCompany"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
