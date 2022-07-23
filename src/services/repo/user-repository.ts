import { Prisma, PrismaClient } from '@prisma/client';
import { User, mapToUser } from '../../entities/user';

export interface UserRepository {
  upsertUser: (payload: User) => Promise<User>;
  getUserByID: (id: User['id']) => Promise<User | undefined>;
  getUsers: (filter?: Prisma.UserWhereInput) => Promise<User[]>;
  updateUserWithResult: (users: User[]) => Promise<number>;
}

export const initUserRepository = (prisma: PrismaClient) => {
  const repo: UserRepository = {
    upsertUser: async (payload) => {
      const { id, rank, region, main, secondary, elo, external_elo, leagueIGN } = payload;
      const user = await prisma.user.upsert({
        where: { id: payload.id },
        create: {
          id,
          league_ign: leagueIGN,
          rank,
          region,
          main,
          secondary,
          elo: elo,
          external_elo: external_elo
        },
        update: {
          league_ign: leagueIGN,
          elo: elo,
          external_elo: external_elo,
          rank,
          region,
          main,
          secondary
        }
      });
      return mapToUser(user);
    },
    getUserByID: async (id) => {
      const user = await prisma.user.findUnique({ where: { id } });
      return user ? mapToUser(user) : undefined;
    },
    getUsers: async (filter) => {
      const users = await prisma.user.findMany({ where: filter });
      return users.map(mapToUser);
    },
    updateUserWithResult: async (users: User[]) => {
      const promises = await prisma.$transaction(
        users.map((user) =>
          prisma.user.update({
            where: { id: user.id },
            data: { elo: user.elo, loss: user.losses, win: user.elo }
          })
        )
      );
      return promises.length;
    }
  };
  return repo;
};
