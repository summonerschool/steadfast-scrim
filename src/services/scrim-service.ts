import { chance } from '../lib/chance';
import { MatchmakingService, OFFROLE_PENALTY } from './matchmaking-service';
import { Player, PrismaClient, Region, Scrim, Status, User, Role, Side, Prisma } from '@prisma/client';
import { NotFoundError } from '../errors/errors';
import { EmbedBuilder } from 'discord.js';
import { lobbyDetailsEmbed, matchDetailsEmbed } from '../components/match-message';
import { DiscordService } from './discord-service';
import WebSocket from 'ws';
import { adjectives } from '../lib/adjectives';
import { capitalize } from '../utils/utils';
import { GameSide, LobbyDetails, ROLE_ORDER, ROLE_ORDER_TO_ROLE, Team } from '../models/matchmaking';
import { DraftURLs } from '../models/external';

export interface ScrimService {
  generateScoutingLink: (users: User[]) => string;
  createBalancedScrim: (
    guildID: string,
    region: Region,
    queuers: User[],
    queuedFill: string[]
  ) => Promise<{ scrim: Scrim; players: Player[]; lobbyDetails: LobbyDetails }>;
  getUserProfilesInScrim: (scrimID: number, side: GameSide) => Promise<User[]>;
  reportWinner: (scrim: Scrim, winner: GameSide) => Promise<boolean>;
  createDraftLobby: (teamNames: [string, string]) => Promise<DraftURLs>;
  getIncompleteScrims: (userID: string) => Promise<Scrim[]>;
  findScrim: (scrimID: number) => Promise<Scrim>;
  remakeScrim: (scrim: Scrim) => Promise<boolean>;
  sendMatchDetails: (
    scrim: Scrim,
    players: Player[],
    users: User[],
    lobbyDetails: LobbyDetails
  ) => Promise<EmbedBuilder>;
  playerIsInMatch: (userId: string) => number | undefined;
  getPlayer: (userId: string, scrimId: number) => Promise<Player | null>;
  revertGame: (id: number) => Promise<boolean>;
}

interface RoomCreatedResult {
  type: string;
  roomId: string;
  bluePassword: string;
  redPassword: string;
  adminPassword: string;
}

