import { Matchup, Pool, Team } from '../entities/matchmaking';
import { Player, playerSchema, Scrim, gamesideEnum, GameSide } from '../entities/scrim';
import { roleEnum, ROLE_ORDER, User } from '../entities/user';
import { MatchmakingService } from './matchmaking-service';
import { ScrimRepository } from './repo/scrim-repository';
import { UserRepository } from './repo/user-repository';

export interface ScrimService {
  generateScoutingLink: (scrimID: number, team: GameSide) => Promise<string>;
  createBalancedScrim: (queueID: string, users: string[]) => Promise<Scrim>;
  sortPlayerByTeam: (players: Player[]) => { RED: Player[]; BLUE: Player[] };
  isValidTeam: (players: Player[]) => boolean;
  getUserProfilesInScrim: (scrimID: number) => Promise<User[]>;
  reportWinner: (scrim: Scrim, side: GameSide) => Promise<boolean>;
}

export const initScrimService = (
  scrimRepo: ScrimRepository,
  userRepo: UserRepository,
  matchmakingService: MatchmakingService
) => {
  const TEAM_SIZE = 5;

  const service: ScrimService = {
    // Generates an opgg link for scouting purposes
    generateScoutingLink: async (scrimID, team) => {
      const users = await userRepo.getUsers({ player: { some: { scrim_id: scrimID, team: team } } });
      const summoners = encodeURIComponent(users.map((user) => user.leagueIGN).join(','));
      const server = users[0].region.toLocaleLowerCase();
      const link = `https://op.gg/multisearch/${server}?summoners=${summoners}`;
      return link;
    },
    getUserProfilesInScrim: async (scrimID: number) => {
      const users = await userRepo.getUsers({ player: { some: { scrim_id: scrimID } } });
      return users;
    },
    createBalancedScrim: async (queueID, usersIDs) => {
      // Create scrim from queue id and a list of player ids
      const users = await userRepo.getUsers({ id: { in: usersIDs } });
      const matchup = matchmakingService.startMatchmaking(users);
      const scrim = await scrimRepo.createScrim(queueID, matchup.players);
      return scrim;
    },
    sortPlayerByTeam: (players) => {
      const red = players.filter((p) => p.side === 'RED');
      const blue = players.filter((p) => p.side === 'BLUE');
      return { RED: red, BLUE: blue };
    },
    // Checks if the team size is correct and that the team has 5 unique different roles.
    isValidTeam: (players: Player[]) => {
      if (players.length != TEAM_SIZE) {
        return false;
      }
      const roles = players.map((p) => p.role);
      return new Set(roles).size === roles.length;
    },
    reportWinner: async (scrim, team) => {
      const updated = await scrimRepo.updateScrim({ ...scrim, winner: team });
      return updated === 1;
    }
  };
  return service;
};
