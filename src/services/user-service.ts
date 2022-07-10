import { User, userSchema } from '../entities/user';
import { UserRepository } from './repo/user-repository';

export interface UserService {
  setUserProfile: (id: string, leagueIGN: string, rank: string, server: string, roles: string[]) => Promise<User>;
  getUserProfile: (id: string) => Promise<User>;
  getUserRankImage: (rank: string | undefined) => string;
  getUsersByGame: () => Promise<User[]>;
}

export const initUserService = (userRepo: UserRepository) => {
  const service: UserService = {
    setUserProfile: async (id, leagueIGN, rank, server, roles) => {
      const data = { id, leagueIGN, rank, server, roles };
      const user = userSchema.parse(data);
      return userRepo.upsertUser(user);
    },
    getUserProfile: async (id) => {
      const user = await userRepo.getUserByID(id);
      if (!user) throw new Error(`User(${id}) could not be found`);
      return user;
    },
    getUserRankImage: (rank: string = 'IRON') => {
      const rankImage: { [key: string]: string } = {
        IRON: 'https://static.wikia.nocookie.net/leagueoflegends/images/f/fe/Season_2022_-_Iron.png',
        BRONZE: 'https://static.wikia.nocookie.net/leagueoflegends/images/e/e9/Season_2022_-_Bronze.png',
        SILVER: 'https://static.wikia.nocookie.net/leagueoflegends/images/4/44/Season_2022_-_Silver.png',
        GOLD: 'https://static.wikia.nocookie.net/leagueoflegends/images/8/8d/Season_2022_-_Gold.png',
        PLATINUM: 'https://static.wikia.nocookie.net/leagueoflegends/images/3/3b/Season_2022_-_Platinum.png',
        DIAMOND: 'https://static.wikia.nocookie.net/leagueoflegends/images/e/ee/Season_2022_-_Diamond.png',
        MASTER: 'https://static.wikia.nocookie.net/leagueoflegends/images/e/eb/Season_2022_-_Master.png',
        GRANDMASTER: 'https://static.wikia.nocookie.net/leagueoflegends/images/f/fc/Season_2022_-_Grandmaster.png',
        CHALLENGER: 'https://static.wikia.nocookie.net/leagueoflegends/images/0/02/Season_2022_-_Challenger.png'
      };

      return rankImage[rank];
    },
    getUsersByGame: async () => {
      // get IDS from a game
      const playerIDs = ['asdf', '1234', '1234'];
      const users = await userRepo.getUsers({ id: { in: playerIDs } });
      return users;
    }
  };
  return service;
};
