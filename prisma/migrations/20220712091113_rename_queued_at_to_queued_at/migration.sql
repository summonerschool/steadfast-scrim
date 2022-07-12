/*
  Warnings:

  - You are about to drop the column `queuedAt` on the `Queuer` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Queuer" DROP COLUMN "queuedAt";
ALTER TABLE "Queuer" ADD COLUMN     "queued_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
