import { Scrim, GameSide, Player, LobbyDetails } from '../entities/scrim';
import { Region, ROLE_ORDER, User } from '../entities/user';
import { chance } from '../lib/chance';
import { MatchmakingService, OFFROLE_PENALTY } from './matchmaking-service';
import { ScrimRepository } from './repo/scrim-repository';
import { UserRepository } from './repo/user-repository';
import { Status } from '@prisma/client';
import { NotFoundError } from '../errors/errors';
import { DraftURLs } from '../entities/external';
import { EmbedBuilder } from 'discord.js';
import { lobbyDetailsEmbed, matchDetailsEmbed } from '../components/match-message';
import { DiscordService } from './discord-service';
import WebSocket from 'ws';
import { Team } from '../entities/matchmaking';
import { adjectives } from '../lib/adjectives';
import { capitalize } from '../utils/utils';

export interface ScrimService {
  generateScoutingLink: (users: User[]) => string;
  createBalancedScrim: (
    guildID: string,
    region: Region,
    queuers: User[]
  ) => Promise<{ scrim: Scrim; lobbyDetails: LobbyDetails }>;
  getUserProfilesInScrim: (scrimID: number, side: GameSide) => Promise<User[]>;
  reportWinner: (scrim: Scrim, winner: GameSide) => Promise<boolean>;
  createDraftLobby: (teamNames: [string, string]) => Promise<DraftURLs>;
  getIncompleteScrims: (userID: string) => Promise<Scrim[]>;
  findScrim: (scrimID: number) => Promise<Scrim>;
  remakeScrim: (scrim: Scrim) => Promise<boolean>;
  sendMatchDetails: (scrim: Scrim, users: User[], lobbyDetails: LobbyDetails) => Promise<EmbedBuilder>;
  getActiveScrims: () => Scrim[];
}

interface RoomCreatedResult {
  type: string;
  roomId: string;
  bluePassword: string;
  redPassword: string;
  adminPassword: string;
}

