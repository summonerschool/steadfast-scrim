import { Region, User } from '../entities/user';
import { EmbedBuilder } from 'discord.js';
import { ScrimService } from './scrim-service';
import { DiscordService } from './discord-service';

interface QueueService {
  joinQueue: (user: User, guildID: string, region: Region) => User[];
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
  EUW: Map<string, User>;
  NA: Map<string, User>;
};

const HOUR = 3600000;
const REMOVE_DURATION = HOUR * 8;

export const initQueueService = (scrimService: ScrimService, discordService: DiscordService) => {
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
          discordService.sendMessageInChannel(`<@${user.id}> has been in queue for 8 hours, and been removed due to inactivity.`)
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
    joinQueue: (user, guildID, region) => {
      const queue: Queues = queues.get(guildID) || { EUW: new Map(), NA: new Map() };
      if (queue[region].get(user.id)) {
        // Reset the queue timer
        stopQueueUserTimout(user.id);
        startQueueUserTimeout(user, guildID, region);
        throw new Error("You're already in queue");
      }
      const activeScrims = scrimService.getActiveScrims();
      for (const scrim of activeScrims) {
        if (scrim.players.some((p) => p.userID === user.id)) {
          throw new Error("You're already in a game. Please report the match before queuing up again.");
        }
      }
      queue[region] = queue[region].set(user.id, user);
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
      // INACTIVE
      // const users = [...queue[region].values()];
      // const averageElo = users.reduce((prev, curr) => prev + curr.elo, 0) / users.length;
      // console.info(`Average elo is ${averageElo}`);
      // const filtered = users.filter((u) => Math.abs(averageElo - u.elo) < 800);
      // if (filtered.length >= 10) {
      //   return MatchmakingStatus.VALID_MATCH;
      // }
      // return MatchmakingStatus.UNEVEN_RANK_DISTRIBUTION;
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
      relevantUsers.forEach((u) => stopQueueUserTimout(u.id));
      // Users who did not get into the game gets botoed
      users.slice(10).forEach((u) => service.joinQueue(u, guildID, region));
      const { scrim, lobbyDetails } = await scrimService.createBalancedScrim(guildID, region, relevantUsers);
      const matchEmbed = await scrimService.sendMatchDetails(scrim, relevantUsers, lobbyDetails);
      return matchEmbed;
    }
  };
  return service;
};
