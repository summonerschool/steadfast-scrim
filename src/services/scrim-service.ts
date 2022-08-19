import { Scrim, GameSide, Player, LobbyDetails } from '../entities/scrim';
import { Region, User } from '../entities/user';
import { chance } from '../lib/chance';
import { MatchmakingService } from './matchmaking-service';
import { ScrimRepository } from './repo/scrim-repository';
import { UserRepository } from './repo/user-repository';
import { Status } from '@prisma/client';
import axios from 'axios';
import { NotFoundError } from '../errors/errors';
import { ProdraftURLs, ProdraftResponse } from '../entities/external';
import { EmbedBuilder } from 'discord.js';
import { lobbyDetailsEmbed, matchDetailsEmbed } from '../components/match-message';
import { DiscordService } from './discord-service';

export interface ScrimService {
  generateScoutingLink: (users: User[]) => string;
  createBalancedScrim: (
    guildID: string,
    region: Region,
    users: User[]
  ) => Promise<{ scrim: Scrim; lobbyDetails: LobbyDetails }>;
  getUserProfilesInScrim: (scrimID: number, side: GameSide) => Promise<User[]>;
  reportWinner: (scrim: Scrim, side: GameSide) => Promise<boolean>;
  createProdraftLobby: (scrimID: number, teamNames: [string, string]) => Promise<ProdraftURLs>;
  getIncompleteScrims: (userID: string) => Promise<Scrim[]>;
  findScrim: (scrimID: number) => Promise<Scrim>;
  remakeScrim: (scrim: Scrim) => Promise<boolean>;
  addResultsToPlayerStats: (scrim: Scrim) => Promise<number>;
  sendMatchDetails: (scrim: Scrim, users: User[], lobbyDetails: LobbyDetails) => Promise<EmbedBuilder>;
}

