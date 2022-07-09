/*
  Warnings:

  - A unique constraint covering the columns `[server]` on the table `Queue` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Queue_server_key" ON "Queue"("server");
