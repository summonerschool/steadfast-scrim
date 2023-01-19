/*
  Warnings:

  - You are about to drop the column `voice_ids` on the `Scrim` table. All the data in the column will be lost.
  - Added the required column `blue_team_name` to the `Scrim` table without a default value. This is not possible if the table is not empty.
  - Added the required column `red_team_name` to the `Scrim` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Scrim" DROP COLUMN "voice_ids";
ALTER TABLE "Scrim" ADD COLUMN     "blue_team_name" STRING NOT NULL;
ALTER TABLE "Scrim" ADD COLUMN     "red_team_name" STRING NOT NULL;
