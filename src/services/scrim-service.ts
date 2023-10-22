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
  createBalancedScrim(guildID: string, region: Region, queuers: User[], queuedFill: string[]): Promise<Scrim>;
  getUserProfilesInScrim(scrimID: number, side: GameSide): Promise<User[]>;
  reportWinner(scrim: Scrim, winner: GameSide): Promise<boolean>;
  getIncompleteScrims(userID: string): Promise<Scrim[]>;
  findScrim(scrimID: number): Promise<Scrim>;
  remakeScrim(scrim: Scrim): Promise<boolean>;
  getPlayer(userId: string, scrimId: number): Promise<Player | null>;
  getUserInGame(userId: string): number | undefined;
  revertGame(id: number): Promise<boolean>;
}

// Convert initScrimService to a class implementing ScrimService2
export class ScrimServiceImpl implements ScrimService {
  private ingame = new Map<string, number>();
  constructor(private prisma: PrismaClient, private matchmakingService: MatchmakingService) {}

  async getUsersInScrim(scrimID: number, side: GameSide): Promise<User[]> {
    const users = await this.prisma.user.findMany({
      where: { player: { some: { scrimId: scrimID, side: side } } }
    });
    return users;
  }

  async createBalancedScrim(guildID: string, region: Region, queuers: User[], queuedFill: string[]): Promise<Scrim> {
    const { users, fillers } = this.matchmakingService.attemptFill(queuers, queuedFill);
    const teamNames: [string, string] = [
      `🟦 ${capitalize(chance.pickone(adjectives))} ${chance.animal()}`,
      `🟥 ${capitalize(chance.pickone(adjectives))} ${chance.animal()}`
    ];
    const [rolePrio, eloPrio] = this.matchmakingService.startMatchmaking(users, fillers);
    // random number
    const matchup = rolePrio.eloDifference < 500 ? rolePrio : eloPrio;

    const [{ players, ...scrim }] = await this.prisma.$transaction([
      this.prisma.scrim.create({
        data: {
          guildID: guildID,
          region,
          players: {
            createMany: {
              data: this.matchmakingService.matchupToPlayers(matchup, fillers),
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
      this.prisma.user.updateMany({ where: { id: { in: fillers } }, data: { autofillProtected: true } }),
      // Remove autofill protection from users that got their role
      this.prisma.user.updateMany({
        where: { id: { notIn: fillers, in: users.map((u) => u.id) }, autofillProtected: true },
        data: { autofillProtected: false }
      })
    ]);
    for (const player of players) {
      this.ingame.set(player.userId, scrim.id);
    }
    return scrim;
  }

  async reportWinner(scrim: Scrim, winner: GameSide): Promise<boolean> {
    const updatedScrim = await this.prisma.scrim.update({
      where: { id: scrim.id },
      data: { status: 'COMPLETED', winner: winner },
      include: { players: { include: { user: true } } }
    });

    // Sort the users into side
    let totalBlueElo = 0;
    let totalRedElo = 0;
    for (const player of updatedScrim.players) {
      // Apply offrole penalty if autofilled
      const elo = player.user.elo - (player.isAutoFill || player.isOffRole ? OFFROLE_PENALTY[player.user.rank] : 0);
      if (player.side === 'BLUE') totalBlueElo += elo;
      if (player.side === 'RED') totalRedElo += elo;
      this.ingame.delete(player.userId);
    }
    // For every difference of 650 points, the team/player with the higher score is ten times as likely to win as the other team/player
    const blueWinChances = 1 / (1 + 10 ** ((totalRedElo - totalBlueElo) / 650));
    const redWinChances = 1 - blueWinChances;
    let text = `Game #${updatedScrim.id}\nBlue Elo: ${totalBlueElo}\nRed Elo:${totalRedElo}\nWinner is ${winner}\n`;

    // Update the users elo
    const updatedUsers = updatedScrim.players.map((player) => {
      this.ingame.delete(player.userId);

      const user = player.user;
      const totalGames = user.wins + user.losses;
      const K = totalGames <= 14 ? 80 - 2 * totalGames : 40;
      let eloChange = Math.round(K * (updatedScrim.winner === 'BLUE' ? 1 - blueWinChances : 1 - redWinChances));
      if (eloChange < 10) eloChange = 10; //
      const hasWon = player.side === updatedScrim.winner;
      const elo = hasWon ? user.elo + eloChange : user.elo - eloChange;
      text += `${user.leagueIGN}: ${user.elo} -> ${elo}\n`;
      return this.prisma.user.update({
        where: { id: user.id },
        data: { elo, wins: hasWon ? user.wins + 1 : user.wins, losses: hasWon ? user.losses : user.losses + 1 }
      });
    });

    const res = await this.prisma.$transaction(updatedUsers);

    // Store the draft
    const draft = await this.prisma.draft.findUnique({
      where: { scrimId: scrim.id }
    });
    if (draft) {
      await matchDetailService.storeDraft(scrim.id, draft.draftRoomId);
    }
    console.info(text);
    return res.length > 0;
  }

  async getIncompleteScrims(userID: string): Promise<Scrim[]> {
    return await this.prisma.scrim.findMany({ where: { players: { some: { userId: userID } }, status: 'STARTED' } });
  }

  async findScrim(scrimID: number): Promise<Scrim> {
    const scrim = await this.prisma.scrim.findUnique({ where: { id: scrimID } });
    if (!scrim) {
      throw new NotFoundError('No scrims found with that ID');
    }
    return scrim;
  }

  async remakeScrim(scrim: Scrim): Promise<boolean> {
    const success = await this.prisma.scrim.update({ where: { id: scrim.id }, data: { status: 'REMAKE' } });
    for (const [userId, scrimId] of this.ingame) {
      if (scrimId === scrim.id) {
        this.ingame.delete(userId);
      }
    }
    return success.status === 'REMAKE';
  }

  async getPlayer(userId: string, scrimId: number): Promise<Player | null> {
    const player = await this.prisma.player.findUnique({
      where: { userId_scrimId: { userId, scrimId } }
    });
    return player;
  }

  getUserInGame(userId: string): number | undefined {
    return this.ingame.get(userId);
  }

  async revertGame(id: number): Promise<boolean> {
    const scrim = await this.prisma.scrim.findUnique({
      where: { id },
      include: { players: true }
    });
    if (!scrim || scrim.status === 'STARTED') {
      throw new Error('This is not a valid match to revert');
    }
    // Check if any games has been played after the reverting one
    const gamesPlayedAfterRevertingGame = await this.prisma.scrim.count({
      skip: id,
      where: { region: scrim.region }
    });
    if (gamesPlayedAfterRevertingGame > 0) {
      return false;
    }

    const updateScrim = this.prisma.scrim.update({
      where: { id },
      data: { winner: null, status: 'STARTED' }
    });
    if (scrim.status === 'REMAKE') {
      const { status } = await updateScrim;
      return status === 'STARTED';
    } else {
      const promises = scrim.players.map((player) => {
        if (player.side === scrim.winner) {
          return this.prisma.user.update({
            where: { id: player.userId },
            data: { elo: player.pregameElo, wins: { decrement: 1 } }
          });
        } else {
          return this.prisma.user.update({
            where: { id: player.userId },
            data: { elo: player.pregameElo, losses: { decrement: 1 } }
          });
        }
      });
      const [res, ...users] = await this.prisma.$transaction([updateScrim, ...promises]);
      return res.status === 'STARTED' && users.length === 10;
    }
  }

  async getUserProfilesInScrim(scrimID: number, side: GameSide): Promise<User[]> {
    const users = await this.prisma.user.findMany({
      where: { player: { some: { scrimId: scrimID, side: side } } }
    });
    return users;
  }
}
