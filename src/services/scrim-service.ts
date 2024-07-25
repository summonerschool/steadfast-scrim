import { chance } from '../lib/chance';
import type { MatchmakingService } from './matchmaking-service';
import { OFFROLE_PENALTY } from './matchmaking-service';
import type { Player, PrismaClient, Region, Scrim, User } from '@prisma/client';
import { Status } from '@prisma/client';
import { NotFoundError } from '../errors/errors';
import { adjectives } from '../lib/adjectives';
import { capitalize } from '../utils/utils';
import type { GameSide, LobbyDetails } from '../models/matchmaking';
import { env } from '../env';
import { matchDetailService } from '..';

export interface ScrimService {
  createBalancedScrim: (
    guildID: string,
    region: Region,
    queuers: User[],
    queuedFill: string[]
  ) => Promise<{ scrim: Scrim; players: Player[]; lobbyDetails: LobbyDetails }>;
  getUserProfilesInScrim: (scrimID: number, side: GameSide) => Promise<User[]>;
  reportWinner: (scrim: Scrim, winner: GameSide) => Promise<boolean>;
  getIncompleteScrims: (userID: string) => Promise<Scrim[]>;
  findScrim: (scrimID: number) => Promise<Scrim>;
  remakeScrim: (scrim: Scrim) => Promise<boolean>;
  getPlayer: (userId: string, scrimId: number) => Promise<Player | null>;
  getUserInGame: (userId: string) => number | undefined;
  revertGame: (id: number) => Promise<boolean>;
}

