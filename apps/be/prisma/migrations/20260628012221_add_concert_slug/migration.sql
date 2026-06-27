-- AlterTable
ALTER TABLE "concerts" ADD COLUMN     "slug" VARCHAR(200);

-- CreateIndex
CREATE UNIQUE INDEX "concerts_slug_key" ON "concerts"("slug");
