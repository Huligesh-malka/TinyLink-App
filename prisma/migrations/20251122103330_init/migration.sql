-- CreateTable
CREATE TABLE "Link" (
    "id" SERIAL NOT NULL,
    "original_url" TEXT NOT NULL,
    "short_code" TEXT NOT NULL,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "last_clicked" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Link_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Link_short_code_key" ON "Link"("short_code");
