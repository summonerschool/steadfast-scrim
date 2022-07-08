import { Prisma, PrismaClient, UserQueued } from '@prisma/client';

export interface QueueRepository {
  addUserToQueue: (userID: string, queueID: string) => Promise<UserQueued>;
  removeUserFromQueue: (userID: string, queueID: string) => Promise<boolean>;
  getListQueued: (filter?: Prisma.UserQueuedWhereInput) => Promise<UserQueued[]>;
}

export const initQueueRepository = (prisma: PrismaClient) => {
  const repo: QueueRepository = {
    addUserToQueue: async (userID, queueID) => {
      const queued = await prisma.userQueued.create({ data: { player_id: userID, queue_id: queueID } });
      return queued;
    },
    removeUserFromQueue: async (userID, queueID) => {
      const queued = await prisma.userQueued.delete({
        where: { player_id_queue_id: { player_id: userID, queue_id: queueID } }
      });
      return !!queued;
    },
    getListQueued: async (filter) => {
      const queued = await prisma.userQueued.findMany({ where: filter });
      return queued;
    }
  };
  return repo;
};
