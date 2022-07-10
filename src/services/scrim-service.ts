import { UserService } from './user-service';

interface ScrimService {
  getScoutingLink: () => Promise<string>;
}

const initScrimService = (userService: UserService) => {
  const service: ScrimService = {
    getScoutingLink: async () => {
      const users = await userService.getUsersByGame();
      const summoners = users.map((user) => user.leagueIGN).join(',');
      const server = users[0].server.toLocaleLowerCase();
      const link = `https://${server}.op.gg/multisearch/${server}?summoners=${summoners}`;
      return link;
    }
  };
  return service;
};
