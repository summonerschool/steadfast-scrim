import { PrismaClient, User } from '@prisma/client';

export interface UserRepository {
  createUser: (payload: User) => Promise<User>;
  getUserByID: (id: User['id']) => Promise<User | null>;
}

// TODO: map the database user to the entity verison
export const initUserRepository = (prisma: PrismaClient) => {
  const repo: UserRepository = {
    createUser: async (payload) => {
      const user = await prisma.user.create({
        data: payload
      });
      return user;
    },
    getUserByID: async (id) => {
      const user = await prisma.user.findUnique({ where: { id } });
      if (!user) return null;
      return user;
    }
  };
  return repo;
};
