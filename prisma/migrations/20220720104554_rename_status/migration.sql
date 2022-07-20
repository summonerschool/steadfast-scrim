/*
  Warnings:

  - The values [LOBBY,INGAME,REMADE] on the enum `Status` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
ALTER TYPE "Status" ADD VALUE 'STARTED';
ALTER TYPE "Status" ADD VALUE 'REMAKE';
ALTER TYPE "Status" DROP VALUE 'LOBBY';
ALTER TYPE "Status" DROP VALUE 'INGAME';
ALTER TYPE "Status" DROP VALUE 'REMADE';

-- AlterTable
ALTER TABLE "Scrim" ALTER COLUMN "status" SET DEFAULT 'STARTED';
