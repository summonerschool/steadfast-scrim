import { UserRepository } from './repo/user-repository';

interface ScrimService {
  getScoutingLink: (scrimID: number) => Promise<string>;
  createScrim: (queueID: string, users: string[]) => Promise<boolean>;
}

const initScrimService = (userRepo: UserRepository) => {
  const service: ScrimService = {
    getScoutingLink: async (scrimID) => {
      const users = await userRepo.getUsers({ player: { some: { scrimId: scrimID } } });
      const summoners = users.map((user) => user.leagueIGN).join(',');
      const server = users[0].server.toLocaleLowerCase();
      const link = `https://${server}.op.gg/multisearch/${server}?summoners=${summoners}`;
      return link;
    },
    createScrim: async () => {
      // Create scrim from queue id and a list of player ids
      return false;
    }
  };
  return service;
};
