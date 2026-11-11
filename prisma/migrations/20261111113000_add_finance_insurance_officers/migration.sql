CREATE TABLE "FinanceOfficer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contactNo" TEXT NOT NULL,
    "financeCompanyId" TEXT NOT NULL,

    CONSTRAINT "FinanceOfficer_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "InsuranceOfficer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contactNo" TEXT NOT NULL,
    "insuranceCompanyId" TEXT NOT NULL,

    CONSTRAINT "InsuranceOfficer_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "FinanceOfficer_financeCompanyId_idx"
ON "FinanceOfficer"("financeCompanyId");
CREATE INDEX "InsuranceOfficer_insuranceCompanyId_idx"
ON "InsuranceOfficer"("insuranceCompanyId");

ALTER TABLE "FinanceOfficer"
ADD CONSTRAINT "FinanceOfficer_financeCompanyId_fkey"
FOREIGN KEY ("financeCompanyId") REFERENCES "FinanceCompany"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InsuranceOfficer"
ADD CONSTRAINT "InsuranceOfficer_insuranceCompanyId_fkey"
FOREIGN KEY ("insuranceCompanyId") REFERENCES "InsuranceCompany"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
