import { Prisma, PrismaClient, Queue, UserQueued } from '@prisma/client';

export interface QueueRepository {
  addUserToQueue: (userID: string, queueID: string) => Promise<UserQueued>;
  removeUserFromQueue: (userID: string, queueID: string) => Promise<UserQueued>;
  getListQueued: (filter?: Prisma.UserQueuedWhereInput) => Promise<UserQueued[]>;
  getQueueByGuildID: (guildID: string) => Promise<Queue | null>;
  createQueue: (guildID: string) => Promise<Queue>;
}

export const initQueueRepository = (prisma: PrismaClient) => {
  const repo: QueueRepository = {
    addUserToQueue: async (userID, queueID) => {
      let queued = await prisma.userQueued.findUnique({
        where: {
          player_id_queue_id: { player_id: userID, queue_id: queueID }
        }
      });
      if (!queued) {
        // TODO: Actualy make a getorcreate user repository. It was 2am and i was too lazy
        // THIS IS TEMPORARY
        queued = await prisma.userQueued.create({
          data: {
            player: { connectOrCreate: { create: { id: userID, league_ign: 'Temp' }, where: { id: userID } } },
            queue: { connect: { id: queueID } }
          }
        });
      }
      return queued;
    },
    removeUserFromQueue: async (userID, queueID) => {
      const queued = await prisma.userQueued.delete({
        where: { player_id_queue_id: { player_id: userID, queue_id: queueID } }
      });
      return queued;
    },
    getListQueued: async (filter) => {
      const queued = await prisma.userQueued.findMany({ where: filter });
      return queued;
    },
    getQueueByGuildID: async (guildID) => {
      const hmm = prisma.queue.findUnique({ where: { server: guildID } });
      return hmm;
    },
    createQueue: async (guildID) => {
      const queue = await prisma.queue.create({ data: { server: guildID } });
      return queue;
    }
  };
  return repo;
};
