-- AlterTable
ALTER TABLE "HostingPackage" ADD COLUMN     "daPackageName" TEXT,
ADD COLUMN     "daServerId" TEXT,
ADD COLUMN     "isDirectAdmin" BOOLEAN NOT NULL DEFAULT false;

-- AddForeignKey
ALTER TABLE "HostingPackage" ADD CONSTRAINT "HostingPackage_daServerId_fkey" FOREIGN KEY ("daServerId") REFERENCES "Server"("id") ON DELETE SET NULL ON UPDATE CASCADE;
