-- CreateEnum
CREATE TYPE "Status" AS ENUM ('LOBBY', 'COMPLETED', 'REMADE');

-- CreateEnum
CREATE TYPE "Server" AS ENUM ('EUW', 'NA');

-- CreateEnum
CREATE TYPE "Rank" AS ENUM ('IRON', 'BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND', 'MASTER', 'GRANDMASTER', 'CHALLENGER');

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('TOP', 'JUNGLE', 'MID', 'BOT', 'SUPPORT');

-- CreateTable
CREATE TABLE "User" (
    "id" STRING NOT NULL,
    "league_ign" STRING NOT NULL,
    "server" "Server" NOT NULL,
    "rank" "Rank" NOT NULL,
    "role" "Role"[],
    "win" INT4 NOT NULL DEFAULT 0,
    "loss" INT4 NOT NULL DEFAULT 0,
    "elo" INT4 NOT NULL DEFAULT 0,
    "external_elo" INT4 NOT NULL DEFAULT 0,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Scrims" (
    "id" INT8 NOT NULL DEFAULT unique_rowid(),
    "queue_id" STRING NOT NULL,
    "server" STRING NOT NULL,
    "status" "Status" NOT NULL,

    CONSTRAINT "Scrims_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Queue" (
    "id" STRING NOT NULL,
    "server" STRING NOT NULL,

    CONSTRAINT "Queue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserQueued" (
    "player_id" STRING NOT NULL,
    "queue_id" STRING NOT NULL,
    "popped" BOOL NOT NULL DEFAULT false,
    "queuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "scrimsId" INT8,

    CONSTRAINT "UserQueued_pkey" PRIMARY KEY ("player_id","queue_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_league_ign_key" ON "User"("league_ign");

-- CreateIndex
CREATE UNIQUE INDEX "Queue_server_key" ON "Queue"("server");

-- AddForeignKey
ALTER TABLE "Scrims" ADD CONSTRAINT "Scrims_queue_id_fkey" FOREIGN KEY ("queue_id") REFERENCES "Queue"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserQueued" ADD CONSTRAINT "UserQueued_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserQueued" ADD CONSTRAINT "UserQueued_scrimsId_fkey" FOREIGN KEY ("scrimsId") REFERENCES "Scrims"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserQueued" ADD CONSTRAINT "UserQueued_queue_id_fkey" FOREIGN KEY ("queue_id") REFERENCES "Queue"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
