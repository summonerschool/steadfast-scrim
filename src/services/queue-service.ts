import { Queue } from '@prisma/client';
import { QueueRepository } from './repo/queue-repository';

interface QueueService {
  joinQueue: (userID: string, queueID: string) => void;
  leaveQueue: (userID: string, queueID: string) => void;
  getQueueByGuild: (guildID: string) => Queue | undefined;
}

const initQueueService = (queueRepo: QueueRepository) => {
  const service: QueueService = {
    joinQueue: async (userID: string, queueID: string) => {
      const queue = await queueRepo.addUserToQueue(userID, queueID);
      const activeUserQueues = await queueRepo.getListQueued({ queue_id: queue.queue_id });
      console.info(`${activeUserQueues.length} players in queue`);
      if (activeUserQueues.length > 10) {
        // DODO logic;
        console.info('POPPED');
      }
    },
    leaveQueue: async (userID, queueID) => {
      const left = await queueRepo.removeUserFromQueue(userID, queueID);
      if (left) {
        console.info('user has left queue');
      }
    },
    getQueueByGuild: (_guildID) => undefined
  };
  return service;
};
