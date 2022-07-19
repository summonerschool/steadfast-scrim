import { Prisma, PrismaClient } from '@prisma/client';
import { mapToQueuer, Queuer } from '../../entities/queue';

export interface QueueRepository {
  addUserToQueue: (userID: string, guildID: string) => Promise<Queuer>;
  removeUserFromQueue: (userID: string, guildID: string) => Promise<Queuer>;
  updateQueuers: (filter: Prisma.QueuerWhereInput, data: Prisma.QueuerUpdateManyArgs['data']) => Promise<number>;
  getQueuers: (queueID: string, filter?: Prisma.QueuerWhereInput) => Promise<Queuer[]>;
}

export const initQueueRepository = (prisma: PrismaClient) => {
  const repo: QueueRepository = {
    addUserToQueue: async (userID, guildID) => {
      // Adds a queuer. If the queue does not exist, create it.
      const queuer = await prisma.queuer.upsert({
        where: { user_id_queue_id: { user_id: userID, queue_id: guildID } },
        create: {
          queue: {
            connectOrCreate: { where: { guild_id: guildID }, create: { region: 'EUW', guild_id: guildID } }
          },
          user: { connect: { id: userID } }
        },
        update: {}
      });
      return mapToQueuer(queuer);
    },
    removeUserFromQueue: async (userID, guildID) => {
      const queuer = await prisma.queuer.delete({
        where: { user_id_queue_id: { user_id: userID, queue_id: guildID } }
      });
      return mapToQueuer(queuer);
    },
    getQueuers: async (id, filter) => {
      const queuers = await prisma.queuer.findMany({ where: { queue_id: id, ...filter }, include: { user: true } });
      return queuers.map(mapToQueuer);
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
