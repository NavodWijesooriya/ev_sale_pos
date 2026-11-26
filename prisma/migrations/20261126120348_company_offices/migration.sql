-- AlterTable
ALTER TABLE "Sale" ADD COLUMN     "financeOfficeId" TEXT,
ADD COLUMN     "financeOfficeName" TEXT,
ADD COLUMN     "insuranceOfficeId" TEXT,
ADD COLUMN     "insuranceOfficeName" TEXT;

-- CreateTable
CREATE TABLE "CompanyOffice" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "financeCompanyId" TEXT,
    "insuranceCompanyId" TEXT,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "phone" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanyOffice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CompanyOffice_organizationId_idx" ON "CompanyOffice"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "CompanyOffice_financeCompanyId_name_key" ON "CompanyOffice"("financeCompanyId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "CompanyOffice_insuranceCompanyId_name_key" ON "CompanyOffice"("insuranceCompanyId", "name");

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_financeOfficeId_fkey" FOREIGN KEY ("financeOfficeId") REFERENCES "CompanyOffice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_insuranceOfficeId_fkey" FOREIGN KEY ("insuranceOfficeId") REFERENCES "CompanyOffice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyOffice" ADD CONSTRAINT "CompanyOffice_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyOffice" ADD CONSTRAINT "CompanyOffice_financeCompanyId_fkey" FOREIGN KEY ("financeCompanyId") REFERENCES "FinanceCompany"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyOffice" ADD CONSTRAINT "CompanyOffice_insuranceCompanyId_fkey" FOREIGN KEY ("insuranceCompanyId") REFERENCES "InsuranceCompany"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- An office belongs to exactly one company: a finance company or an insurance company.
ALTER TABLE "CompanyOffice" ADD CONSTRAINT "CompanyOffice_one_company_check"
  CHECK (("financeCompanyId" IS NOT NULL AND "insuranceCompanyId" IS NULL) OR ("financeCompanyId" IS NULL AND "insuranceCompanyId" IS NOT NULL));