export const initScrimService = (
  scrimRepo: ScrimRepository,
  userRepo: UserRepository,
  matchmakingService: MatchmakingService,
  discordService: DiscordService
) => {
  const service: ScrimService = {
    // Generates an opgg link for scouting purposes
    generateScoutingLink: (users) => {
      const summoners = encodeURIComponent(users.map((user) => user.leagueIGN).join(','));
      const server = users[0].region.toLocaleLowerCase();
      const link = `https://op.gg/multisearch/${server}?summoners=${summoners}`;
      return link;
    },
    getUserProfilesInScrim: async (scrimID: number, side: GameSide) => {
      const users = await userRepo.getUsers({ player: { some: { scrim_id: scrimID, side: side } } });
      return users;
    },
    createBalancedScrim: async (guildID, region, users) => {
      const teamNames: [string, string] = [`Blue ${chance.animal()}`, `Red ${chance.animal()}`];
      const [rolePrio, eloPrio] = matchmakingService.startMatchmaking(users);
      // random number
      const matchup = rolePrio.eloDifference < 500 ? rolePrio : eloPrio;
      const players = matchmakingService.matchupToPlayers(matchup, users);
      const voiceChannels = await discordService.createVoiceChannels(guildID, teamNames);
      const [scrim, inviteBlue, inviteRed] = await Promise.all([
        scrimRepo.createScrim(
          guildID,
          region,
          players,
          voiceChannels.map((vc) => vc.id)
        ),
        voiceChannels[0].createInvite(),
        voiceChannels[1].createInvite()
      ]);
      console.info(`Elo difference is ${matchup.eloDifference}`);
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
    reportWinner: async (scrim, team) => {
      const updated = await scrimRepo.updateScrim({ ...scrim, status: 'COMPLETED', winner: team });
      return !!updated;
    },
    createProdraftLobby: async (scrimID, teamNames) => {
      const PRODRAFT_URL = 'http://prodraft.leagueoflegends.com/draft';
      const payload = {
        team1Name: teamNames[0],
        team2Name: teamNames[1],
        matchName: `Summoner School Game #${scrimID}`
      };
      const res = await axios.post<ProdraftResponse>(PRODRAFT_URL, payload);
      const data = res.data;

      return {
        BLUE: `http://prodraft.leagueoflegends.com/?draft=${data.id}&auth=${data.auth[0]}`,
        RED: `http://prodraft.leagueoflegends.com/?draft=${data.id}&auth=${data.auth[1]}`,
        SPECTATOR: `http://prodraft.leagueoflegends.com/?draft=${data.id}`
      };
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
      return success.status === 'REMAKE';
    },
    addResultsToPlayerStats: async (scrim) => {
      const userIDs = scrim.players.map((p) => p.userID);
      const users = await userRepo.getUsers({ id: { in: userIDs } });
      const red: User[] = [];
      const blue: User[] = [];

      // Sort the users into side
      console.log(`${scrim.winner} WIN`);
      for (const user of users) {
        const side = scrim.players.find((p) => p.userID == user.id)!!.side;
        if (side === 'BLUE') blue.push(user);
        if (side === 'RED') red.push(user);
      }
      // Get the average elo for the teams
      const totalBlueElo = blue.reduce((prev, curr) => prev + curr.elo, 0);
      const totalRedElo = red.reduce((prev, curr) => prev + curr.elo, 0);

      const blueWinChances = 1 / (1 + 10 ** ((totalRedElo - totalBlueElo) / 650));
      const redWinChances = 1 - blueWinChances;
      const updatedUsers: User[] = users.map((user) => {
        const totalGames = user.wins + user.losses;
        const K = totalGames <= 14 ? 60 - 2 * totalGames : 32;
        const eloChange = Math.round(K * (scrim.winner === 'BLUE' ? 1 - blueWinChances : 1 - redWinChances));
        const hasWon = scrim.players.find((p) => p.userID === user.id)!!.side === scrim.winner;
        const elo = hasWon ? user.elo + eloChange : user.elo - eloChange;
        if (hasWon) {
          return { ...user, elo, wins: user.wins + 1 };
        } else {
          return { ...user, elo, losses: user.losses + 1 };
        }
      });
      console.log(updatedUsers.map((u) => `${u.leagueIGN}: ${u.elo}`));
      return userRepo.updateUserWithResult(updatedUsers);
    },
    sendMatchDetails: async (scrim, users, lobbyDetails) => {
      const { teamNames, voiceInvite } = lobbyDetails;
      const teams = sortUsersByTeam(users, scrim.players);
      const promises = await Promise.all([
        service.createProdraftLobby(scrim.id, teamNames),
        service.generateScoutingLink(teams.BLUE),
        service.generateScoutingLink(teams.RED)
      ]);

      const [draftURLs, opggBlue, opggRed] = promises;
      const lobbyName = `${chance.word({ length: 5 })}${chance.integer({ min: 10, max: 20 })}`;
      const password = chance.integer({ min: 1000, max: 9999 });

      const matchEmbed = matchDetailsEmbed(scrim, opggBlue, opggRed, lobbyDetails);
      const blueEmbed = lobbyDetailsEmbed(teamNames[0], scrim.id, teams.BLUE, draftURLs.BLUE, lobbyName, password);
      const redEmbed = lobbyDetailsEmbed(teamNames[1], scrim.id, teams.RED, draftURLs.RED, lobbyName, password);

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
      const publicEmbed = matchEmbed.addFields({ name: 'Draft', value: `[Spectate Draft](${draftURLs.SPECTATOR})` });
      return publicEmbed;
    }
  };
  return service;
};

const sortUsersByTeam = (users: User[], players: Player[]) => {
  const sideMap = new Map<string, GameSide>();
  const teams = { RED: [], BLUE: [] } as { [key in GameSide]: User[] };
  for (const player of players) {
    const user = users.find((u) => u.id === player.userID);
    if (!user) continue;
    sideMap.set(user.id, player.side);
    if (player.side === 'BLUE') teams.BLUE.push(user);
    if (player.side === 'RED') teams.RED.push(user);
  }
  return teams;
};
