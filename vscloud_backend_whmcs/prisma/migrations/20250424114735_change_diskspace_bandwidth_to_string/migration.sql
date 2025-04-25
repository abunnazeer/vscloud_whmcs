/*
  Warnings:

  - You are about to drop the column `billingCycle` on the `HostingPackage` table. All the data in the column will be lost.
  - You are about to drop the column `isActive` on the `HostingPackage` table. All the data in the column will be lost.
  - You are about to drop the column `price` on the `HostingPackage` table. All the data in the column will be lost.
  - You are about to drop the column `subdomains` on the `HostingPackage` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[name]` on the table `HostingPackage` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `annualPrice` to the `HostingPackage` table without a default value. This is not possible if the table is not empty.
  - Added the required column `domains` to the `HostingPackage` table without a default value. This is not possible if the table is not empty.
  - Added the required column `monthlyPrice` to the `HostingPackage` table without a default value. This is not possible if the table is not empty.
  - Added the required column `quarterlyPrice` to the `HostingPackage` table without a default value. This is not possible if the table is not empty.
  - Added the required column `status` to the `HostingPackage` table without a default value. This is not possible if the table is not empty.
  - Added the required column `type` to the `HostingPackage` table without a default value. This is not possible if the table is not empty.
  - Made the column `description` on table `HostingPackage` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "HostingPackage" DROP COLUMN "billingCycle",
DROP COLUMN "isActive",
DROP COLUMN "price",
DROP COLUMN "subdomains",
ADD COLUMN     "annualPrice" DECIMAL(65,30) NOT NULL,
ADD COLUMN     "backups" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "dedicatedIp" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "domains" INTEGER NOT NULL,
ADD COLUMN     "monthlyPrice" DECIMAL(65,30) NOT NULL,
ADD COLUMN     "quarterlyPrice" DECIMAL(65,30) NOT NULL,
ADD COLUMN     "sslCertificate" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "status" TEXT NOT NULL,
ADD COLUMN     "type" TEXT NOT NULL,
ALTER COLUMN "description" SET NOT NULL,
ALTER COLUMN "diskSpace" SET DATA TYPE TEXT,
ALTER COLUMN "bandwidth" SET DATA TYPE TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "HostingPackage_name_key" ON "HostingPackage"("name");
