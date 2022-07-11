/*
  Warnings:

  - You are about to drop the column `lobby_creator_id` on the `Scrim` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Scrim" DROP CONSTRAINT "Scrim_lobby_creator_id_fkey";

-- AlterTable
ALTER TABLE "Scrim" DROP COLUMN "lobby_creator_id";
