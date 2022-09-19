import { Region, User } from '../entities/user';
import { ScrimService } from './scrim-service';

interface QueueService {
  joinQueue: (user: User, guildID: string, region: Region) => User[];
  leaveQueue: (userID: string, guildID: string, region: Region) => User[];
  getQueue: (guildID: string, region: Region) => Map<string, User>;
  resetQueue: (guildID: string, region: Region) => void;
  attemptMatchCreation: (guildID: string, region: Region) => MatchmakingStatus;
}

export enum MatchmakingStatus {
  NOT_ENOUGH_PLAYERS,
  VALID_MATCH
}

type Queues = {
  EUW: Map<string, User>;
  NA: Map<string, User>;
};

export const initQueueService = (scrimService: ScrimService) => {
  const queues = new Map<string, Queues>();

  const service: QueueService = {
    joinQueue: (user, guildID, region) => {
      const queue: Queues = queues.get(guildID) || { EUW: new Map(), NA: new Map() };
      if (queue[region].get(user.id)) {
        throw new Error("You're already in queue");
      }
      const activeScrims = scrimService.getActiveScrims()
      for (const scrim of activeScrims) {
        if (scrim.players.some(p => p.userID === user.id)) {
          throw new Error("You're already in a game. Please report the match before queuing up again.");
        }
      }
      queue[region] = queue[region].set(user.id, user);
      queues.set(guildID, queue);
      return [...queue[region].values()];
    },
    leaveQueue: (userID, guildID, region) => {
      const queue = queues.get(guildID);
      if (queue && queue[region].delete(userID)) {
        return [...queue[region].values()];
      } else {
        throw new Error("You're not in the specified queue");
      }
    },
    attemptMatchCreation: (guildID, region) => {
      const queue = queues.get(guildID);
      if (!queue || queue[region].size < 10) return MatchmakingStatus.NOT_ENOUGH_PLAYERS;
      return MatchmakingStatus.VALID_MATCH;
    },
    getQueue: (guildID, region) => {
      let queue = queues.get(guildID);
      if (!queue) {
        queue = { EUW: new Map(), NA: new Map() };
        queues.set(guildID, queue);
      }
      return queue[region];
    },
    resetQueue: (guildID, region) => {
      const queue = queues.get(guildID);
      if (queue) {
        queue[region].clear();
      }
    },
  };
  return service;
};
