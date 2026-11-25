-- The PREPARED cheque status was never reachable (cheques start at ISSUED), so it is removed.
-- Any row that somehow held it is moved to ISSUED first so the enum can be rebuilt.
UPDATE "Cheque" SET "status" = 'ISSUED' WHERE "status" = 'PREPARED';
UPDATE "ChequeEvent" SET "fromStatus" = 'ISSUED' WHERE "fromStatus" = 'PREPARED';
UPDATE "ChequeEvent" SET "toStatus" = 'ISSUED' WHERE "toStatus" = 'PREPARED';
UPDATE "Payment" SET "chequeStatus" = 'ISSUED' WHERE "chequeStatus" = 'PREPARED';

-- AlterEnum
BEGIN;
CREATE TYPE "ChequeStatus_new" AS ENUM ('PENDING', 'ISSUED', 'PRESENTED', 'CLEARED', 'BOUNCED', 'CANCELLED');
ALTER TABLE "Cheque" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Cheque" ALTER COLUMN "status" TYPE "ChequeStatus_new" USING ("status"::text::"ChequeStatus_new");
ALTER TABLE "ChequeEvent" ALTER COLUMN "fromStatus" TYPE "ChequeStatus_new" USING ("fromStatus"::text::"ChequeStatus_new");
ALTER TABLE "ChequeEvent" ALTER COLUMN "toStatus" TYPE "ChequeStatus_new" USING ("toStatus"::text::"ChequeStatus_new");
ALTER TABLE "Payment" ALTER COLUMN "chequeStatus" TYPE "ChequeStatus_new" USING ("chequeStatus"::text::"ChequeStatus_new");
ALTER TYPE "ChequeStatus" RENAME TO "ChequeStatus_old";
ALTER TYPE "ChequeStatus_new" RENAME TO "ChequeStatus";
DROP TYPE "ChequeStatus_old";
ALTER TABLE "Cheque" ALTER COLUMN "status" SET DEFAULT 'ISSUED';
COMMIT;

