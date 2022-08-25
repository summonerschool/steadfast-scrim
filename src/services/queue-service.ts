import { Role } from '@prisma/client';
import { User } from '../entities/user';
import { NotFoundError } from '../errors/errors';
import { UserRepository } from './repo/user-repository';

interface QueueService {
  joinQueue: (userID: string, guildID: string) => Promise<User[]>;
  leaveQueue: (userID: string, guildID: string) => User[];
  getQueue: (guildID: string) => Map<string, User>;
  canCreateMatch: (
    users: User[]
  ) => { users: User[]; valid: true } | { valid: false; roleCount: Map<Role, number> | null };
  resetQueue: (guildID: string) => void;
  attemptMatchCreation: (guildID: string) => MatchmakingStatus;
}

export enum MatchmakingStatus {
  NOT_ENOUGH_PLAYERS,
  VALID_MATCH
}

export const initQueueService = (userRepo: UserRepository) => {
  const queues = new Map<string, Map<string, User>>();

  const service: QueueService = {
    joinQueue: async (userID, guildID) => {
      const user = await userRepo.getUserByID(userID);
      if (!user) {
        throw new NotFoundError("You can't join a queue without a profile. Please use /setup");
      }
      const queue = queues.get(guildID) || new Map<string, User>();
      if (queue.get(user.id)) {
        throw new Error("You're already in queue");
      }
      queues.set(guildID, queue.set(user.id, user));
      return [...queue.values()];
    },
    leaveQueue: (userID, guildID) => {
      const queue = queues.get(guildID) || new Map<string, User>();
      const user = queue.get(userID);
      if (!user) {
        throw new Error('You have not joined any queues');
      }
      queue.delete(userID);
      return [...queue.values()];
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
    attemptMatchCreation: (guildID) => {
      const queue = queues.get(guildID);
      if (!queue || queue.size < 10) return MatchmakingStatus.NOT_ENOUGH_PLAYERS;
      return MatchmakingStatus.VALID_MATCH;
    },
    getQueue: (guildID) => {
      let queue = queues.get(guildID);
      if (!queue) {
        queue = new Map<string, User>();
      }
      return queue;
    },
    resetQueue: (guildID) => {
      const queue = queues.get(guildID);
      if (queue) queue.clear();
    }
  };
  return service;
};
