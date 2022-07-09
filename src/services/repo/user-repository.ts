import { PrismaClient } from '@prisma/client';
import { User, mapToUser } from '../../entities/user';

export interface UserRepository {
  upsertUser: (payload: User) => Promise<User>;
  getUserByID: (id: User['id']) => Promise<User | undefined>;
}

// TODO: map the database user to the entity verison
export const initUserRepository = (prisma: PrismaClient) => {
  const repo: UserRepository = {
    upsertUser: async (payload) => {
      const user = await prisma.user.upsert({
        where: { id: payload.id },
        create: { ...payload, league_ign: payload.leagueIGN, external_elo: payload.externalElo },
        update: { ...payload, league_ign: payload.leagueIGN, external_elo: payload.externalElo }
      });
      return mapToUser(user);
    },
    getUserByID: async (id) => {
      const user = await prisma.user.findUnique({ where: { id } });
      return user ? mapToUser(user) : undefined;
    }
  };
  return repo;
};
