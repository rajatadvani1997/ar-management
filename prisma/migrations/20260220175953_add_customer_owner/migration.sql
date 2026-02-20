-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "ownedById" TEXT;

-- CreateIndex
CREATE INDEX "Customer_ownedById_idx" ON "Customer"("ownedById");

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_ownedById_fkey" FOREIGN KEY ("ownedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
