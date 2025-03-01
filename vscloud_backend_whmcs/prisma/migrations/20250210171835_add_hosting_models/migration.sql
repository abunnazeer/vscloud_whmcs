-- CreateEnum
CREATE TYPE "HostingStatus" AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED', 'TERMINATED', 'FAILED');

-- CreateEnum
CREATE TYPE "ServerType" AS ENUM ('SHARED', 'VPS', 'DEDICATED', 'CLOUD');

-- CreateEnum
CREATE TYPE "ServerStatus" AS ENUM ('ACTIVE', 'MAINTENANCE', 'OFFLINE', 'DEPRECATED');

-- CreateEnum
CREATE TYPE "DatabaseType" AS ENUM ('MYSQL', 'POSTGRESQL', 'MONGODB');

-- CreateEnum
CREATE TYPE "MaintenanceType" AS ENUM ('SCHEDULED', 'EMERGENCY', 'UPGRADE', 'BACKUP', 'SECURITY_PATCH');

-- CreateEnum
CREATE TYPE "MaintenanceStatus" AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateTable
CREATE TABLE "HostingPackage" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "diskSpace" INTEGER NOT NULL,
    "bandwidth" INTEGER NOT NULL,
    "emailAccounts" INTEGER NOT NULL,
    "databases" INTEGER NOT NULL,
    "subdomains" INTEGER NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "billingCycle" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HostingPackage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HostingAccount" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "domainId" TEXT,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "serverIp" TEXT NOT NULL,
    "status" "HostingStatus" NOT NULL DEFAULT 'PENDING',
    "suspensionReason" TEXT,
    "diskUsage" INTEGER NOT NULL DEFAULT 0,
    "bandwidthUsage" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "serverId" TEXT NOT NULL,

    CONSTRAINT "HostingAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Server" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ipAddress" TEXT NOT NULL,
    "type" "ServerType" NOT NULL,
    "location" TEXT NOT NULL,
    "status" "ServerStatus" NOT NULL DEFAULT 'ACTIVE',
    "operatingSystem" TEXT NOT NULL,
    "totalDiskSpace" INTEGER NOT NULL,
    "usedDiskSpace" INTEGER NOT NULL DEFAULT 0,
    "totalBandwidth" INTEGER NOT NULL,
    "usedBandwidth" INTEGER NOT NULL DEFAULT 0,
    "cpuCores" INTEGER NOT NULL,
    "ram" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Server_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FTPAccount" (
    "id" TEXT NOT NULL,
    "hostingAccountId" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "directory" TEXT NOT NULL DEFAULT '/',
    "permissions" TEXT NOT NULL DEFAULT 'read_write',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FTPAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Database" (
    "id" TEXT NOT NULL,
    "hostingAccountId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "type" "DatabaseType" NOT NULL DEFAULT 'MYSQL',
    "size" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Database_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailAccount" (
    "id" TEXT NOT NULL,
    "hostingAccountId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "forwardTo" TEXT,
    "quotaSize" INTEGER NOT NULL DEFAULT 1024,
    "usedQuota" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaintenanceLog" (
    "id" TEXT NOT NULL,
    "serverId" TEXT NOT NULL,
    "type" "MaintenanceType" NOT NULL,
    "description" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3),
    "status" "MaintenanceStatus" NOT NULL DEFAULT 'SCHEDULED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MaintenanceLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "HostingAccount_username_key" ON "HostingAccount"("username");

-- CreateIndex
CREATE INDEX "HostingAccount_userId_idx" ON "HostingAccount"("userId");

-- CreateIndex
CREATE INDEX "HostingAccount_packageId_idx" ON "HostingAccount"("packageId");

-- CreateIndex
CREATE INDEX "HostingAccount_serverId_idx" ON "HostingAccount"("serverId");

-- CreateIndex
CREATE UNIQUE INDEX "FTPAccount_username_key" ON "FTPAccount"("username");

-- CreateIndex
CREATE INDEX "FTPAccount_hostingAccountId_idx" ON "FTPAccount"("hostingAccountId");

-- CreateIndex
CREATE INDEX "Database_hostingAccountId_idx" ON "Database"("hostingAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "EmailAccount_email_key" ON "EmailAccount"("email");

-- CreateIndex
CREATE INDEX "EmailAccount_hostingAccountId_idx" ON "EmailAccount"("hostingAccountId");

-- CreateIndex
CREATE INDEX "MaintenanceLog_serverId_idx" ON "MaintenanceLog"("serverId");

-- AddForeignKey
ALTER TABLE "HostingAccount" ADD CONSTRAINT "HostingAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HostingAccount" ADD CONSTRAINT "HostingAccount_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "HostingPackage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HostingAccount" ADD CONSTRAINT "HostingAccount_domainId_fkey" FOREIGN KEY ("domainId") REFERENCES "Domain"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HostingAccount" ADD CONSTRAINT "HostingAccount_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "Server"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FTPAccount" ADD CONSTRAINT "FTPAccount_hostingAccountId_fkey" FOREIGN KEY ("hostingAccountId") REFERENCES "HostingAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Database" ADD CONSTRAINT "Database_hostingAccountId_fkey" FOREIGN KEY ("hostingAccountId") REFERENCES "HostingAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailAccount" ADD CONSTRAINT "EmailAccount_hostingAccountId_fkey" FOREIGN KEY ("hostingAccountId") REFERENCES "HostingAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceLog" ADD CONSTRAINT "MaintenanceLog_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "Server"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
