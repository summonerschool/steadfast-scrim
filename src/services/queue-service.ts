import { QueueRepository } from './repo/queue-repository';

interface QueueService {
  joinQueue: (userID: string) => void;
  leaveQueue: (userID: string) => void;
}

const initQueueService = (queueRepo: QueueRepository) => {
  const service: QueueService = {
    joinQueue: async () => {
      const queue = await queueRepo.getLatestQueue();
      return;
    },
    leaveQueue: () => {}
  };
};
