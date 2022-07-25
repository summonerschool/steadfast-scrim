import { User } from '../entities/user';
// import { rankEnum, roleEnum, User, userSchema } from '../entities/user';
import { NotFoundError } from '../errors/errors';
import { UserRepository } from './repo/user-repository';

interface QueueService {
  joinQueue: (userID: string, guildID: string) => Promise<User[]>;
  leaveQueue: (userID: string, guildID: string) => User[];
  getUsersInQueue: (guildID: string) => User[];
  canCreateMatch: (queueID: string) => { users: User[]; valid: true } | { valid: false };
}

// const randos = [...new Array(8)].map(() => {
//   const main = chance.pickone(roleEnum.options);
//   const secondary = chance.pickone(roleEnum.options.filter((r) => r != main));
//   const rank = chance.pickone(rankEnum.options);
//   return userSchema.parse({
//     id: chance.guid(),
//     leagueIGN: chance.first(),
//     region: 'EUW',
//     rank,
//     main,
//     secondary,
//     wins: chance.integer({ min: 0, max: 10 }),
//     losses: chance.integer({ min: 0, max: 10 }),
//     elo: ELO_TRANSLATION[rank],
//     external_elo: ELO_TRANSLATION[rank]
//   });
// });

export const initQueueService = (userRepo: UserRepository) => {
  const queues = new Map<string, User[]>();

  const service: QueueService = {
    joinQueue: async (userID, guildID) => {
      const user = await userRepo.getUserByID(userID);
      if (!user) {
        throw new NotFoundError("You can't join a queue without a profile. Please use /setup");
      }
      const currentQueue = queues.get(guildID) || [];
      if (currentQueue.some((u) => u.id == user.id)) {
        throw new Error("You're already in queue");
      }
      // const promises = randos.map((u) => userRepo.upsertUser(u));
      // await Promise.all(promises);
      const inQueue = [...currentQueue, user];
      queues.set(guildID, inQueue);
      console.info(queues.get(guildID))
      return inQueue;
    },
    leaveQueue: (userID, guildID) => {
      const currentQueue = queues.get(guildID) || [];
      if (!currentQueue.some((u) => u.id === userID)) {
        throw new Error('You have not joined any queues');
      }
      const filteredQueue = currentQueue.filter((u) => u.id !== userID);
      queues.set(guildID, filteredQueue);
      return filteredQueue || [];
    },
    canCreateMatch: (guildID) => {
      // might sort or filter or order more here
      const users = queues.get(guildID) || [];
      if (users.length >= 10) {
        // pop the queue to all these users
        queues.set(guildID, []);
        return { users, valid: true };
      }
      return { valid: false };
    },
    getUsersInQueue: (guildID) => {
      const queue = queues.get(guildID);
      if (!queue) {
        queues.set(guildID, []);
        return [];
      } else {
        return queue;
      }
    }
  };
  return service;
};
