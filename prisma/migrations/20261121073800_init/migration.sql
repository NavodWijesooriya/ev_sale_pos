-- CreateEnum
CREATE TYPE "PlatformRole" AS ENUM ('PlatformAdmin', 'Support');

-- CreateEnum
CREATE TYPE "SubscriptionPlan" AS ENUM ('Free', 'Basic', 'Pro', 'Enterprise');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('Active', 'Suspended');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('OrgAdmin', 'BranchManager', 'SalesRep', 'Cashier', 'Technician');

-- CreateEnum
CREATE TYPE "VehicleStatus" AS ENUM ('AVAILABLE', 'InStock', 'Sold', 'InTransit', 'Reserved');

-- CreateEnum
CREATE TYPE "GrnPaymentStatus" AS ENUM ('UNPAID', 'PARTIAL', 'PAID');

-- CreateEnum
CREATE TYPE "SupplierPaymentStatus" AS ENUM ('COMPLETED', 'PENDING', 'REVERSED');

-- CreateEnum
CREATE TYPE "CustomerCategory" AS ENUM ('DIRECT', 'CRM');

-- CreateEnum
CREATE TYPE "CustomerType" AS ENUM ('CRM', 'SALE');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('Cash', 'Card', 'BankTransfer', 'Finance', 'SplitPayment', 'CHEQUE');

-- CreateEnum
CREATE TYPE "InsuranceType" AS ENUM ('NONE', 'FULL_DEALER', 'CUSTOMER_OWN');

