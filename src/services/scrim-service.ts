import { Role } from '@prisma/client';
import { Player, playerSchema, Scrim } from '../entities/scrim';
import { User } from '../entities/user';
import { chance } from '../lib/chance';
import { ScrimRepository } from './repo/scrim-repository';
import { UserRepository } from './repo/user-repository';

export interface ScrimService {
  generateScoutingLink: (scrimID: number, team: 'RED' | 'BLUE') => Promise<string>;
  createBalancedScrim: (queueID: string, users: string[]) => Promise<Scrim>;
  randomTeambalance: (userIDs: string[]) => Promise<Player[]>;
  sortPlayerByTeam: (players: Player[]) => { RED: Player[]; BLUE: Player[] };
  isValidTeam: (players: Player[]) => boolean;
  getUserProfilesInScrim: (scrimID: number) => Promise<User[]>;
  canCreatePerfectMatchup: (users: User[]) => boolean;
}

export const initScrimService = (scrimRepo: ScrimRepository, userRepo: UserRepository) => {
  const TEAM_SIZE = 5;

  const service: ScrimService = {
    generateScoutingLink: async (scrimID, team) => {
      const users = await userRepo.getUsers({ player: { some: { scrim_id: scrimID, team: team } } });
      const summoners = encodeURIComponent(users.map((user) => user.leagueIGN).join(','));
      const server = users[0].server.toLocaleLowerCase();
      const link = `https://op.gg/multisearch/${server}?summoners=${summoners}`;
      return link;
    },
    getUserProfilesInScrim: async (scrimID: number) => {
      const users = await userRepo.getUsers({ player: { some: { scrim_id: scrimID } } });
      return users;
    },
    createBalancedScrim: async (queueID, users) => {
      // Create scrim from queue id and a list of player ids
      const players = await service.randomTeambalance(users);
      const scrim = await scrimRepo.createScrim(queueID, players);
      return scrim;
    },
    randomTeambalance: async (userIDs) => {
      const roles = {
        BLUE: chance.shuffle(Object.values(playerSchema.shape.role.enum)),
        RED: chance.shuffle(Object.values(playerSchema.shape.role.enum))
      };
      const users = chance.shuffle(Object.values(userIDs));

      const players = users.map((id, i) => {
        const team = i > 4 ? 'BLUE' : 'RED';
        return playerSchema.parse({
          userID: id,
          role: roles[team].pop(),
          team: team
        });
      });
      return players;
    },
    sortPlayerByTeam: (players) => {
      const red = players.filter((p) => p.team === 'RED');
      const blue = players.filter((p) => p.team === 'BLUE');
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
    canCreatePerfectMatchup: (users) => {
      // checks if we have a perfect match
      const mainRoles = new Map<string, number>();
      for (const user of users) {
        mainRoles.set(user.roles[0], (mainRoles.get(user.roles[0]) || 0) + 1);
      }
      const twoPlayersPerRole = Object.values(mainRoles).every((count) => count === 2);
      return twoPlayersPerRole;
    }
  };
  return service;
};
