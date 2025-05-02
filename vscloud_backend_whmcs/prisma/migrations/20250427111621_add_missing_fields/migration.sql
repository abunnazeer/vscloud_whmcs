/*
  Warnings:

  - You are about to drop the `DnsRecord` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Domain` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "DnsRecord" DROP CONSTRAINT "DnsRecord_domainId_fkey";

-- DropForeignKey
ALTER TABLE "Domain" DROP CONSTRAINT "Domain_userId_fkey";

-- DropForeignKey
ALTER TABLE "HostingAccount" DROP CONSTRAINT "HostingAccount_domainId_fkey";

-- DropForeignKey
ALTER TABLE "Nameserver" DROP CONSTRAINT "Nameserver_domainId_fkey";

-- DropTable
DROP TABLE "DnsRecord";

-- DropTable
DROP TABLE "Domain";

-- CreateTable
CREATE TABLE "domains" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "registrar" TEXT,
    "registrationDate" TIMESTAMP(3) NOT NULL,
    "expiryDate" TIMESTAMP(3) NOT NULL,
    "autoRenew" BOOLEAN NOT NULL DEFAULT true,
    "status" "DomainStatus" NOT NULL DEFAULT 'ACTIVE',
    "privacyProtection" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "transferStatus" TEXT,
    "transferDetails" TEXT,
    "renewalDetails" TEXT,
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "lastUpdated" TIMESTAMP(3),

    CONSTRAINT "domains_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dns_records" (
    "id" TEXT NOT NULL,
    "domainId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "ttl" INTEGER NOT NULL DEFAULT 3600,
    "priority" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dns_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "domains_name_key" ON "domains"("name");

-- CreateIndex
CREATE INDEX "domains_userId_idx" ON "domains"("userId");

-- CreateIndex
CREATE INDEX "domains_name_idx" ON "domains"("name");

-- CreateIndex
CREATE INDEX "dns_records_domainId_idx" ON "dns_records"("domainId");

-- CreateIndex
CREATE INDEX "dns_records_type_idx" ON "dns_records"("type");

-- AddForeignKey
ALTER TABLE "domains" ADD CONSTRAINT "domains_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Nameserver" ADD CONSTRAINT "Nameserver_domainId_fkey" FOREIGN KEY ("domainId") REFERENCES "domains"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dns_records" ADD CONSTRAINT "dns_records_domainId_fkey" FOREIGN KEY ("domainId") REFERENCES "domains"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HostingAccount" ADD CONSTRAINT "HostingAccount_domainId_fkey" FOREIGN KEY ("domainId") REFERENCES "domains"("id") ON DELETE SET NULL ON UPDATE CASCADE;
