/*
  Warnings:

  - You are about to drop the column `billingCycle` on the `HostingPackage` table. All the data in the column will be lost.
  - You are about to drop the column `daPackageName` on the `HostingPackage` table. All the data in the column will be lost.
  - You are about to drop the column `daServerId` on the `HostingPackage` table. All the data in the column will be lost.
  - You are about to drop the column `isDirectAdmin` on the `HostingPackage` table. All the data in the column will be lost.
  - You are about to drop the column `subdomains` on the `HostingPackage` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "HostingPackage" DROP CONSTRAINT "HostingPackage_daServerId_fkey";

-- AlterTable
ALTER TABLE "HostingPackage" DROP COLUMN "billingCycle",
DROP COLUMN "daPackageName",
DROP COLUMN "daServerId",
DROP COLUMN "isDirectAdmin",
DROP COLUMN "subdomains",
ADD COLUMN     "directAdminPackageName" TEXT;

-- CreateTable
CREATE TABLE "PackageServerMapping" (
    "id" TEXT NOT NULL,
    "hostingPackageId" TEXT NOT NULL,
    "serverId" TEXT NOT NULL,
    "directAdminPackageName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PackageServerMapping_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PackageServerMapping_hostingPackageId_idx" ON "PackageServerMapping"("hostingPackageId");

-- CreateIndex
CREATE INDEX "PackageServerMapping_serverId_idx" ON "PackageServerMapping"("serverId");

-- CreateIndex
CREATE UNIQUE INDEX "PackageServerMapping_hostingPackageId_serverId_key" ON "PackageServerMapping"("hostingPackageId", "serverId");

-- AddForeignKey
ALTER TABLE "PackageServerMapping" ADD CONSTRAINT "PackageServerMapping_hostingPackageId_fkey" FOREIGN KEY ("hostingPackageId") REFERENCES "HostingPackage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PackageServerMapping" ADD CONSTRAINT "PackageServerMapping_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "Server"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
