import { Role } from '@prisma/client';
import { rankEnum, roleEnum, User, userSchema } from '../entities/user';
// import { rankEnum, roleEnum, User, userSchema } from '../entities/user';
import { NotFoundError } from '../errors/errors';
import { chance } from '../lib/chance';
import { UserRepository } from './repo/user-repository';
import { ScrimService } from './scrim-service';

interface QueueService {
  joinQueue: (userID: string, guildID: string) => Promise<User[]>;
  leaveQueue: (userID: string, guildID: string) => User[];
  getUsersInQueue: (guildID: string) => User[];
  canCreateMatch: (
    users: User[]
  ) => { users: User[]; valid: true } | { valid: false; roleCount: Map<Role, number> | null };
  resetQueue: (guildID: string) => void;
  attemptMatchCreation: (guildID: string) => MatchmakingStatus;
  autoFillUsers: (guildID: string) => User[];
  getRoleCount: (users: User[]) => Map<Role, number>;
}

export enum MatchmakingStatus {
  NOT_ENOUGH_PLAYERS,
  INSUFICCENT_ROLE_DIVERSITY,
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
      const roles = service.getRoleCount([...queue.values()]);
      for (const [_, count] of roles) {
        if (count < 2) return MatchmakingStatus.INSUFICCENT_ROLE_DIVERSITY;
      }
      return MatchmakingStatus.VALID_MATCH;
    },
    getRoleCount: (users) => {
      const roles = new Map<Role, number>();
      for (const u of users) {
        // Increment all roles if you're fill
        let mainRoleCount = roles.get(u.main) || 0;
        let secondaryCount = roles.get(u.secondary) || 0;
        mainRoleCount += 1;
        secondaryCount += 1;
        roles.set(u.main, mainRoleCount);
        roles.set(u.secondary, secondaryCount);
      }
      return roles;
    },
    autoFillUsers: (guildID) => {
      const queue = queues.get(guildID)!!;
      const users = [...queue.values()];
      const roleCount = service.getRoleCount(users);
      const requireFill = new Map<Role, number>();
      console.log({ roleCount });
      for (const [role, count] of roleCount) {
        if (count < 2) {
          requireFill.set(role, 2 - count);
        }
      }
      const requiredAmountOfFillers = [...requireFill.values()].reduce((prev, curr) => prev + curr, 0);
      console.log({ requireFill });
      for (let i = 0; i < requiredAmountOfFillers; i++) {
        const role = chance.pickone([...requireFill.keys()]);
        const rolesWithSurplus = [...roleCount].sort((a, b) => a[1] - b[1]);
        const roleToTakeFrom = rolesWithSurplus[rolesWithSurplus.length - 1];
        // pick a random user that does not have that required role
        const user = chance.pickone(
          users.filter(
            (u) =>
              (u.main === roleToTakeFrom[0] || u.secondary === roleToTakeFrom[0]) &&
              u.main != role &&
              u.secondary != role
          )
        );
        queues.set(guildID, queue.set(user.id, { ...user, secondary: role, isFill: true }));
        console.log(`set ${user.leagueIGN} to ${role}`);

        roleCount.set(user.secondary, roleCount.get(user.secondary)!! - 1);
        roleCount.set(role, roleCount.get(role)!! + 1);
        const count = requireFill.get(role)!!;
        if (count - 1 == 0) {
          requireFill.delete(role);
        } else {
          requireFill.set(role, count - 1);
        }
      }
      return [...queues.get(guildID)!!.values()];
    },
    getUsersInQueue: (guildID) => {
      let queue = queues.get(guildID);
      if (!queue) {
        queue = new Map<string, User>();
      }
      return [...queue.values()];
    },
    resetQueue: (guildID) => {
      const queue = queues.get(guildID);
      if (queue) queue.clear();
    }
  };
  return service;
};
