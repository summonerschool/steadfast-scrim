import { Scrim, GameSide, ProdraftResponse, ProdraftURLs } from '../entities/scrim';
import { User } from '../entities/user';
import { chance } from '../lib/chance';
import { MatchmakingService } from './matchmaking-service';
import { ScrimRepository } from './repo/scrim-repository';
import { UserRepository } from './repo/user-repository';
import fetch from 'node-fetch';
import { Status } from '@prisma/client';

export interface ScrimService {
  generateScoutingLink: (scrimID: number, side: GameSide) => Promise<string>;
  createBalancedScrim: (queueID: string, users: string[]) => Promise<Scrim>;
  getUserProfilesInScrim: (scrimID: number, side: GameSide) => Promise<User[]>;
  reportWinner: (scrim: Scrim, side: GameSide) => Promise<boolean>;
  createProdraftLobby: (scrimID: number) => Promise<ProdraftURLs>;
  getIncompleteScrims: (userID: string) => Promise<Scrim[]>;
}

export const initScrimService = (
  scrimRepo: ScrimRepository,
  userRepo: UserRepository,
  matchmakingService: MatchmakingService
) => {
  const TEAM_SIZE = 5;

  const service: ScrimService = {
    // Generates an opgg link for scouting purposes
    generateScoutingLink: async (scrimID, side) => {
      const users = await service.getUserProfilesInScrim(scrimID, side);
      const summoners = encodeURIComponent(users.map((user) => user.leagueIGN).join(','));
      const server = users[0].region.toLocaleLowerCase();
      const link = `https://op.gg/multisearch/${server}?summoners=${summoners}`;
      return link;
    },
    getUserProfilesInScrim: async (scrimID: number, side: GameSide) => {
      const users = await userRepo.getUsers({ player: { some: { scrim_id: scrimID, side: side } } });
      return users;
    },
    createBalancedScrim: async (queueID, usersIDs) => {
      // Create scrim from queue id and a list of player ids
      const users = await userRepo.getUsers({ id: { in: usersIDs } });
      const matchup = matchmakingService.startMatchmaking(users);
      const scrim = await scrimRepo.createScrim(queueID, matchup.players);
      return scrim;
    },
    reportWinner: async (scrim, team) => {
      const updated = await scrimRepo.updateScrim({ ...scrim, winner: team });
      return updated === 1;
    },
    createProdraftLobby: async (scrimID) => {
      const PRODRAFT_URL = 'http://prodraft.leagueoflegends.com/draft';
      const payload = {
        team1Name: `Blue ${chance.animal()}`,
        team2Name: `Red ${chance.animal()}`,
        matchName: `Summoner School Game #${scrimID}`
      };
      const res = await fetch(PRODRAFT_URL, {
        method: 'POST',
        body: JSON.stringify(payload),
        headers: {
          'Content-Type': 'application/json'
        }
      });
      const data: ProdraftResponse = await res.json();

      return {
        BLUE: {
          name: payload.team1Name,
          url: `http://prodraft.leagueoflegends.com/?draft=${data.id}&auth=${data.auth[0]}`
        },
        RED: {
          name: payload.team2Name,
          url: `http://prodraft.leagueoflegends.com/?draft=${data.id}&auth=${data.auth[1]}`
        },
        SPECTATOR: {
          name: 'spectator',
          url: `http://prodraft.leagueoflegends.com/?draft=${data.id}`
        }
      };
    },
    getIncompleteScrims: async (userID) => {
      return scrimRepo.getScrims({ players: { some: { user_id: userID } }, status: Status.STARTED });
    }
  };
  return service;
};
