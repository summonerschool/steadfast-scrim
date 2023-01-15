/*
  Warnings:

  - You are about to drop the column `id` on the `Draft` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Player" ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Player" ADD COLUMN     "is_auto_fill" BOOL NOT NULL DEFAULT false;
ALTER TABLE "Player" ADD COLUMN     "is_off_role" BOOL NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Scrim" ADD COLUMN     "season" INT4 NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "SeasonStats" (
    "user_id" STRING NOT NULL,
    "season" INT4 NOT NULL,
    "wins" INT4 NOT NULL,
    "losses" INT4 NOT NULL,
    "elo" INT4 NOT NULL,

    CONSTRAINT "SeasonStats_pkey" PRIMARY KEY ("user_id","season")
);

-- RedefineTables
CREATE TABLE "_prisma_new_Draft" (
    "scrim_id" INT4 NOT NULL,
    "draft_room_id" STRING NOT NULL,
    "blue_picks" STRING[] DEFAULT ARRAY[]::STRING[],
    "red_picks" STRING[] DEFAULT ARRAY[]::STRING[],
    "blue_bans" STRING[] DEFAULT ARRAY[]::STRING[],
    "red_bans" STRING[] DEFAULT ARRAY[]::STRING[],

    CONSTRAINT "Draft_pkey" PRIMARY KEY ("scrim_id","draft_room_id")
);
DROP INDEX "Draft_scrim_id_key";
INSERT INTO "_prisma_new_Draft" ("blue_bans","blue_picks","draft_room_id","red_bans","red_picks","scrim_id") SELECT "blue_bans","blue_picks","draft_room_id","red_bans","red_picks","scrim_id" FROM "Draft";
DROP TABLE "Draft" CASCADE;
ALTER TABLE "_prisma_new_Draft" RENAME TO "Draft";
CREATE UNIQUE INDEX "Draft_scrim_id_key" ON "Draft"("scrim_id");
ALTER TABLE "Draft" ADD CONSTRAINT "Draft_scrim_id_fkey" FOREIGN KEY ("scrim_id") REFERENCES "Scrim"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex
CREATE UNIQUE INDEX "SeasonStats_user_id_key" ON "SeasonStats"("user_id");

-- AddForeignKey
ALTER TABLE "SeasonStats" ADD CONSTRAINT "SeasonStats_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
