import { User, userSchema } from '../entities/user';
import { UserRepository } from './repo/user-repository';

interface UserService {
  setUserProfile: (id: string, leagueIGN: string, rank: string, server: string, role: string[]) => void;
  getUserProfile: (id: string) => Promise<User>;
  // createScoutingLink: (ids: string[]) => string;
}

export const initUserService = (userRepo: UserRepository) => {
  const service: UserService = {
    setUserProfile: async (id, leagueIGN, rank, server, role) => {
      console.log({id,leagueIGN,rank,server,role})
      // const user = await userRepo.upsertUser({
      //   id,
      //   leagueIGN,
      //   rank : userSchema.shape.rank.parse(rank),
      //   server: userSchema.shape.server.parse(server),
      //   role: userSchema.shape.role.parse(role),
      // });
      // return user
    },
    getUserProfile: async(id) => {
      const user = await userRepo.getUserByID(id)
      if (!user) throw new Error(`User(${id}) could not be found`)
      return user
    }
  };
  return service;
};