export const initScrimService = (
  prisma: PrismaClient,
  matchmakingService: MatchmakingService,
  discordService: DiscordService
) => {
  const ingame = new Map<string, number>();
  const service: ScrimService = {
    // Generates an opgg link for scouting purposes
    generateScoutingLink: (users) => {
      const summoners = users.map((user) => encodeURIComponent(user.leagueIGN)).join(',');
      const server = users[0].region.toLocaleLowerCase();
      const link = `https://u.gg/multisearch?summoners=${summoners}&region=${server}1`;
      return link;
    },
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

      const voiceChannels = await discordService.createVoiceChannels(guildID, teamNames);
      const [blue, red] = chance.shuffle([matchup.team1, matchup.team2]);
      const createManyPlayers = [
        ...blue.map((user, i) => ({
          userId: user.id,
          side: Side.BLUE,
          role: Role[ROLE_ORDER_TO_ROLE[i]],
          pregameElo: user.elo
        })),
        ...red.map((user, i) => ({
          userId: user.id,
          side: Side.RED,
          role: Role[ROLE_ORDER_TO_ROLE[i]],
          pregameElo: user.elo
        }))
      ];

      const [{ players, ...scrim }, inviteBlue, inviteRed] = await Promise.all([
        prisma.scrim.create({
          data: {
            guildID: guildID,
            region,
            players: {
              createMany: {
                data: createManyPlayers,
                skipDuplicates: true
              }
            },
            status: Status.STARTED,
            voiceIds: voiceChannels.map((vc) => vc.id)
          },
          include: {
            players: true
          }
        }),
        voiceChannels[0].createInvite(),
        voiceChannels[1].createInvite(),
        // autofill protect the user
        prisma.user.updateMany({ where: { id: { in: fillers } }, data: { autofillProtected: true } })
      ]);
      console.info(`Elo difference is ${matchup.eloDifference}'`);
      for (const player of players) {
        ingame.set(player.userId, scrim.id);
      }
      return {
        scrim,
        players,
        lobbyDetails: {
          teamNames,
          voiceInvite: [inviteBlue.url, inviteRed.url],
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
      console.info(text);
      return res.length > 0;
    },
    createDraftLobby: async (teamNames) => {
      const payload = {
        type: 'createroom',
        blueName: teamNames[0],
        redName: teamNames[1],
        disabledTurns: [],
        disabledChamps: [],
        timePerPick: 60,
        timePerBan: 60
      };

      return new Promise((resolve, reject) => {
        const ws = new WebSocket('wss://draftlol.dawe.gg/');
        ws.onopen = () => {
          ws.send(JSON.stringify(payload));
          ws.onclose = () => console.log('CLOSED');
          ws.onmessage = (msg) => {
            const data = JSON.parse(msg.data.toString());
            if (data.type === 'roomcreated') {
              const room: RoomCreatedResult = data;
              console.log({ room });
              ws.close();

              const DRAFTLOL_URL = `https://draftlol.dawe.gg/${room.roomId}`;
              resolve({
                BLUE: `${DRAFTLOL_URL}/${room.bluePassword}`,
                RED: `${DRAFTLOL_URL}/${room.redPassword}`,
                SPECTATOR: DRAFTLOL_URL
              });
            }
          };
        };
        ws.onerror = (err) => {
          reject(err);
        };
      });
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
    sendMatchDetails: async (scrim, players, users, lobbyDetails) => {
      const { teamNames, voiceInvite } = lobbyDetails;
      const teams = sortUsersByTeam(users, players);
      const promises = await Promise.all([
        service.createDraftLobby(teamNames),
        service.generateScoutingLink(teams.BLUE),
        service.generateScoutingLink(teams.RED)
      ]);
      console.log(teams);

      const [draftURLs, opggBlue, opggRed] = promises;
      const lobbyName = `${chance.word({ length: 5 })}${chance.integer({ min: 10, max: 20 })}`;
      const password = chance.integer({ min: 1000, max: 9999 });

      const matchEmbed = matchDetailsEmbed(scrim, players, lobbyDetails);
      const blueEmbed = lobbyDetailsEmbed(
        teamNames[0],
        scrim.id,
        teams.BLUE,
        teams.RED,
        draftURLs.BLUE,
        lobbyName,
        password,
        opggBlue,
        opggRed
      );
      const redEmbed = lobbyDetailsEmbed(
        teamNames[1],
        scrim.id,
        teams.RED,
        teams.BLUE,
        draftURLs.RED,
        lobbyName,
        password,
        opggRed,
        opggBlue
      );

      const filteredPlayers = players.filter((p) => !p.userId.includes('-'));
      const blueIDs = filteredPlayers.filter((p) => p.side === 'BLUE').map((p) => p.userId);
      const redIDs = filteredPlayers.filter((p) => p.side === 'RED').map((p) => p.userId);

      const directMsg = await Promise.all([
        discordService.sendMatchDirectMessage(blueIDs, {
          embeds: [matchEmbed, blueEmbed],
          content: voiceInvite[0]
        }),
        discordService.sendMatchDirectMessage(redIDs, {
          embeds: [matchEmbed, redEmbed],
          content: voiceInvite[1]
        })
      ]);
      `${directMsg[0] + directMsg[1]} DMs have been sent`;
      const publicEmbed = matchEmbed.addFields({
        name: 'Draft',
        value: `[Spectate Draft](${draftURLs.SPECTATOR})`
      });
      return publicEmbed;
    },
    playerIsInMatch: (userId) => {
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

const sortUsersByTeam = (users: User[], players: Player[]) => {
  const red: (User | undefined)[] = [undefined, undefined, undefined, undefined, undefined];
  const blue: (User | undefined)[] = [undefined, undefined, undefined, undefined, undefined];
  for (const player of players) {
    const user = users.find((u) => u.id === player.userId);
    if (!user) continue;
    if (player.side === 'BLUE') blue[ROLE_ORDER[player.role]] = user;
    if (player.side === 'RED') red[ROLE_ORDER[player.role]] = user;
  }
  return { RED: red, BLUE: blue } as { RED: Team; BLUE: Team };
};

const getTeamTotalElo = (team: User[], players: Map<string, Player>): number =>
  team.reduce((prev, curr) => {
    let elo = prev + curr.elo;
    const player = players.get(curr.id)!!;
    if (curr.main != player.role) {
      elo -= OFFROLE_PENALTY[curr.rank];
    }
    return elo;
  }, 0);
