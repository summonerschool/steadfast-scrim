import { Prisma, PrismaClient, Queue, Queuer } from '@prisma/client';

export interface QueueRepository {
  addUserToQueue: (userID: string, queueID: string) => Promise<Queuer>;
  removeUserFromQueue: (userID: string, queueID: string) => Promise<Queuer>;
  getUsersInQueue: (filter?: Prisma.QueuerWhereInput) => Promise<Queuer[]>;
  getQueueByGuildID: (guildID: string) => Promise<Queue | null>;
  createQueue: (guildID: string) => Promise<Queue>;
  updateQueuers: (filter: Prisma.QueuerWhereInput, data: Prisma.QueuerUpdateManyArgs['data']) => Promise<number>;
}

export const initQueueRepository = (prisma: PrismaClient) => {
  const repo: QueueRepository = {
    addUserToQueue: async (userID, queueID) => {
      // dont add to queue if the user is already queued up.
      const queuer = await prisma.queuer.upsert({
        where: {
          player_id_queue_id: { player_id: userID, queue_id: queueID }
        },
        create: { player_id: userID, queue_id: queueID },
        update: {}
      });
      return queuer;
    },
    removeUserFromQueue: async (userID, queueID) => {
      const queuer = await prisma.queuer.delete({
        where: { player_id_queue_id: { player_id: userID, queue_id: queueID } }
      });
      return queuer;
    },
    getUsersInQueue: async (filter) => {
      const queuers = await prisma.queuer.findMany({ where: filter });
      return queuers;
    },
    getQueueByGuildID: async (guildID) => {
      const gameQueue = prisma.queue.findUnique({ where: { server: guildID } });
      return gameQueue;
    },
    createQueue: async (guildID) => {
      const gameQueue = await prisma.queue.create({ data: { server: guildID } });
      return gameQueue;
    },
    updateQueuers: async (filter, data) => {
      const res = await prisma.queuer.updateMany({
        data,
        where: filter
      });
      return res.count;
    }
  };
  return repo;
};
