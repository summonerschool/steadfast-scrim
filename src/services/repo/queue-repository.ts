import { Prisma, PrismaClient } from '@prisma/client';
import { mapToQueue, mapToQueuer, Queue, Queuer } from '../../entities/queue';

export interface QueueRepository {
  addUserToQueue: (userID: string, queueID: string) => Promise<Queuer>;
  removeUserFromQueue: (userID: string, queueID: string) => Promise<Queuer>;
  getUsersInQueue: (filter?: Prisma.QueuerWhereInput, include?: object | null) => Promise<Queuer[]>;
  getQueueByGuildID: (guildID: string) => Promise<Queue | undefined>;
  createQueue: (guildID: string) => Promise<Queue>;
  updateQueuers: (filter: Prisma.QueuerWhereInput, data: Prisma.QueuerUpdateManyArgs['data']) => Promise<number>;
}

export const initQueueRepository = (prisma: PrismaClient) => {
  const repo: QueueRepository = {
    addUserToQueue: async (userID, queueID) => {
      // dont add to queue if the user is already queued up.
      const queuer = await prisma.queuer.upsert({
        where: {
          user_id_queue_id: { user_id: userID, queue_id: queueID }
        },
        create: { user_id: userID, queue_id: queueID },
        update: {}
      });
      return mapToQueuer(queuer);
    },
    removeUserFromQueue: async (userID, queueID) => {
      const queuer = await prisma.queuer.delete({
        where: { user_id_queue_id: { user_id: userID, queue_id: queueID } }
      });
      return mapToQueuer(queuer);
    },
    getUsersInQueue: async (filter, include = null) => {
      const queuers = await prisma.queuer.findMany({
        where: filter,
        include: include
      });
      return queuers.map(mapToQueuer);
    },
    getQueueByGuildID: async (guildID) => {
      const gameQueue = await prisma.queue.findUnique({ where: { guild_id: guildID } });
      return gameQueue ? mapToQueue(gameQueue, []) : undefined;
    },
    createQueue: async (guildID) => {
      const gameQueue = await prisma.queue.create({ data: { guild_id: guildID } });
      return mapToQueue(gameQueue, []);
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
