/*
  Warnings:

  - Added the required column `rank` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `role` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `server` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "Status" AS ENUM ('INPROGRESS', 'COMPLETED', 'REMADE');

-- CreateEnum
CREATE TYPE "Server" AS ENUM ('EUW', 'NA');

-- CreateEnum
CREATE TYPE "Rank" AS ENUM ('IRON', 'BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND', 'MASTER', 'GRANDMASTER', 'CHALLENGER');

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('TOP', 'JUNGLE', 'MID', 'BOT', 'SUPPORT');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "elo" INT4 NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN     "external_elo" INT4 NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN     "loss" INT4 NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN     "rank" "Rank" NOT NULL;
ALTER TABLE "User" ADD COLUMN     "role" "Role" NOT NULL;
ALTER TABLE "User" ADD COLUMN     "server" "Server" NOT NULL;
ALTER TABLE "User" ADD COLUMN     "win" INT4 NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "UserQueued" ADD COLUMN     "scrimsId" STRING;

-- CreateTable
CREATE TABLE "Scrims" (
    "id" STRING NOT NULL,
    "queue_id" STRING NOT NULL,
    "server" STRING NOT NULL,
    "status" "Status" NOT NULL,

    CONSTRAINT "Scrims_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Scrims" ADD CONSTRAINT "Scrims_queue_id_fkey" FOREIGN KEY ("queue_id") REFERENCES "Queue"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserQueued" ADD CONSTRAINT "UserQueued_scrimsId_fkey" FOREIGN KEY ("scrimsId") REFERENCES "Scrims"("id") ON DELETE SET NULL ON UPDATE CASCADE;