export const initScrimService = (prisma: PrismaClient, matchmakingService: MatchmakingService): ScrimService => {
  const ingame = new Map<string, number>();
  const service: ScrimService = {
    // Generates an opgg link for scouting purposes
    getUserProfilesInScrim: async (scrimID: number, side: GameSide) => {
      const users = await prisma.user.findMany({
        where: { player: { some: { scrimId: scrimID, side: side } } }
      });
      return users;
    },
    createBalancedScrim: async (guildID, region, queuers, queuedFill) => {
      const { users, fillers } = matchmakingService.attemptFill(queuers, queuedFill);
      const teamNames: [string, string] = [
        `🟦 ${capitalize(chance.pickone(adjectives))} ${chance.animal()}`,
        `🟥 ${capitalize(chance.pickone(adjectives))} ${chance.animal()}`
      ];
      const [rolePrio, eloPrio] = matchmakingService.startMatchmaking(users, fillers);
      // random number
      const matchup = rolePrio.eloDifference < 500 ? rolePrio : eloPrio;

      const [{ players, ...scrim }] = await prisma.$transaction([
        prisma.scrim.create({
          data: {
            guildID: guildID,
            region,
            players: {
              createMany: {
                data: matchmakingService.matchupToPlayers(matchup, fillers),
                skipDuplicates: true
              }
            },
            status: Status.STARTED,
            season: env.CURRENT_SEASON,
            blueTeamName: teamNames[0],
            redTeamName: teamNames[1]
          },
          include: {
            players: true
          }
        }),
        // autofill protect the user
        prisma.user.updateMany({ where: { id: { in: fillers } }, data: { autofillProtected: true } }),
        // Remove autofill protection from users that got their role
        prisma.user.updateMany({
          where: { id: { notIn: fillers, in: users.map((u) => u.id) }, autofillProtected: true },
          data: { autofillProtected: false }
        })
      ]);
      for (const player of players) {
        ingame.set(player.userId, scrim.id);
      }
      return {
        scrim,
        players,
        lobbyDetails: {
          teamNames,
          eloDifference: matchup.eloDifference,
          offroleCount: matchup.offroleCount,
          autoFilledCount: fillers.length
        }
      };
    },
    reportWinner: async (old, winner) => {
      const scrim = await prisma.scrim.update({
        where: { id: old.id },
        data: { status: 'COMPLETED', winner: winner },
        include: { players: { include: { user: true } } }
      });

      // Sort the users into side
      let totalBlueElo = 0;
      let totalRedElo = 0;
      for (const player of scrim.players) {
        // Apply offrole penalty if autofilled
        const elo = player.user.elo - (player.isAutoFill || player.isOffRole ? OFFROLE_PENALTY[player.user.rank] : 0);
        if (player.side === 'BLUE') totalBlueElo += elo;
        if (player.side === 'RED') totalRedElo += elo;
        ingame.delete(player.userId);
      }
      // For every difference of 650 points, the team/player with the higher score is ten times as likely to win as the other team/player
      const blueWinChances = 1 / (1 + 10 ** ((totalRedElo - totalBlueElo) / 650));
      const redWinChances = 1 - blueWinChances;
      let text = `Game #${scrim.id}\nBlue Elo: ${totalBlueElo}\nRed Elo:${totalRedElo}\nWinner is ${winner}\n`;

      // Update the users elo
      const updatedUsers = scrim.players.map((player) => {
        ingame.delete(player.userId);
        const user = player.user;
        if (player.isOffRole||player.isAutoFill) {
          user.secondaryCounter+=1;
        }
        else {
          user.secondaryCounter=0;
        }
        
        const totalGames = user.wins + user.losses;
        const K = totalGames <= 14 ? 80 - 2 * totalGames : 40;
        let eloChange = Math.round(K * (scrim.winner === 'BLUE' ? 1 - blueWinChances : 1 - redWinChances));
        if (eloChange < 10) eloChange = 10; //
        const hasWon = player.side === scrim.winner;
        const elo = hasWon ? user.elo + eloChange : user.elo - eloChange;
        text += `${user.leagueIGN}: ${user.elo} -> ${elo}\n`;
        return prisma.user.update({
          where: { id: user.id },
          data: { elo, wins: hasWon ? user.wins + 1 : user.wins, losses: hasWon ? user.losses : user.losses + 1 }
        });
      });
      const res = await prisma.$transaction(updatedUsers);

      // Store the draft
      const draft = await prisma.draft.findUnique({
        where: { scrimId: scrim.id }
      });
      if (draft) {
        await matchDetailService.storeDraft(scrim.id, draft.draftRoomId);
      }
      console.info(text);
      return res.length > 0;
    },
    getIncompleteScrims: async (userId) => {
      return await prisma.scrim.findMany({ where: { players: { some: { userId } }, status: 'STARTED' } });
    },
    findScrim: async (scrimId) => {
      const scrim = await prisma.scrim.findUnique({ where: { id: scrimId } });
      if (!scrim) {
        throw new NotFoundError('No scrims found with that ID');
      }
      return scrim;
    },
    remakeScrim: async (scrim) => {
      const success = await prisma.scrim.update({ where: { id: scrim.id }, data: { status: 'REMAKE' } });
      for (const [userId, scrimId] of ingame) {
        if (scrimId === scrim.id) {
          ingame.delete(userId);
        }
      }
      return success.status === 'REMAKE';
    },
    getUserInGame: (userId: string) => {
      return ingame.get(userId);
    },
    getPlayer: async (userId, scrimId) => {
      const player = await prisma.player.findUnique({
        where: { userId_scrimId: { userId, scrimId } }
      });
      return player;
    },
    revertGame: async (id) => {
      const scrim = await prisma.scrim.findUnique({
        where: { id },
        include: { players: true }
      });
      if (!scrim || scrim.status === 'STARTED') {
        throw new Error('This is not a valid match to revert');
      }
      // Check if any games has been played after the reverting one
      const gamesPlayedAfterRevertingGame = await prisma.scrim.count({
        skip: id,
        where: { region: scrim.region }
      });
      if (gamesPlayedAfterRevertingGame > 0) {
        return false;
      }

      const updateScrim = prisma.scrim.update({
        where: { id },
        data: { winner: null, status: 'STARTED' }
      });
      if (scrim.status === 'REMAKE') {
        const { status } = await updateScrim;
        return status === 'STARTED';
      } else {
        const promises = scrim.players.map((player) => {
          if (player.side === scrim.winner) {
            return prisma.user.update({
              where: { id: player.userId },
              data: { elo: player.pregameElo, wins: { decrement: 1 } }
            });
          } else {
            return prisma.user.update({
              where: { id: player.userId },
              data: { elo: player.pregameElo, losses: { decrement: 1 } }
            });
          }
        });
        const [res, ...users] = await prisma.$transaction([updateScrim, ...promises]);
        return res.status === 'STARTED' && users.length === 10;
      }
    }
  };
  return service;
};
