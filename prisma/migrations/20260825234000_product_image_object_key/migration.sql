-- AlterTable
ALTER TABLE "ProductImage" ADD COLUMN "objectKey" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "ProductImage_objectKey_key" ON "ProductImage"("objectKey");
