import { Rank, Role, Server } from '@prisma/client';
import { UserRepository } from './repo/user-repository';

interface UserService {
  registerUser: (id: string, leagueIGN: string, rank: string, server: string, role: string) => void;
}

export const initUserService = (userRepo: UserRepository) => {
  const service: UserService = {
    registerUser: async (id, leagueIGN, rank, server, role) => {
      // validate user input
      // TODO: throw error message if the input is invalid
      // TODO: make logic for when the user has registered previously
      // const user = await userRepo.createUser({ id, league_ign: leagueIGN, Rank[rank], Server[server], Role[role]});
      // console.log(user);
    }
  };
  return service;
};
