import { User, userSchema } from '../entities/user';
import { UserRepository } from './repo/user-repository';

interface UserService {
  setUserProfile: (id: string, leagueIGN: string, rank: string, server: string, roles: string[]) => Promise<User>;
  getUserProfile: (id: string) => Promise<User>;
  // createScoutingLink: (ids: string[]) => string;
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
    }
  };
  return service;
};
