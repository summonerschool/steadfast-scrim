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
        prisma.user.updateMany({ where: { id: { in: fillers } }, data: { autofillProtected: true } })
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

      const playerMap = new Map<string, Player & { user: User }>();
      const red: User[] = [];
      const blue: User[] = [];
      // Sort the users into side
      for (const player of scrim.players) {
        if (player.side === 'BLUE') blue.push(player.user);
        if (player.side === 'RED') red.push(player.user);
        playerMap.set(player.user.id, player);
      }
      // Get the average elo for the teams
      const totalBlueElo = getTeamTotalElo(blue, playerMap);
      const totalRedElo = getTeamTotalElo(red, playerMap);
      const blueWinChances = 1 / (1 + 10 ** ((totalRedElo - totalBlueElo) / 650));
      const redWinChances = 1 - blueWinChances;
      let text = `Game #${scrim.id}\nBlue Elo: ${totalBlueElo}\nRed Elo:${totalRedElo}\nWinner is ${winner}\n`;
      const updatedUsers = scrim.players.map((player) => {
        ingame.delete(player.userId);

        const user = player.user;
        const totalGames = user.wins + user.losses;
        const K = totalGames <= 14 ? 60 - 2 * totalGames : 32;
        const eloChange = Math.round(K * (scrim.winner === 'BLUE' ? 1 - blueWinChances : 1 - redWinChances));
        const hasWon = player.side === scrim.winner;
        const elo = hasWon ? player.pregameElo + eloChange : player.pregameElo - eloChange;
        text += `${user.leagueIGN}: ${user.elo} -> ${elo}\n`;
        return prisma.user.update({
          where: { id: user.id },
          data: { elo, wins: hasWon ? user.wins + 1 : user.wins, losses: hasWon ? user.losses : user.losses + 1 }
        });
      });
      const res = await prisma.$transaction(updatedUsers);
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
      return success.status === 'REMAKE';
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

const getTeamTotalElo = (team: User[], players: Map<string, Player>): number =>
  team.reduce((prev, curr) => {
    let elo = prev + curr.elo;
    const player = players.get(curr.id);
    if (curr.main != player?.role) {
      elo -= OFFROLE_PENALTY[curr.rank];
    }
    return elo;
  }, 0);
