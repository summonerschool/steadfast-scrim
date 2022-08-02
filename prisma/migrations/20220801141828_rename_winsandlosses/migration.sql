/*
  Warnings:

  - You are about to drop the column `loss` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `win` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "User" DROP COLUMN "loss";
ALTER TABLE "User" DROP COLUMN "win";
ALTER TABLE "User" ADD COLUMN     "losses" INT4 NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN     "wins" INT4 NOT NULL DEFAULT 0;
