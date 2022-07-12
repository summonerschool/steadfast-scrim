import { Queue, Queuer } from '@prisma/client';
import { NotFoundError } from '../errors/errors';
import { QueueRepository } from './repo/queue-repository';
import { UserRepository } from './repo/user-repository';
import { ScrimService } from './scrim-service';

interface QueueService {
  joinQueue: (userID: string, queueID: string) => Promise<Queuer>;
  leaveQueue: (userID: string, queueID: string) => Promise<Queuer>;
  getOrCreateQueueToGuild: (guildID: string) => Promise<Queue>;
  showUsersInQueue: (queueID: string) => Promise<Queuer[]>;
  attemptMatchmaking: (queueID: string) => Promise<{ queuers: Queuer[]; valid: true } | { valid: false }>;
}

export const initQueueService = (queueRepo: QueueRepository, userRepo: UserRepository) => {
  const service: QueueService = {
    joinQueue: async (userID, queueID) => {
      const user = await userRepo.getUserByID(userID);
      if (!user) {
        throw new NotFoundError("You can't join a queue without a profile. Please use /setup");
      }
      const queuer = await queueRepo.addUserToQueue(user.id, queueID);
      return queuer;
    },
    attemptMatchmaking: async (queueID) => {
      // might sort or filter or order more here
      const queuers = await queueRepo.getUsersInQueue({ popped: false, queue_id: queueID });
      if (queuers.length >= 10) {
        const users = queuers.map((queuer) => queuer.user_id);
        // pop the queue to all these users
        const updateCount = await queueRepo.updateQueuers({ user_id: { in: users } }, { popped: true });
        return updateCount === 10 ? { queuers, valid: true } : { valid: false };
      }
      return { valid: false };
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
