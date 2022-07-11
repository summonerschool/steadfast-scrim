import { Player, playerSchema } from '../entities/scrim';
import { chance } from '../lib/chance';
import { UserRepository } from './repo/user-repository';

export interface ScrimService {
  getScoutingLink: (scrimID: number, team: 'RED' | 'BLUE') => Promise<string>;
  createScrim: (queueID: string, users: string[]) => Promise<boolean>;
  randomTeambalance: (userIDs: string[]) => Promise<Player[]>;
}

export const initScrimService = (userRepo: UserRepository) => {
  const service: ScrimService = {
    getScoutingLink: async (scrimID, team) => {
      const users = await userRepo.getUsers({ player: { some: { scrim_id: scrimID, team: team } } });
      const server = users[0].server.toLocaleLowerCase();
      const summoners = encodeURIComponent(users.map((user) => user.leagueIGN).join(','));
      const link = `https://${server}.op.gg/multisearch/${server}?summoners=${summoners}`;
      return link;
    },
    createScrim: async (queueID, users) => {
      // Create scrim from queue id and a list of player ids
      const players = await service.randomTeambalance(users);
      return false;
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
    }
  };
  return service;
};
