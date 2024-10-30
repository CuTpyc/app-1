/*
  Warnings:

  - You are about to drop the column `shopifyId` on the `Shop` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[domain]` on the table `Shop` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "Shop_shopifyId_key";

-- AlterTable
ALTER TABLE "Shop" DROP COLUMN "shopifyId";

-- CreateIndex
CREATE UNIQUE INDEX "Shop_domain_key" ON "Shop"("domain");
