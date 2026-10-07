/*
  Warnings:

  - A unique constraint covering the columns `[mobile]` on the table `Customer` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[email]` on the table `Customer` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[userId]` on the table `Customer` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterEnum
ALTER TYPE "QuotationStatus" ADD VALUE 'NEGOTIATION';

-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'CUSTOMER';

-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "userId" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "Customer_mobile_key" ON "Customer"("mobile");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_email_key" ON "Customer"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_userId_key" ON "Customer"("userId");

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
