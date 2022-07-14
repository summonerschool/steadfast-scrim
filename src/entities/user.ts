import { Rank, Role as PrismaRole, Server, User as PrismaUser } from '@prisma/client';
import { z } from 'zod';

export const roleEnum = z.enum(['TOP', 'JUNGLE', 'MID', 'BOT', 'SUPPORT']);

export const userSchema = z.object({
  id: z.string(),
  leagueIGN: z.string().max(18),
  rank: z.nativeEnum(Rank),
  server: z.nativeEnum(Server),
  roles: z.array(z.nativeEnum(PrismaRole)),
  wins: z.number().int().min(0).optional(),
  losses: z.number().int().min(0).optional(),
  elo: z.number().int().min(0).optional(),
  external_elo: z.number().int().min(0).optional()
});

export type User = z.infer<typeof userSchema>;

export const mapToUser = (dbUser: PrismaUser) => {
  return userSchema.parse({
    ...dbUser,
    leagueIGN: dbUser.league_ign,
    elo: dbUser.elo,
    external_elo: dbUser.external_elo
  });
};
