import { Queue, Queuer, queueSchema } from '../entities/queue';
import { NotFoundError } from '../errors/errors';
import { QueueRepository } from './repo/queue-repository';
import { UserRepository } from './repo/user-repository';

interface QueueService {
  joinQueue: (userID: string, guildID: string) => Promise<Queuer>;
  leaveQueue: (userID: string, guildID: string) => Promise<Queuer>;
  getUsersInQueue: (guildID: string) => Promise<Queue>;
  attemptMatchmaking: (queueID: string) => Promise<{ queuers: Queuer[]; valid: true } | { valid: false }>;
}

export const initQueueService = (queueRepo: QueueRepository, userRepo: UserRepository) => {
  const service: QueueService = {
    joinQueue: async (userID, guildID) => {
      const user = await userRepo.getUserByID(userID);
      if (!user) {
        throw new NotFoundError("You can't join a queue without a profile. Please use /setup");
      }
      return await queueRepo.addUserToQueue(user.id, guildID);
    },
    leaveQueue: async (userID, guildID) => {
      return await queueRepo.removeUserFromQueue(userID, guildID);
    },
    attemptMatchmaking: async (queueID) => {
      // might sort or filter or order more here
      const queuers = await queueRepo.getQueuers(queueID, { popped: false });
      if (queuers.length >= 10) {
        const users = queuers.map((queuer) => queuer.userID);
        // pop the queue to all these users
        const updateCount = await queueRepo.updateQueuers({ user_id: { in: users } }, { popped: true });
        return updateCount === 10 ? { queuers, valid: true } : { valid: false };
      }
      return { valid: false };
    },
    getUsersInQueue: async (guildID) => {
      const users = await userRepo.getUsers({ queuer: { some: { queue_id: guildID, popped: false } } });
      const queue = queueSchema.parse({
        guildID: guildID,
        region: 'EUW',
        inQueue: users
      });
      return queue;
    }
  };
  return service;
};
