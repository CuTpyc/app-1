/*
  Warnings:

  - A unique constraint covering the columns `[shopifyId]` on the table `Shop` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Shop" ADD COLUMN     "shopifyId" TEXT NOT NULL DEFAULT '';

-- CreateIndex
CREATE UNIQUE INDEX "Shop_shopifyId_key" ON "Shop"("shopifyId");
