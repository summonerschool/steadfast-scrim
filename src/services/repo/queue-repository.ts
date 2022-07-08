import { PrismaClient, Queue } from '@prisma/client';

export interface QueueRepository {
  addUserToQueue: (userID: string, queueID: string) => Promise<void>;
  getLatestQueue: () => Promise<Queue>
}

const initQueueRepository = (prisma: PrismaClient) => {
  const repo: QueueRepository = {
    addUserToQueue: async (userID, queueID) => {
      const userqueued = await prisma.userQueued.create({ data: { player_id: userID, queue_id: queueID } });
      return
    },
    getLatestQueue: async () => {
        const queue = await prisma.queue.findFirst({ orderBy: { started_at: 'desc' }, where: { status: 'STARTED' } })
        return queue
    }
  };
  return repo;
};
