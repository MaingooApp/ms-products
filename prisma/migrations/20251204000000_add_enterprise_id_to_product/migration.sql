-- DropIndex (quitar el índice único de eanCode si existe)
DROP INDEX IF EXISTS "Product_eanCode_key";

-- AlterTable
ALTER TABLE "Product" ADD COLUMN "enterpriseId" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "Product_enterpriseId_idx" ON "Product"("enterpriseId");

-- CreateIndex (EAN único por empresa)
CREATE UNIQUE INDEX "Product_eanCode_enterpriseId_key" ON "Product"("eanCode", "enterpriseId");
