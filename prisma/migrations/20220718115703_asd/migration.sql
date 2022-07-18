/*
  Warnings:

  - You are about to drop the column `id` on the `Queue` table. All the data in the column will be lost.
  - Added the required column `region` to the `Queue` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Queuer" DROP CONSTRAINT "Queuer_queue_id_fkey";

-- DropForeignKey
ALTER TABLE "Scrim" DROP CONSTRAINT "Scrim_queue_id_fkey";

-- RedefineTables
CREATE TABLE "_prisma_new_Queue" (
    "guild_id" STRING NOT NULL,
    "region" "Region" NOT NULL,

    CONSTRAINT "Queue_pkey" PRIMARY KEY ("guild_id")
);
DROP INDEX "Queue_guild_id_key";
INSERT INTO "_prisma_new_Queue" ("guild_id") SELECT "guild_id" FROM "Queue";
DROP TABLE "Queue" CASCADE;
ALTER TABLE "_prisma_new_Queue" RENAME TO "Queue";

-- AddForeignKey
ALTER TABLE "Scrim" ADD CONSTRAINT "Scrim_queue_id_fkey" FOREIGN KEY ("queue_id") REFERENCES "Queue"("guild_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Queuer" ADD CONSTRAINT "Queuer_queue_id_fkey" FOREIGN KEY ("queue_id") REFERENCES "Queue"("guild_id") ON DELETE RESTRICT ON UPDATE CASCADE;
