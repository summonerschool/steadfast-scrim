import { Queue, Queuer } from '@prisma/client';
import { NotFoundError } from '../errors/errors';
import { QueueRepository } from './repo/queue-repository';
import { UserRepository } from './repo/user-repository';

interface QueueService {
  joinQueue: (userID: string, queueID: string) => Promise<Queuer>;
  leaveQueue: (userID: string, queueID: string) => Promise<Queuer>;
  getOrCreateQueueToGuild: (guildID: string) => Promise<Queue>;
  showUsersInQueue: (queueID: string) => Promise<Queuer[]>;
}

export const initQueueService = (queueRepo: QueueRepository, userRepo: UserRepository) => {
  const service: QueueService = {
    joinQueue: async (userID: string, queueID: string) => {
      const user = await userRepo.getUserByID(userID);
      if (!user) {
        throw new NotFoundError("You can't join a queue without a profile. Please use /setup");
      }
      const queuer = await queueRepo.addUserToQueue(user.id, queueID);
      return queuer;
    },
    leaveQueue: async (userID, queueID) => {
      const queuer = await queueRepo.removeUserFromQueue(userID, queueID);
      return queuer;
    },
    getOrCreateQueueToGuild: async (guildID) => {
      let queue = await queueRepo.getQueueByGuildID(guildID);
      if (!queue) {
        queue = await queueRepo.createQueue(guildID);
      }
      return queue;
    },
    showUsersInQueue: async (queueID: string) => {
      const queuers = await queueRepo.getUsersInQueue({ queue_id: queueID });
      return queuers;
    }
  };
  return service;
};
