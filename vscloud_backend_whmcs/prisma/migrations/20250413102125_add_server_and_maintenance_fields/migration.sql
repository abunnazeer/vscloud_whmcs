/*
  Warnings:

  - Added the required column `hostname` to the `Server` table without a default value. This is not possible if the table is not empty.
  - Added the required column `password` to the `Server` table without a default value. This is not possible if the table is not empty.
  - Added the required column `username` to the `Server` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ServerType" ADD VALUE 'DIRECTADMIN';
ALTER TYPE "ServerType" ADD VALUE 'CPANEL';
ALTER TYPE "ServerType" ADD VALUE 'PLESK';
ALTER TYPE "ServerType" ADD VALUE 'AWS';
ALTER TYPE "ServerType" ADD VALUE 'OTHER';

-- AlterTable
ALTER TABLE "MaintenanceLog" ADD COLUMN     "notificationSent" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Server" ADD COLUMN     "hostname" TEXT NOT NULL,
ADD COLUMN     "password" TEXT NOT NULL,
ADD COLUMN     "port" INTEGER NOT NULL DEFAULT 22,
ADD COLUMN     "username" TEXT NOT NULL;
