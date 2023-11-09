import { EmbedBuilder } from 'discord.js';
import type { ScrimService } from './scrim-service';
import type { DiscordService } from './discord-service';
import type { Region, User } from '@prisma/client';
import type { MatchDetailService } from './matchdetail-service';

interface QueueService {
  joinQueue: (user: User, guildID: string, region: Region, isFill: boolean) => User[];
  leaveQueue: (userID: string, guildID: string, region: Region) => User[];
  getQueue: (guildID: string, region: Region) => Map<string, User>;
  resetQueue: (guildID: string, region: Region) => void;
  removeUserFromQueue: (guildID: string, region: Region, ids: string[]) => void;
  attemptMatchCreation: (guildID: string, region: Region) => MatchmakingStatus;
  createMatch: (guildID: string, region: Region) => Promise<EmbedBuilder>;
}

export enum MatchmakingStatus {
  NOT_ENOUGH_PLAYERS,
  VALID_MATCH,
  UNEVEN_RANK_DISTRIBUTION
}

type Queues = {
  EUW: Map<string, User & { queuedAsFill: boolean }>;
  EUW_HIGH_ELO: Map<string, User & { queuedAsFill: boolean }>;
  NA: Map<string, User & { queuedAsFill: boolean }>;
  NA_HIGH_ELO: Map<string, User & { queuedAsFill: boolean }>;
};

const HOUR = 3600000;
const REMOVE_DURATION = HOUR * 8;

export const initQueueService = (
  scrimService: ScrimService,
  discordService: DiscordService,
  matchDetailService: MatchDetailService
) => {
  const queues = new Map<string, Queues>();
  const resetTimer = new Map<string, NodeJS.Timeout>();

  const startQueueUserTimeout = (user: User, guildID: string, region: Region) => {
    const now = new Date().toISOString();
    resetTimer.set(
      user.id,
      setTimeout(() => {
        try {
          service.leaveQueue(user.id, guildID, region);
          console.info(`${user.leagueIGN} joined at ${now} and was removed at ${new Date().toISOString()}`);
          discordService.sendMessageInChannel({
            content: `<@${user.id}> has been in queue for 8 hours, and been removed due to inactivity.`
          });
        } catch (err) {
          console.log(`${user.leagueIGN} already left queue.`);
        }
      }, REMOVE_DURATION)
    );
  };
  const stopQueueUserTimout = (userID: string) => {
    clearTimeout(resetTimer.get(userID));
    resetTimer.delete(userID);
  };

  const service: QueueService = {
    joinQueue: (user, guildID, region, isFill) => {
      const queue: Queues = queues.get(guildID) || { EUW: new Map(), EUW_HIGH_ELO: new Map(),NA: new Map(),NA_HIGH_ELO: new Map()  };
      if (queue[region].get(user.id)) {
        // Reset the queue timer
        stopQueueUserTimout(user.id);
        startQueueUserTimeout(user, guildID, region);
        throw new Error("You're already in queue");
      }
      const ingameIn = scrimService.getUserInGame(user.id);
      if (ingameIn) {
        throw new Error(`You're already in Match #${ingameIn}. Please report the match before queuing up again.`);
      }
      queue[region] = queue[region].set(user.id, { ...user, queuedAsFill: isFill });
      queues.set(guildID, queue);
      // removes the user after 8 hours
      startQueueUserTimeout(user, guildID, region);
      return [...queue[region].values()];
    },
    leaveQueue: (userID, guildID, region) => {
      const queue = queues.get(guildID);
      if (queue && queue[region].delete(userID)) {
        stopQueueUserTimout(userID);
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
        queue = { EUW: new Map(), EUW_HIGH_ELO: new Map(),NA: new Map(), NA_HIGH_ELO: new Map() };
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
    removeUserFromQueue: (guildID, region, ids) => {
      const queue = queues.get(guildID);
      if (queue) {
        const regionQueue = queue[region];
        for (const id of ids) {
          regionQueue.delete(id);
        }
      }
    },
    createMatch: async (guildID, region) => {
      const queue = queues.get(guildID);
      if (!queue || queue[region].size < 10) {
        return new EmbedBuilder().setTitle(`${queue ? queue[region].size : 0} player's in queue`);
      }
      const users = [...queue[region].values()];
      service.resetQueue(guildID, region);
      const averageElo = users.reduce((prev, curr) => prev + curr.elo, 0) / users.length;
      // Sort from Highest to Lowest.
      const relevantUsers = users
        .sort((a, b) => Math.abs(averageElo - a.elo) - Math.abs(averageElo - b.elo))
        .slice(0, 10);
      // reset remove timer
      relevantUsers.forEach((u) => {
        stopQueueUserTimout(u.id);
      });
      // Users who did not get into the game gets botoed
      users.slice(10).forEach((u) => service.joinQueue(u, guildID, region, u.queuedAsFill));
      const { scrim, players, lobbyDetails } = await scrimService.createBalancedScrim(
        guildID,
        region,
        relevantUsers,
        relevantUsers.filter((u) => u.queuedAsFill).map((u) => u.id)
      );

      matchDetailService
        .sendMatchDetails(scrim, relevantUsers, players, lobbyDetails)
        .then(() => console.log('All post-match creation actions completed'));
      return new EmbedBuilder().setTitle(
        `Match #${scrim.id} has been created! Send matching details to the players...`
      );
    }
  };
  return service;
};
