import { Rank, Role, Server, User as PrismaUser } from '@prisma/client';
import { z } from 'zod';

export const userSchema = z.object({
  id: z.string(),
  leagueIGN: z.string().max(18),
  rank: z.nativeEnum(Rank),
  server: z.nativeEnum(Server),
  roles: z.array(z.nativeEnum(Role)),
  wins: z.number().int().min(0).optional(),
  losses: z.number().int().min(0).optional(),
  elo: z.number().int().min(0).optional(),
  externalElo: z.number().int().min(0).optional()
});

export type User = z.infer<typeof userSchema>;

export const mapToUser = (dbUser: PrismaUser) => {
  const user = userSchema.parse({
    ...dbUser,
    leagueIGN: dbUser.league_ign,
    externalElo: dbUser.external_elo
  });
  return user;
};
