/*
  Warnings:

  - You are about to drop the column `team` on the `Player` table. All the data in the column will be lost.
  - The `winner` column on the `Scrim` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Added the required column `side` to the `Player` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "Side" AS ENUM ('RED', 'BLUE');

-- AlterTable
ALTER TABLE "Player" DROP COLUMN "team";
ALTER TABLE "Player" ADD COLUMN     "side" "Side" NOT NULL;

-- AlterTable
ALTER TABLE "Scrim" DROP COLUMN "winner";
ALTER TABLE "Scrim" ADD COLUMN     "winner" "Side";

-- DropEnum
DROP TYPE "Team";
