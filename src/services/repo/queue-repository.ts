import { Prisma, PrismaClient, Queue, Queuer } from '@prisma/client';

export interface QueueRepository {
  addUserToQueue: (userID: string, queueID: string) => Promise<Queuer>;
  removeUserFromQueue: (userID: string, queueID: string) => Promise<Queuer>;
  getQueuers: (filter?: Prisma.QueuerWhereInput) => Promise<Queuer[]>;
  getQueueByGuildID: (guildID: string) => Promise<Queue | null>;
  createQueue: (guildID: string) => Promise<Queue>;
}

export const initQueueRepository = (prisma: PrismaClient) => {
  const repo: QueueRepository = {
    addUserToQueue: async (userID, queueID) => {
      let queuer = await prisma.queuer.findUnique({
        where: {
          player_id_queue_id: { player_id: userID, queue_id: queueID }
        }
      });
      if (!queuer) {
        // TODO: Actualy make a getorcreate user repository. It was 2am and i was too lazy
        // THIS IS TEMPORARY
        queuer = await prisma.queuer.create({
          data: {
            player_id: userID,
            queue_id: queueID
          }
        });
      }
      return queuer;
    },
    removeUserFromQueue: async (userID, queueID) => {
      const queuer = await prisma.queuer.delete({
        where: { player_id_queue_id: { player_id: userID, queue_id: queueID } }
      });
      return queuer;
    },
    getQueuers: async (filter) => {
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
    }
  };
  return repo;
};
