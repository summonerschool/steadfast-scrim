/*
  Warnings:

  - You are about to drop the column `blueBans` on the `Draft` table. All the data in the column will be lost.
  - You are about to drop the column `bluePicks` on the `Draft` table. All the data in the column will be lost.
  - You are about to drop the column `redBans` on the `Draft` table. All the data in the column will be lost.
  - You are about to drop the column `redPicks` on the `Draft` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Draft" DROP CONSTRAINT "Draft_scrim_id_fkey";

-- DropForeignKey
ALTER TABLE "Player" DROP CONSTRAINT "Player_scrim_id_fkey";

-- AlterTable
ALTER TABLE "Draft" DROP COLUMN "blueBans";
ALTER TABLE "Draft" DROP COLUMN "bluePicks";
ALTER TABLE "Draft" DROP COLUMN "redBans";
ALTER TABLE "Draft" DROP COLUMN "redPicks";
ALTER TABLE "Draft" ADD COLUMN     "blue_bans" STRING[] DEFAULT ARRAY[]::STRING[];
ALTER TABLE "Draft" ADD COLUMN     "blue_picks" STRING[] DEFAULT ARRAY[]::STRING[];
ALTER TABLE "Draft" ADD COLUMN     "red_bans" STRING[] DEFAULT ARRAY[]::STRING[];
ALTER TABLE "Draft" ADD COLUMN     "red_picks" STRING[] DEFAULT ARRAY[]::STRING[];

-- AddForeignKey
ALTER TABLE "Player" ADD CONSTRAINT "Player_scrim_id_fkey" FOREIGN KEY ("scrim_id") REFERENCES "Scrim"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Draft" ADD CONSTRAINT "Draft_scrim_id_fkey" FOREIGN KEY ("scrim_id") REFERENCES "Scrim"("id") ON DELETE CASCADE ON UPDATE CASCADE;
