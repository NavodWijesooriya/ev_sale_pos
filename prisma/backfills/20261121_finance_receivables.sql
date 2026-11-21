-- Backfill for finance receivables (feature/finance-receivables). Idempotent: safe to run again.
-- Apply with:  npx prisma db execute --schema prisma/schema.prisma --file prisma/backfills/20261121_finance_receivables.sql

-- 1. Company link: take it from the sale ...
UPDATE "FinanceDetail" fd
SET "financeCompanyId" = s."financeCompanyId"
FROM "Sale" s
WHERE fd."saleId" = s."id"
  AND fd."financeCompanyId" IS NULL
  AND s."financeCompanyId" IS NOT NULL;

-- ... or, if the sale has none, match the stored company name within the same dealership.
UPDATE "FinanceDetail" fd
SET "financeCompanyId" = fc."id"
FROM "Sale" s, "FinanceCompany" fc
WHERE fd."saleId" = s."id"
  AND fd."financeCompanyId" IS NULL
  AND fc."organizationId" = s."organizationId"
  AND lower(fc."name") = lower(fd."financeCompany");

-- 2. Balance owed by the finance company = finance amount minus what has been received so far.
UPDATE "FinanceDetail"
SET "balanceAmount" = GREATEST("totalFinanceAmount" - "receivedAmount", 0);
