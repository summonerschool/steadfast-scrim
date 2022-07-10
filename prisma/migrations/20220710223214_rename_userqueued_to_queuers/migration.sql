/*
  Warnings:

  - You are about to drop the `Scrims` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `UserQueued` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "Team" AS ENUM ('RED', 'BLUE');

-- AlterEnum
ALTER TYPE "Status" ADD VALUE 'INGAME';

-- DropForeignKey
ALTER TABLE "Scrims" DROP CONSTRAINT "Scrims_queue_id_fkey";

-- DropForeignKey
ALTER TABLE "UserQueued" DROP CONSTRAINT "UserQueued_player_id_fkey";

-- DropForeignKey
ALTER TABLE "UserQueued" DROP CONSTRAINT "UserQueued_queue_id_fkey";

-- DropForeignKey
ALTER TABLE "UserQueued" DROP CONSTRAINT "UserQueued_scrimsId_fkey";

-- DropTable
DROP TABLE "Scrims";

-- DropTable
DROP TABLE "UserQueued";

-- CreateTable
CREATE TABLE "Player" (
    "userId" STRING NOT NULL,
    "scrimId" INT8 NOT NULL,
    "role" "Role" NOT NULL,
    "team" "Team" NOT NULL,

    CONSTRAINT "Player_pkey" PRIMARY KEY ("userId","scrimId")
);

-- CreateTable
CREATE TABLE "Scrim" (
    "id" INT8 NOT NULL DEFAULT unique_rowid(),
    "status" "Status" NOT NULL,
    "voice_ids" STRING[],
    "queue_id" STRING NOT NULL,
    "userId" STRING NOT NULL,

    CONSTRAINT "Scrim_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Queuer" (
    "player_id" STRING NOT NULL,
    "queue_id" STRING NOT NULL,
    "popped" BOOL NOT NULL DEFAULT false,
    "queuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Queuer_pkey" PRIMARY KEY ("player_id","queue_id")
);

-- AddForeignKey
ALTER TABLE "Player" ADD CONSTRAINT "Player_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Player" ADD CONSTRAINT "Player_scrimId_fkey" FOREIGN KEY ("scrimId") REFERENCES "Scrim"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Scrim" ADD CONSTRAINT "Scrim_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Scrim" ADD CONSTRAINT "Scrim_queue_id_fkey" FOREIGN KEY ("queue_id") REFERENCES "Queue"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Queuer" ADD CONSTRAINT "Queuer_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Queuer" ADD CONSTRAINT "Queuer_queue_id_fkey" FOREIGN KEY ("queue_id") REFERENCES "Queue"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
