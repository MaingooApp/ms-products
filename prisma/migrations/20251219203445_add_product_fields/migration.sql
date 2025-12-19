-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "unitCount" TEXT,
ADD COLUMN     "lastUnitPrice" DECIMAL(12,2),
ADD COLUMN     "additionalReference" TEXT;
