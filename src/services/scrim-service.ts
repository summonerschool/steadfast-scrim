import { Scrim, GameSide } from '../entities/scrim';
import { User } from '../entities/user';
import { chance } from '../lib/chance';
import { MatchmakingService } from './matchmaking-service';
import { ScrimRepository } from './repo/scrim-repository';
import { UserRepository } from './repo/user-repository';
import { Status } from '@prisma/client';
import axios from 'axios';
import { NotFoundError } from '../errors/errors';
import { ProdraftURLs, ProdraftResponse } from '../entities/external';

export interface ScrimService {
  generateScoutingLink: (scrimID: number, side: GameSide) => Promise<string>;
  createBalancedScrim: (queueID: string, users: string[]) => Promise<Scrim>;
  getUserProfilesInScrim: (scrimID: number, side: GameSide) => Promise<User[]>;
  reportWinner: (scrim: Scrim, side: GameSide) => Promise<boolean>;
  createProdraftLobby: (scrimID: number) => Promise<ProdraftURLs>;
  getIncompleteScrims: (userID: string) => Promise<Scrim[]>;
  findScrim: (scrimID: number) => Promise<Scrim>;
  remakeScrim: (scrim: Scrim) => Promise<boolean> 
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
      const players = matchmakingService.matchupToPlayers(matchup[0], users);
      const scrim = await scrimRepo.createScrim(queueID, players);
      return scrim;
    },
    reportWinner: async (scrim, team) => {
      const updated = await scrimRepo.updateScrim({ ...scrim, winner: team });
      return !!updated;
    },
    createProdraftLobby: async (scrimID) => {
      const PRODRAFT_URL = 'http://prodraft.leagueoflegends.com/draft';
      const payload = {
        team1Name: `Blue ${chance.animal()}`,
        team2Name: `Red ${chance.animal()}`,
        matchName: `Summoner School Game #${scrimID}`
      };
      const res = await axios.post<ProdraftResponse>(PRODRAFT_URL, payload);
      const data = res.data;

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
    },
    findScrim: async (scrimID) => {
      const scrim = await scrimRepo.getScrimByID(scrimID);
      if (!scrim) {
        throw new NotFoundError('No scrims found with that ID');
      }
      return scrim;
    },
    remakeScrim: async (scrim) => {
      const remakeScrim: Scrim = {...scrim,  status: "REMAKE"}
      const success = await scrimRepo.updateScrim(remakeScrim)
      return success.status === "REMAKE"
    }
  };
  return service;
};
