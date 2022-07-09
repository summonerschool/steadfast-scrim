import { Queue } from '@prisma/client';
import { QueueRepository } from './repo/queue-repository';

interface QueueService {
  joinQueue: (userID: string, queueID: string) => Promise<number>;
  leaveQueue: (userID: string, queueID: string) => Promise<number>;
  getOrCreateQueueToGuild: (guildID: string) => Promise<Queue>;
  getUsersInQueue: (queueID: string) => Promise<number>;
}

export const initQueueService = (queueRepo: QueueRepository) => {
  const service: QueueService = {
    joinQueue: async (userID: string, queueID: string) => {
      console.info(`${userID} tries to join ${queueID}`);
      const queue = await queueRepo.addUserToQueue(userID, queueID);
      const activeUserQueues = await queueRepo.getListQueued({ queue_id: queue.queue_id });
      console.info(`${activeUserQueues.length} players in queue`);
      if (activeUserQueues.length > 10) {
        // DODO logic;
        console.info('POPPED');
      }
      return activeUserQueues.length;
    },
    leaveQueue: async (userID, queueID) => {
      const queued = await queueRepo.removeUserFromQueue(userID, queueID);
      const activeUserQueues = await queueRepo.getListQueued({ queue_id: queued.queue_id });
      return activeUserQueues.length;
    },
    getOrCreateQueueToGuild: async (guildID) => {
      let queue = await queueRepo.getQueueByGuildID(guildID);
      if (!queue) {
        queue = await queueRepo.createQueue(guildID);
      }
      return queue;
    },
    getUsersInQueue: async (queueID: string) => {
      const queuedUsers = await queueRepo.getListQueued({ queue_id: queueID });
      return queuedUsers.length;
    }
  };
  return service;
};
