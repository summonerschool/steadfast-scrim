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
      const { id, rank, server, roles, externalElo, leagueIGN } = payload;
      const user = await prisma.user.upsert({
        where: { id: payload.id },
        create: {
          id,
          league_ign: leagueIGN,
          rank,
          server,
          roles
        },
        update: {
          league_ign: leagueIGN,
          external_elo: externalElo,
          rank,
          server,
          roles
        }
      });
      console.log(user);
      return mapToUser(user);
    },
    getUserByID: async (id) => {
      const user = await prisma.user.findUnique({ where: { id } });
      return user ? mapToUser(user) : undefined;
    }
  };
  return repo;
};
