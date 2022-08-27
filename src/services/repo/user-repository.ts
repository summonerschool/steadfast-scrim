import { Prisma, PrismaClient } from '@prisma/client';
import { User, mapToUser } from '../../entities/user';

export interface UserRepository {
  upsertUser: (payload: User) => Promise<User>;
  getUserByID: (id: User['id']) => Promise<User | undefined>;
  getUsers: (filter?: Prisma.UserWhereInput) => Promise<User[]>;
  updateUserWithResult: (users: User[]) => Promise<number>;
  updateUserFillStatus: (users: User[]) => Promise<number>;
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
      const promises = users.map((user) =>
        prisma.user.update({
          where: { id: user.id },
          data: { elo: user.elo, losses: user.losses, wins: user.wins }
        })
      );
      const results = await prisma.$transaction(promises);
      return results.length;
    },
    updateUserFillStatus: async (users) => {
      const nonfilled: string[] = [];
      const autofilled: string[] = [];
      for (const user of users) {
        if (user.isFill) {
          autofilled.push(user.id);
        } else {
          nonfilled.push(user.id);
        }
      }
      const [res1, res2] = await prisma.$transaction([
        // User got their role
        prisma.user.updateMany({
          where: { id: { in: nonfilled }, autofill_protected: true },
          data: { autofill_protected: false }
        }),
        // Autofilled user is protected
        prisma.user.updateMany({ where: { id: { in: autofilled } }, data: { autofill_protected: true } })
      ]);
      return res1.count + res2.count;
    }
  };
  return repo;
};
