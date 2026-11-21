-- Normalise existing NICs (no spaces, upper-case; empty becomes NULL) so the unique index below matches
-- how the application now stores them. Checked beforehand: no duplicates exist after normalising.
UPDATE "Customer"
SET "nic" = NULLIF(upper(regexp_replace("nic", '\s', '', 'g')), '')
WHERE "nic" IS NOT NULL
  AND "nic" IS DISTINCT FROM NULLIF(upper(regexp_replace("nic", '\s', '', 'g')), '');

-- CreateIndex
CREATE UNIQUE INDEX "Customer_organizationId_nic_key" ON "Customer"("organizationId", "nic");
