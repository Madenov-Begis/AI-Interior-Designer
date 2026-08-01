-- AlterTable
ALTER TABLE "Profile" ADD COLUMN "phone" TEXT,
ALTER COLUMN "email" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Profile_phone_key" ON "Profile"("phone");