-- CreateEnum
CREATE TYPE "ChequeStatus" AS ENUM ('PENDING', 'PREPARED', 'ISSUED', 'PRESENTED', 'CLEARED', 'BOUNCED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('Pending', 'Paid', 'PartiallyPaid');

-- CreateEnum
CREATE TYPE "TestRideStatus" AS ENUM ('BOOKED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "NumberPlateStatus" AS ENUM ('PENDING', 'PROCESSING', 'ISSUED');

-- CreateEnum
CREATE TYPE "AdvancePaymentStatus" AS ENUM ('PENDING', 'USED', 'REFUNDED', 'TRANSFERRED');

-- CreateEnum
CREATE TYPE "FinanceStatus" AS ENUM ('Pending', 'Received', 'Partial');

-- CreateEnum
CREATE TYPE "DMTStatus" AS ENUM ('Pending', 'DocumentsCollected', 'Processing', 'Completed');

-- CreateEnum
CREATE TYPE "ServiceType" AS ENUM ('Free', 'Paid', 'Warranty');

-- CreateEnum
CREATE TYPE "SettlementType" AS ENUM ('FINANCE', 'INSURANCE', 'RMV');

-- CreateEnum
CREATE TYPE "SettlementStatus" AS ENUM ('PENDING', 'SETTLED');

-- CreateEnum
CREATE TYPE "FinanceReceiptMethod" AS ENUM ('BankTransfer', 'CHEQUE', 'Cash');

-- CreateEnum
CREATE TYPE "FinanceReceiptStatus" AS ENUM ('COMPLETED', 'PENDING', 'REVERSED');

-- CreateEnum
CREATE TYPE "IncomingChequeStatus" AS ENUM ('RECEIVED', 'PRESENTED', 'CLEARED', 'BOUNCED');

-- CreateTable
CREATE TABLE "PlatformUser" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "PlatformRole" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlatformUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "businessName" TEXT NOT NULL,
    "domain" TEXT,
    "subdomain" TEXT,
    "phone" TEXT,
    "logoUrl" TEXT,
    "subscriptionPlan" "SubscriptionPlan" NOT NULL DEFAULT 'Free',
    "subscriptionStatus" "SubscriptionStatus" NOT NULL DEFAULT 'Active',
    "expiryDate" TIMESTAMP(3),
    "staffCanManageCatalog" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "customDomain" TEXT,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommissionSettings" (
    "organizationId" TEXT NOT NULL,
    "fullInsuranceCommission" DOUBLE PRECISION NOT NULL DEFAULT 2000,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedById" TEXT,

    CONSTRAINT "CommissionSettings_pkey" PRIMARY KEY ("organizationId")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT,
    "userName" TEXT NOT NULL,
    "branchId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "branchId" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "permissions" TEXT[] DEFAULT ARRAY[]::TEXT[],

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Branch" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "location" TEXT,
    "contactNumber" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Branch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Supplier" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contactPerson" TEXT,
    "phone" TEXT,
    "email" TEXT,

    CONSTRAINT "Supplier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VehicleModel" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "modelName" TEXT NOT NULL,
    "imageUrl" TEXT,
    "motorPower" TEXT,
    "batteryCapacity" TEXT,
    "rangePerCharge" TEXT,
    "range" TEXT,
    "topSpeed" TEXT,
    "chargingTime" TEXT,
    "defaultPrice" DOUBLE PRECISION NOT NULL,
    "minDownPayment" DOUBLE PRECISION,

    CONSTRAINT "VehicleModel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vehicle" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "grnId" TEXT,
    "vehicleModelId" TEXT NOT NULL,
    "chassisNumber" TEXT NOT NULL,
    "unitGrnNumber" TEXT,
    "registrationNumber" TEXT,
    "motorNumber" TEXT,
    "chargingSerialNumber" TEXT,
    "batterySerialNumber" TEXT,
    "warrantyPeriod" TEXT,
    "year" INTEGER,
    "color" TEXT,
    "status" "VehicleStatus" NOT NULL DEFAULT 'AVAILABLE',
    "purchasePrice" DOUBLE PRECISION NOT NULL,
    "freeServiceEntitlement" INTEGER NOT NULL DEFAULT 0,
    "freeServicesUsed" INTEGER NOT NULL DEFAULT 0,
    "motorPower" TEXT,
    "batteryCapacity" TEXT,
    "rangePerCharge" TEXT,
    "topSpeed" TEXT,
    "chargingTime" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Vehicle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GRN" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "supplierId" TEXT,
    "grnNumber" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "transportRefNumber" TEXT,
    "orderNumber" TEXT,
    "transportCost" DOUBLE PRECISION,
    "totalAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "receivedDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paidAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "balanceAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "paymentStatus" "GrnPaymentStatus" NOT NULL DEFAULT 'UNPAID',

    CONSTRAINT "GRN_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierPayment" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "branchId" TEXT,
    "supplierId" TEXT NOT NULL,
    "paymentNumber" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "status" "SupplierPaymentStatus" NOT NULL DEFAULT 'COMPLETED',
    "paymentDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "referenceNo" TEXT,
    "notes" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reversedAt" TIMESTAMP(3),

    CONSTRAINT "SupplierPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierPaymentAllocation" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "grnId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupplierPaymentAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cheque" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "chequeNumber" TEXT NOT NULL,
    "bankName" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "chequeDate" TIMESTAMP(3) NOT NULL,
    "status" "ChequeStatus" NOT NULL DEFAULT 'ISSUED',
    "clearedAt" TIMESTAMP(3),
    "bouncedAt" TIMESTAMP(3),
    "bounceReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Cheque_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChequeEvent" (
    "id" TEXT NOT NULL,
    "chequeId" TEXT NOT NULL,
    "fromStatus" "ChequeStatus",
    "toStatus" "ChequeStatus" NOT NULL,
    "note" TEXT,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChequeEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierAdvance" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "paymentId" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "usedAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "balanceAmount" DOUBLE PRECISION NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupplierAdvance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierAdvanceAllocation" (
    "id" TEXT NOT NULL,
    "advanceId" TEXT NOT NULL,
    "grnId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupplierAdvanceAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GRNItem" (
    "id" TEXT NOT NULL,
    "grnId" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "unitPrice" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "GRNItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "category" "CustomerCategory" NOT NULL DEFAULT 'CRM',
    "customerType" "CustomerType" NOT NULL DEFAULT 'CRM',
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "nic" TEXT,
    "address" TEXT,
    "crn" TEXT,
    "title" TEXT,
    "city" TEXT,
    "interestedModel" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "testRide" BOOLEAN NOT NULL DEFAULT false,
    "leadSource" TEXT,
    "socialMediaPlatform" TEXT,
    "websiteSource" TEXT,
    "firstCallNote" TEXT,
    "secondCallNote" TEXT,
    "thirdCallNote" TEXT,
    "fourthCallNote" TEXT,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sale" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "saleDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "invoiceNumber" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "advancePaymentId" TEXT,
    "financeCompanyId" TEXT,
    "insuranceCompanyId" TEXT,
    "paymentType" TEXT DEFAULT 'CASH',
    "financeAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "downPayment" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "commissionBasis" TEXT NOT NULL DEFAULT 'FINANCE_AMOUNT',
    "commissionRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "commissionAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "discount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "additionalCharges" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "advanceDeducted" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "financeCommission" DOUBLE PRECISION,
    "insuranceCommission" DOUBLE PRECISION,
    "insuranceType" "InsuranceType" NOT NULL DEFAULT 'NONE',
    "commissionRecipientId" TEXT,
    "deliveryDate" TIMESTAMP(3),
    "paymentMethod" TEXT,
    "warrantyOption" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Completed',
    "freeItems" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "freeServices" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Sale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
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

-- CreateTable
CREATE TABLE "FinanceOfficer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contactNo" TEXT NOT NULL,
    "financeCompanyId" TEXT NOT NULL,

    CONSTRAINT "FinanceOfficer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
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

-- CreateTable
CREATE TABLE "InsuranceOfficer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contactNo" TEXT NOT NULL,
    "insuranceCompanyId" TEXT NOT NULL,

    CONSTRAINT "InsuranceOfficer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdvancePayment" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "vehicleId" TEXT,
    "nicNumber" TEXT NOT NULL,
    "bikeModel" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "advanceDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paymentMethod" TEXT DEFAULT 'Cash',
    "notes" TEXT,
    "branchId" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "paymentDetails" TEXT NOT NULL,
    "status" "AdvancePaymentStatus" NOT NULL DEFAULT 'PENDING',

    CONSTRAINT "AdvancePayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdvanceRefund" (
    "id" TEXT NOT NULL,
    "advanceId" TEXT NOT NULL,
    "refundDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "refundAmount" DOUBLE PRECISION NOT NULL,
    "paymentMethod" TEXT NOT NULL,
    "status" TEXT NOT NULL,

    CONSTRAINT "AdvanceRefund_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdvanceTransfer" (
    "id" TEXT NOT NULL,
    "fromAdvanceId" TEXT NOT NULL,
    "toCustomerId" TEXT NOT NULL,
    "toAdvanceId" TEXT,
    "transferAmount" DOUBLE PRECISION NOT NULL,
    "transferDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,
    "fromCustomerId" TEXT,
    "createdById" TEXT,
    "createdByName" TEXT,

    CONSTRAINT "AdvanceTransfer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SaleItem" (
    "id" TEXT NOT NULL,
    "saleId" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "SaleItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinanceDetail" (
    "id" TEXT NOT NULL,
    "saleId" TEXT NOT NULL,
    "financeCompany" TEXT NOT NULL,
    "totalFinanceAmount" DOUBLE PRECISION NOT NULL,
    "downPaymentPaid" DOUBLE PRECISION NOT NULL,
    "dealerCommission" DOUBLE PRECISION,
    "status" "FinanceStatus" NOT NULL DEFAULT 'Pending',
    "financeCompanyId" TEXT,
    "receivedAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "balanceAmount" DOUBLE PRECISION NOT NULL,
    "expectedDate" TIMESTAMP(3),
    "receivedAt" TIMESTAMP(3),

    CONSTRAINT "FinanceDetail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DMTRegistration" (
    "id" TEXT NOT NULL,
    "saleId" TEXT NOT NULL,
    "status" "DMTStatus" NOT NULL DEFAULT 'Pending',
    "hasMTA2" BOOLEAN NOT NULL DEFAULT false,
    "hasNIC" BOOLEAN NOT NULL DEFAULT false,
    "hasPhotos" BOOLEAN NOT NULL DEFAULT false,
    "hasTIN" BOOLEAN NOT NULL DEFAULT false,
    "registeredNumber" TEXT,
    "registrationNumber" TEXT,
    "isBookOk" BOOLEAN NOT NULL DEFAULT false,
    "isNumberPlateOk" BOOLEAN NOT NULL DEFAULT false,
    "isInsuranceOk" BOOLEAN NOT NULL DEFAULT false,
    "lastNotifiedAt" TIMESTAMP(3),
    "numberPlateStatus" "NumberPlateStatus" NOT NULL DEFAULT 'PENDING',

    CONSTRAINT "DMTRegistration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceRecord" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "assignedTechnicianId" TEXT,
    "serviceDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "inDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "outDate" TIMESTAMP(3),
    "inMileage" TEXT,
    "nextServiceMileage" TEXT,
    "serviceType" "ServiceType" NOT NULL,
    "description" TEXT,
    "totalCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ServiceRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SparePart" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "partNumber" TEXT,
    "price" DOUBLE PRECISION NOT NULL,
    "stockQuantity" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SparePart_pkey" PRIMARY KEY ("id")
);

-- CreateTable
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

-- CreateTable
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

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "saleId" TEXT,
    "grnId" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "paymentMethod" "PaymentMethod",
    "chequeNumber" TEXT,
    "bankName" TEXT,
    "chequeDate" TIMESTAMP(3),
    "dueDate" TIMESTAMP(3),
    "chequeStatus" "ChequeStatus",
    "status" "PaymentStatus" NOT NULL DEFAULT 'Pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TestRide" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "vehicleModelId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "scheduledDate" TIMESTAMP(3) NOT NULL,
    "timeSlot" TEXT NOT NULL,
    "status" "TestRideStatus" NOT NULL DEFAULT 'BOOKED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TestRide_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommissionSettlement" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "saleId" TEXT NOT NULL,
    "type" "SettlementType" NOT NULL,
    "status" "SettlementStatus" NOT NULL DEFAULT 'PENDING',
    "amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "settledAt" TIMESTAMP(3),
    "reference" TEXT,
    "updatedById" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommissionSettlement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BankAccount" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "bankName" TEXT NOT NULL,
    "accountNumber" TEXT NOT NULL,
    "accountName" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BankAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BankDeposit" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "bankAccountId" TEXT NOT NULL,
    "depositDate" TIMESTAMP(3) NOT NULL,
    "cashSalesTotal" DOUBLE PRECISION NOT NULL,
    "depositAmount" DOUBLE PRECISION NOT NULL,
    "slipNumber" TEXT NOT NULL,
    "description" TEXT,
    "createdById" TEXT NOT NULL,
    "createdByName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BankDeposit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinanceReceipt" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "branchId" TEXT,
    "financeCompanyId" TEXT NOT NULL,
    "receiptNumber" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "method" "FinanceReceiptMethod" NOT NULL,
    "status" "FinanceReceiptStatus" NOT NULL DEFAULT 'COMPLETED',
    "receiptDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "referenceNo" TEXT,
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "createdByName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "appliedAt" TIMESTAMP(3),
    "reversedAt" TIMESTAMP(3),

    CONSTRAINT "FinanceReceipt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinanceReceiptAllocation" (
    "id" TEXT NOT NULL,
    "receiptId" TEXT NOT NULL,
    "financeDetailId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FinanceReceiptAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IncomingCheque" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "financeCompanyId" TEXT NOT NULL,
    "receiptId" TEXT NOT NULL,
    "chequeNumber" TEXT NOT NULL,
    "bankName" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "chequeDate" TIMESTAMP(3) NOT NULL,
    "status" "IncomingChequeStatus" NOT NULL DEFAULT 'RECEIVED',
    "presentedAt" TIMESTAMP(3),
    "clearedAt" TIMESTAMP(3),
    "bouncedAt" TIMESTAMP(3),
    "bounceReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IncomingCheque_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IncomingChequeEvent" (
    "id" TEXT NOT NULL,
    "chequeId" TEXT NOT NULL,
    "fromStatus" "IncomingChequeStatus",
    "toStatus" "IncomingChequeStatus" NOT NULL,
    "note" TEXT,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IncomingChequeEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PlatformUser_email_key" ON "PlatformUser"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Organization_domain_key" ON "Organization"("domain");

-- CreateIndex
CREATE UNIQUE INDEX "Organization_subdomain_key" ON "Organization"("subdomain");

-- CreateIndex
CREATE UNIQUE INDEX "Organization_customDomain_key" ON "Organization"("customDomain");

-- CreateIndex
CREATE INDEX "AuditLog_organizationId_createdAt_idx" ON "AuditLog"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_organizationId_action_idx" ON "AuditLog"("organizationId", "action");

-- CreateIndex
CREATE INDEX "AuditLog_organizationId_userId_idx" ON "AuditLog"("organizationId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Vehicle_chassisNumber_key" ON "Vehicle"("chassisNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Vehicle_batterySerialNumber_key" ON "Vehicle"("batterySerialNumber");

-- CreateIndex
CREATE INDEX "Vehicle_organizationId_status_idx" ON "Vehicle"("organizationId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Vehicle_organizationId_unitGrnNumber_key" ON "Vehicle"("organizationId", "unitGrnNumber");

-- CreateIndex
CREATE INDEX "GRN_organizationId_date_idx" ON "GRN"("organizationId", "date");

-- CreateIndex
CREATE INDEX "GRN_supplierId_paymentStatus_idx" ON "GRN"("supplierId", "paymentStatus");

-- CreateIndex
CREATE UNIQUE INDEX "GRN_organizationId_grnNumber_key" ON "GRN"("organizationId", "grnNumber");

-- CreateIndex
CREATE INDEX "SupplierPayment_organizationId_paymentDate_idx" ON "SupplierPayment"("organizationId", "paymentDate");

-- CreateIndex
CREATE INDEX "SupplierPayment_supplierId_idx" ON "SupplierPayment"("supplierId");

-- CreateIndex
CREATE UNIQUE INDEX "SupplierPayment_organizationId_paymentNumber_key" ON "SupplierPayment"("organizationId", "paymentNumber");

-- CreateIndex
CREATE INDEX "SupplierPaymentAllocation_paymentId_idx" ON "SupplierPaymentAllocation"("paymentId");

-- CreateIndex
CREATE INDEX "SupplierPaymentAllocation_grnId_idx" ON "SupplierPaymentAllocation"("grnId");

-- CreateIndex
CREATE UNIQUE INDEX "Cheque_paymentId_key" ON "Cheque"("paymentId");

-- CreateIndex
CREATE INDEX "Cheque_organizationId_status_idx" ON "Cheque"("organizationId", "status");

-- CreateIndex
CREATE INDEX "Cheque_supplierId_idx" ON "Cheque"("supplierId");

-- CreateIndex
CREATE INDEX "ChequeEvent_chequeId_idx" ON "ChequeEvent"("chequeId");

-- CreateIndex
CREATE INDEX "SupplierAdvance_supplierId_idx" ON "SupplierAdvance"("supplierId");

-- CreateIndex
CREATE INDEX "SupplierAdvanceAllocation_advanceId_idx" ON "SupplierAdvanceAllocation"("advanceId");

-- CreateIndex
CREATE INDEX "SupplierAdvanceAllocation_grnId_idx" ON "SupplierAdvanceAllocation"("grnId");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_crn_key" ON "Customer"("crn");

-- CreateIndex
CREATE UNIQUE INDEX "Sale_invoiceNumber_key" ON "Sale"("invoiceNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Sale_advancePaymentId_key" ON "Sale"("advancePaymentId");

-- CreateIndex
CREATE INDEX "Sale_organizationId_financeCompanyId_idx" ON "Sale"("organizationId", "financeCompanyId");

-- CreateIndex
CREATE INDEX "Sale_organizationId_insuranceCompanyId_idx" ON "Sale"("organizationId", "insuranceCompanyId");

-- CreateIndex
CREATE INDEX "Sale_commissionRecipientId_idx" ON "Sale"("commissionRecipientId");

-- CreateIndex
CREATE UNIQUE INDEX "FinanceCompany_organizationId_name_key" ON "FinanceCompany"("organizationId", "name");

-- CreateIndex
CREATE INDEX "FinanceOfficer_financeCompanyId_idx" ON "FinanceOfficer"("financeCompanyId");

-- CreateIndex
CREATE UNIQUE INDEX "InsuranceCompany_organizationId_name_key" ON "InsuranceCompany"("organizationId", "name");

-- CreateIndex
CREATE INDEX "InsuranceOfficer_insuranceCompanyId_idx" ON "InsuranceOfficer"("insuranceCompanyId");

-- CreateIndex
CREATE INDEX "AdvancePayment_organizationId_status_idx" ON "AdvancePayment"("organizationId", "status");

-- CreateIndex
CREATE INDEX "AdvancePayment_customerId_status_idx" ON "AdvancePayment"("customerId", "status");

-- CreateIndex
CREATE INDEX "AdvancePayment_vehicleId_idx" ON "AdvancePayment"("vehicleId");

-- CreateIndex
CREATE INDEX "AdvanceRefund_advanceId_refundDate_idx" ON "AdvanceRefund"("advanceId", "refundDate");

-- CreateIndex
CREATE INDEX "AdvanceTransfer_fromAdvanceId_transferDate_idx" ON "AdvanceTransfer"("fromAdvanceId", "transferDate");

-- CreateIndex
CREATE INDEX "AdvanceTransfer_toCustomerId_transferDate_idx" ON "AdvanceTransfer"("toCustomerId", "transferDate");

-- CreateIndex
CREATE UNIQUE INDEX "FinanceDetail_saleId_key" ON "FinanceDetail"("saleId");

-- CreateIndex
CREATE INDEX "FinanceDetail_financeCompanyId_status_idx" ON "FinanceDetail"("financeCompanyId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "DMTRegistration_saleId_key" ON "DMTRegistration"("saleId");

-- CreateIndex
CREATE INDEX "SparePart_organizationId_name_idx" ON "SparePart"("organizationId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "SparePart_organizationId_sku_key" ON "SparePart"("organizationId", "sku");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceJob_serviceRecordId_key" ON "ServiceJob"("serviceRecordId");

-- CreateIndex
CREATE INDEX "ServiceJob_organizationId_createdAt_idx" ON "ServiceJob"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "ServicePart_sparePartId_idx" ON "ServicePart"("sparePartId");

-- CreateIndex
CREATE UNIQUE INDEX "ServicePart_serviceJobId_sparePartId_key" ON "ServicePart"("serviceJobId", "sparePartId");

-- CreateIndex
CREATE INDEX "TestRide_organizationId_scheduledDate_idx" ON "TestRide"("organizationId", "scheduledDate");

-- CreateIndex
CREATE INDEX "TestRide_branchId_scheduledDate_idx" ON "TestRide"("branchId", "scheduledDate");

-- CreateIndex
CREATE INDEX "CommissionSettlement_organizationId_type_status_idx" ON "CommissionSettlement"("organizationId", "type", "status");

-- CreateIndex
CREATE UNIQUE INDEX "CommissionSettlement_saleId_type_key" ON "CommissionSettlement"("saleId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "BankAccount_organizationId_accountNumber_key" ON "BankAccount"("organizationId", "accountNumber");

-- CreateIndex
CREATE INDEX "BankDeposit_organizationId_depositDate_idx" ON "BankDeposit"("organizationId", "depositDate");

-- CreateIndex
CREATE INDEX "BankDeposit_branchId_depositDate_idx" ON "BankDeposit"("branchId", "depositDate");

-- CreateIndex
CREATE UNIQUE INDEX "BankDeposit_organizationId_bankAccountId_slipNumber_key" ON "BankDeposit"("organizationId", "bankAccountId", "slipNumber");

-- CreateIndex
CREATE INDEX "FinanceReceipt_organizationId_receiptDate_idx" ON "FinanceReceipt"("organizationId", "receiptDate");

-- CreateIndex
CREATE INDEX "FinanceReceipt_financeCompanyId_status_idx" ON "FinanceReceipt"("financeCompanyId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "FinanceReceipt_organizationId_receiptNumber_key" ON "FinanceReceipt"("organizationId", "receiptNumber");

-- CreateIndex
CREATE INDEX "FinanceReceiptAllocation_receiptId_idx" ON "FinanceReceiptAllocation"("receiptId");

-- CreateIndex
CREATE INDEX "FinanceReceiptAllocation_financeDetailId_idx" ON "FinanceReceiptAllocation"("financeDetailId");

-- CreateIndex
CREATE UNIQUE INDEX "IncomingCheque_receiptId_key" ON "IncomingCheque"("receiptId");

-- CreateIndex
CREATE INDEX "IncomingCheque_organizationId_status_idx" ON "IncomingCheque"("organizationId", "status");

-- CreateIndex
CREATE INDEX "IncomingChequeEvent_chequeId_idx" ON "IncomingChequeEvent"("chequeId");

-- AddForeignKey
ALTER TABLE "CommissionSettings" ADD CONSTRAINT "CommissionSettings_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Branch" ADD CONSTRAINT "Branch_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Supplier" ADD CONSTRAINT "Supplier_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleModel" ADD CONSTRAINT "VehicleModel_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_grnId_fkey" FOREIGN KEY ("grnId") REFERENCES "GRN"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_vehicleModelId_fkey" FOREIGN KEY ("vehicleModelId") REFERENCES "VehicleModel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GRN" ADD CONSTRAINT "GRN_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GRN" ADD CONSTRAINT "GRN_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GRN" ADD CONSTRAINT "GRN_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierPayment" ADD CONSTRAINT "SupplierPayment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierPayment" ADD CONSTRAINT "SupplierPayment_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierPayment" ADD CONSTRAINT "SupplierPayment_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierPaymentAllocation" ADD CONSTRAINT "SupplierPaymentAllocation_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "SupplierPayment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierPaymentAllocation" ADD CONSTRAINT "SupplierPaymentAllocation_grnId_fkey" FOREIGN KEY ("grnId") REFERENCES "GRN"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cheque" ADD CONSTRAINT "Cheque_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cheque" ADD CONSTRAINT "Cheque_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cheque" ADD CONSTRAINT "Cheque_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "SupplierPayment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChequeEvent" ADD CONSTRAINT "ChequeEvent_chequeId_fkey" FOREIGN KEY ("chequeId") REFERENCES "Cheque"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierAdvance" ADD CONSTRAINT "SupplierAdvance_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierAdvance" ADD CONSTRAINT "SupplierAdvance_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierAdvance" ADD CONSTRAINT "SupplierAdvance_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "SupplierPayment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierAdvanceAllocation" ADD CONSTRAINT "SupplierAdvanceAllocation_advanceId_fkey" FOREIGN KEY ("advanceId") REFERENCES "SupplierAdvance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierAdvanceAllocation" ADD CONSTRAINT "SupplierAdvanceAllocation_grnId_fkey" FOREIGN KEY ("grnId") REFERENCES "GRN"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GRNItem" ADD CONSTRAINT "GRNItem_grnId_fkey" FOREIGN KEY ("grnId") REFERENCES "GRN"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GRNItem" ADD CONSTRAINT "GRNItem_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_advancePaymentId_fkey" FOREIGN KEY ("advancePaymentId") REFERENCES "AdvancePayment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_financeCompanyId_fkey" FOREIGN KEY ("financeCompanyId") REFERENCES "FinanceCompany"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_insuranceCompanyId_fkey" FOREIGN KEY ("insuranceCompanyId") REFERENCES "InsuranceCompany"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_commissionRecipientId_fkey" FOREIGN KEY ("commissionRecipientId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceCompany" ADD CONSTRAINT "FinanceCompany_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceOfficer" ADD CONSTRAINT "FinanceOfficer_financeCompanyId_fkey" FOREIGN KEY ("financeCompanyId") REFERENCES "FinanceCompany"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InsuranceCompany" ADD CONSTRAINT "InsuranceCompany_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InsuranceOfficer" ADD CONSTRAINT "InsuranceOfficer_insuranceCompanyId_fkey" FOREIGN KEY ("insuranceCompanyId") REFERENCES "InsuranceCompany"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdvancePayment" ADD CONSTRAINT "AdvancePayment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdvancePayment" ADD CONSTRAINT "AdvancePayment_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdvancePayment" ADD CONSTRAINT "AdvancePayment_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdvancePayment" ADD CONSTRAINT "AdvancePayment_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdvancePayment" ADD CONSTRAINT "AdvancePayment_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdvanceRefund" ADD CONSTRAINT "AdvanceRefund_advanceId_fkey" FOREIGN KEY ("advanceId") REFERENCES "AdvancePayment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdvanceTransfer" ADD CONSTRAINT "AdvanceTransfer_fromAdvanceId_fkey" FOREIGN KEY ("fromAdvanceId") REFERENCES "AdvancePayment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdvanceTransfer" ADD CONSTRAINT "AdvanceTransfer_toCustomerId_fkey" FOREIGN KEY ("toCustomerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleItem" ADD CONSTRAINT "SaleItem_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleItem" ADD CONSTRAINT "SaleItem_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceDetail" ADD CONSTRAINT "FinanceDetail_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceDetail" ADD CONSTRAINT "FinanceDetail_financeCompanyId_fkey" FOREIGN KEY ("financeCompanyId") REFERENCES "FinanceCompany"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DMTRegistration" ADD CONSTRAINT "DMTRegistration_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceRecord" ADD CONSTRAINT "ServiceRecord_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceRecord" ADD CONSTRAINT "ServiceRecord_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceRecord" ADD CONSTRAINT "ServiceRecord_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceRecord" ADD CONSTRAINT "ServiceRecord_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceRecord" ADD CONSTRAINT "ServiceRecord_assignedTechnicianId_fkey" FOREIGN KEY ("assignedTechnicianId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SparePart" ADD CONSTRAINT "SparePart_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceJob" ADD CONSTRAINT "ServiceJob_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceJob" ADD CONSTRAINT "ServiceJob_serviceRecordId_fkey" FOREIGN KEY ("serviceRecordId") REFERENCES "ServiceRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServicePart" ADD CONSTRAINT "ServicePart_serviceJobId_fkey" FOREIGN KEY ("serviceJobId") REFERENCES "ServiceJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServicePart" ADD CONSTRAINT "ServicePart_sparePartId_fkey" FOREIGN KEY ("sparePartId") REFERENCES "SparePart"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_grnId_fkey" FOREIGN KEY ("grnId") REFERENCES "GRN"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestRide" ADD CONSTRAINT "TestRide_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestRide" ADD CONSTRAINT "TestRide_vehicleModelId_fkey" FOREIGN KEY ("vehicleModelId") REFERENCES "VehicleModel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestRide" ADD CONSTRAINT "TestRide_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestRide" ADD CONSTRAINT "TestRide_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommissionSettlement" ADD CONSTRAINT "CommissionSettlement_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommissionSettlement" ADD CONSTRAINT "CommissionSettlement_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankAccount" ADD CONSTRAINT "BankAccount_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankDeposit" ADD CONSTRAINT "BankDeposit_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankDeposit" ADD CONSTRAINT "BankDeposit_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankDeposit" ADD CONSTRAINT "BankDeposit_bankAccountId_fkey" FOREIGN KEY ("bankAccountId") REFERENCES "BankAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceReceipt" ADD CONSTRAINT "FinanceReceipt_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceReceipt" ADD CONSTRAINT "FinanceReceipt_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceReceipt" ADD CONSTRAINT "FinanceReceipt_financeCompanyId_fkey" FOREIGN KEY ("financeCompanyId") REFERENCES "FinanceCompany"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceReceiptAllocation" ADD CONSTRAINT "FinanceReceiptAllocation_receiptId_fkey" FOREIGN KEY ("receiptId") REFERENCES "FinanceReceipt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceReceiptAllocation" ADD CONSTRAINT "FinanceReceiptAllocation_financeDetailId_fkey" FOREIGN KEY ("financeDetailId") REFERENCES "FinanceDetail"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncomingCheque" ADD CONSTRAINT "IncomingCheque_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncomingCheque" ADD CONSTRAINT "IncomingCheque_financeCompanyId_fkey" FOREIGN KEY ("financeCompanyId") REFERENCES "FinanceCompany"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncomingCheque" ADD CONSTRAINT "IncomingCheque_receiptId_fkey" FOREIGN KEY ("receiptId") REFERENCES "FinanceReceipt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncomingChequeEvent" ADD CONSTRAINT "IncomingChequeEvent_chequeId_fkey" FOREIGN KEY ("chequeId") REFERENCES "IncomingCheque"("id") ON DELETE CASCADE ON UPDATE CASCADE;
