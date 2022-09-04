import { Region, User } from '../entities/user';

interface QueueService {
  joinQueue: (user: User, guildID: string, region: Region) => User[];
  leaveQueue: (user: User, guildID: string, region: Region) => User[];
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

export const initQueueService = () => {
  const queues = new Map<string, Queues>();

  const service: QueueService = {
    joinQueue: (user, guildID, region) => {
      const queue: Queues = queues.get(guildID) || { EUW: new Map(), NA: new Map() };
      if (queue[region].get(user.id)) {
        throw new Error("You're already in queue");
      }
      queue[region] = queue[region].set(user.id, user);
      return [...queue[region].values()];
    },
    leaveQueue: (user, guildID, region) => {
      const queue = queues.get(qKey(guildID, region)) || new Map<string, User>();
      const deleted = queue.delete(user.id);
      if (!deleted) {
        throw new Error("You're not in the specified queue");
      }
      return [...queue.values()];
    },
    attemptMatchCreation: (guildID, region) => {
      const queue = queues.get(qKey(guildID, region));
      if (!queue || queue.size < 10) return MatchmakingStatus.NOT_ENOUGH_PLAYERS;
      return MatchmakingStatus.VALID_MATCH;
    },
    getQueue: (guildID, region) => {
      let queue = queues.get(qKey(guildID, region));
      if (!queue) {
        queue = new Map<string, User>();
      }
      console.log({ queue, queues });
      return queue;
    },
    resetQueue: (guildID, region) => {
      const queue = queues.get(qKey(guildID, region));
      if (queue) queue.clear();
    }
  };
  return service;
};

const qKey = (guildID: string, region: Region) => `${guildID},${region}`;