export const initScrimService = (
  scrimRepo: ScrimRepository,
  userRepo: UserRepository,
  matchmakingService: MatchmakingService,
  discordService: DiscordService
) => {
  const activeGames = new Map<number, Scrim>();
  const service: ScrimService = {
    // Generates an opgg link for scouting purposes
    generateScoutingLink: (users) => {
      const summoners = users.map((user) => encodeURIComponent(user.leagueIGN)).join(',');
      const server = users[0].region.toLocaleLowerCase();
      const link = `https://u.gg/multisearch?summoners=${summoners}&region=${server}1`;
      return link;
    },
    getUserProfilesInScrim: async (scrimID: number, side: GameSide) => {
      const users = await userRepo.getUsers({ player: { some: { scrim_id: scrimID, side: side } } });
      return users;
    },
    createBalancedScrim: async (guildID, region, queuers) => {
      const users = matchmakingService.attemptFill(queuers);
      const teamNames: [string, string] = [
        `🟦 ${capitalize(chance.pickone(adjectives))} ${chance.animal()}`,
        `🟥 ${capitalize(chance.pickone(adjectives))} ${chance.animal()}`
      ];
      const [rolePrio, eloPrio] = matchmakingService.startMatchmaking(users);
      // random number
      const matchup = rolePrio.eloDifference < 500 ? rolePrio : eloPrio;
      const players = matchmakingService.matchupToPlayers(matchup, users);
      const voiceChannels = await discordService.createVoiceChannels(guildID, teamNames);
      const [scrim, inviteBlue, inviteRed, _] = await Promise.all([
        scrimRepo.createScrim(
          guildID,
          region,
          players,
          voiceChannels.map((vc) => vc.id)
        ),
        voiceChannels[0].createInvite(),
        voiceChannels[1].createInvite(),
        userRepo.updateUserFillStatus(users)
      ]);
      activeGames.set(scrim.id, scrim);
      console.info(`Elo difference is ${matchup.eloDifference}'`);
      return {
        scrim,
        lobbyDetails: {
          teamNames,
          voiceInvite: [inviteBlue.url, inviteRed.url],
          eloDifference: matchup.eloDifference,
          offroleCount: matchup.offroleCount,
          autoFilledCount: users.filter((u) => u.isFill).length
        }
      };
    },
    reportWinner: async (old, winner) => {
      const scrim = await scrimRepo.updateScrim({ ...old, status: 'COMPLETED', winner: winner });
      scrim.players = old.players;

      const userIDs = scrim.players.map((p) => p.userID);
      const users = await userRepo.getUsers({ id: { in: userIDs } });

      const playerMap = new Map<string, Player>();
      const red: User[] = [];
      const blue: User[] = [];
      // Sort the users into side
      for (const user of users) {
        const player = scrim.players.find((p) => p.userID == user.id)!!;
        if (player.side === 'BLUE') blue.push(user);
        if (player.side === 'RED') red.push(user);
        playerMap.set(user.id, player);
      }
      // Get the average elo for the teams
      const totalBlueElo = getTeamTotalElo(blue, playerMap);
      const totalRedElo = getTeamTotalElo(red, playerMap);
      const blueWinChances = 1 / (1 + 10 ** ((totalRedElo - totalBlueElo) / 650));
      const redWinChances = 1 - blueWinChances;
      let text = `Game #${scrim.id}\nBlue Elo: ${totalBlueElo}\nRed Elo:${totalRedElo}\nWinner is ${winner}\n`;
      const updatedUsers: User[] = users.map((user) => {
        const totalGames = user.wins + user.losses;
        const K = totalGames <= 14 ? 60 - 2 * totalGames : 32;
        const eloChange = Math.round(K * (scrim.winner === 'BLUE' ? 1 - blueWinChances : 1 - redWinChances));
        const hasWon = scrim.players.find((p) => p.userID === user.id)!!.side === scrim.winner;
        const elo = hasWon ? user.elo + eloChange : user.elo - eloChange;
        text += `${user.leagueIGN}: ${user.elo} -> ${elo}\n`;
        if (hasWon) {
          return { ...user, elo, wins: user.wins + 1 };
        } else {
          return { ...user, elo, losses: user.losses + 1 };
        }
      });
      console.info(text);
      const res = await userRepo.updateUserWithResult(updatedUsers);
      activeGames.delete(scrim.id);
      return res > 0;
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
    getIncompleteScrims: async (userID) => {
      return scrimRepo.getScrims({ players: { some: { user_id: userID } }, status: Status.STARTED });
    },
    findScrim: async (scrimID) => {
      const scrim = await scrimRepo.getScrimByID(scrimID);
      if (!scrim) {
        throw new NotFoundError('No scrims found with that ID');
      }
      return scrim;
    },
    remakeScrim: async (scrim) => {
      const remakeScrim: Scrim = { ...scrim, status: 'REMAKE' };
      const success = await scrimRepo.updateScrim(remakeScrim);
      activeGames.delete(scrim.id);
      return success.status === 'REMAKE';
    },
    sendMatchDetails: async (scrim, users, lobbyDetails) => {
      const { teamNames, voiceInvite } = lobbyDetails;
      const teams = sortUsersByTeam(users, scrim.players);
      const promises = await Promise.all([
        service.createDraftLobby(teamNames),
        service.generateScoutingLink(teams.BLUE),
        service.generateScoutingLink(teams.RED)
      ]);

      const [draftURLs, opggBlue, opggRed] = promises;
      const lobbyName = `${chance.word({ length: 5 })}${chance.integer({ min: 10, max: 20 })}`;
      const password = chance.integer({ min: 1000, max: 9999 });

      const matchEmbed = matchDetailsEmbed(scrim, lobbyDetails);
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

      const players = scrim.players.filter((p) => !p.userID.includes('-'));
      const blueIDs = players.filter((p) => p.side === 'BLUE').map((p) => p.userID);
      const redIDs = players.filter((p) => p.side === 'RED').map((p) => p.userID);

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
    getActiveScrims: () => {
      return [...activeGames.values()];
    }
  };
  return service;
};

const sortUsersByTeam = (users: User[], players: Player[]) => {
  const red: (User | undefined)[] = [, , , , ,];
  const blue: (User | undefined)[] = [, , , , ,];
  for (const player of players) {
    const user = users.find((u) => u.id === player.userID);
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
