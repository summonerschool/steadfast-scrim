import { Queue, Queuer } from '@prisma/client';
import { QueueRepository } from './repo/queue-repository';

interface QueueService {
  joinQueue: (userID: string, queueID: string) => Promise<number>;
  leaveQueue: (userID: string, queueID: string) => Promise<number>;
  getOrCreateQueueToGuild: (guildID: string) => Promise<Queue>;
  showQueuers: (queueID: string) => Promise<Queuer[]>;
}

export const initQueueService = (queueRepo: QueueRepository) => {
  const service: QueueService = {
    joinQueue: async (userID: string, queueID: string) => {
      console.info(`${userID} tries to join ${queueID}`);
      const queuer = await queueRepo.addUserToQueue(userID, queueID);
      const activeUserQueues = await queueRepo.getQueuers({ queue_id: queuer.queue_id });
      console.info(`${activeUserQueues.length} players in queue`);
      if (activeUserQueues.length > 10) {
        // DODO logic;
        console.info('POPPED');
      }
      return activeUserQueues.length;
    },
    leaveQueue: async (userID, queueID) => {
      const queuer = await queueRepo.removeUserFromQueue(userID, queueID);
      const activeUserQueues = await queueRepo.getQueuers({ queue_id: queuer.queue_id });
      return activeUserQueues.length;
    },
    getOrCreateQueueToGuild: async (guildID) => {
      let queue = await queueRepo.getQueueByGuildID(guildID);
      if (!queue) {
        queue = await queueRepo.createQueue(guildID);
      }
      return queue;
    },
    showQueuers: async (queueID: string) => {
      const queuers = await queueRepo.getQueuers({ queue_id: queueID });
      return queuers;
    }
  };
  return service;
};
