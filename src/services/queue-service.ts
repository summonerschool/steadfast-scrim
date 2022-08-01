import { Role } from '@prisma/client';
import { rankEnum, roleEnum, User, userSchema } from '../entities/user';
// import { rankEnum, roleEnum, User, userSchema } from '../entities/user';
import { NotFoundError } from '../errors/errors';
import { chance } from '../lib/chance';
import { ELO_TRANSLATION } from '../utils/utils';
import { UserRepository } from './repo/user-repository';

interface QueueService {
  joinQueue: (userID: string, guildID: string) => Promise<User[]>;
  leaveQueue: (userID: string, guildID: string) => User[];
  getUsersInQueue: (guildID: string) => User[];
  canCreateMatch: (
    users: User[]
  ) => { users: User[]; valid: true } | { valid: false; roleCount: Map<Role, number> | null };
  resetQueue: (guildID: string) => void;
}

const roles = ['TOP', 'JUNGLE', 'MID', 'BOT', 'SUPPORT', 'TOP', 'SUPPORT', 'MID', 'SUPPORT'];
const dos = ['MID', 'MID', 'TOP', 'MID', 'MID', 'MID', 'MID', 'TOP', 'MID'];

const randos = [...new Array(9)].map((_, i) => {
  const main = chance.pickone(roleEnum.options);
  const secondary = chance.pickone(roleEnum.options.filter((r) => r != main));
  const rank = chance.pickone(rankEnum.options);
  return userSchema.parse({
    id: chance.guid(),
    leagueIGN: `${chance.word({ length: 15 })}`,
    region: 'EUW',
    rank,
    main: roles[i],
    secondary: dos[i],
    wins: chance.integer({ min: 0, max: 10 }),
    losses: chance.integer({ min: 0, max: 10 }),
    elo: ELO_TRANSLATION[rank],
    external_elo: ELO_TRANSLATION[rank]
  });
});

export const initQueueService = (userRepo: UserRepository) => {
  const queues = new Map<string, User[]>();

  const service: QueueService = {
    joinQueue: async (userID, guildID) => {
      const user = await userRepo.getUserByID(userID);
      if (!user) {
        throw new NotFoundError("You can't join a queue without a profile. Please use /setup");
      }
      const currentQueue = queues.get(guildID) || [];
      currentQueue;
      if (currentQueue.some((u) => u.id == user.id)) {
        throw new Error("You're already in queue");
      }

      const inQueue = [...currentQueue, user];
      queues.set(guildID, inQueue);
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
    canCreateMatch: (users) => {
      // might sort or filter or order more here
      if (users.length >= 10) {
        const sufficentRoles = new Map<Role, number>();
        users.forEach((u) => {
          sufficentRoles.set(u.main, (sufficentRoles.get(u.main) || 0) + 1);
          sufficentRoles.set(u.secondary, (sufficentRoles.get(u.secondary) || 0) + 1);
        });
        for (const [_, count] of sufficentRoles) {
          if (count < 2) return { users, valid: false, roleCount: sufficentRoles };
        }
        return { users, valid: true };
      }
      return { valid: false, roleCount: null };
    },
    getUsersInQueue: (guildID) => {
      const queue = queues.get(guildID);
      if (!queue) {
        const promises = randos.map((u) => userRepo.upsertUser(u));
        const asdf = Promise.all(promises);
        const inQueue = [...randos];
        // queues.set(guildID, []);
        queues.set(guildID, inQueue);
        return [];
      } else {
        return queue;
      }
    },
    resetQueue: (guildID) => {
      queues.set(guildID, []);
    }
  };
  return service;
};
