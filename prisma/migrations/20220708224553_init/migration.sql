-- CreateTable
CREATE TABLE "User" (
    "id" STRING NOT NULL,
    "league_ign" STRING NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
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

    CONSTRAINT "UserQueued_pkey" PRIMARY KEY ("player_id","queue_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_league_ign_key" ON "User"("league_ign");

-- AddForeignKey
ALTER TABLE "UserQueued" ADD CONSTRAINT "UserQueued_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserQueued" ADD CONSTRAINT "UserQueued_queue_id_fkey" FOREIGN KEY ("queue_id") REFERENCES "Queue"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
