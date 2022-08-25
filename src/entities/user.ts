import { User as PrismaUser } from '@prisma/client';
import { z } from 'zod';

enum Rank {
  IRON = 400,
  BRONZE = 800,
  SILVER = 1200,
  GOLD = 1600,
  PLATINUM = 2000,
  DIAMOND = 2400,
  MASTER = 2800,
  GRANDMASTER = 2800,
  CHALLENGER = 3000
}

export const regionEnum = z.enum(['EUW', 'NA']);
export type Region = z.infer<typeof regionEnum>;
export const roleEnum = z.enum(['TOP', 'JUNGLE', 'MID', 'BOT', 'SUPPORT']);
export const rankEnum = z.enum([
  'IRON',
  'BRONZE',
  'SILVER',
  'GOLD',
  'PLATINUM',
  'DIAMOND',
  'MASTER',
  'GRANDMASTER',
  'CHALLENGER'
]);

export type Role = z.infer<typeof roleEnum>;

export enum ROLE_ORDER {
  TOP = 0,
  JUNGLE = 1,
  MID = 2,
  BOT = 3,
  SUPPORT = 4
}

export const userSchema = z.object({
  id: z.string(),
  leagueIGN: z.string().max(18),
  rank: rankEnum,
  region: regionEnum,
  main: roleEnum,
  secondary: roleEnum,
  wins: z.number().int().nonnegative().default(0), // profile stuff
  losses: z.number().int().nonnegative().default(0),
  elo: z.number().int().min(0).default(0),
  external_elo: z.number().int().min(0).optional(),
  isFill: z.boolean().optional(),
  autofillProtected: z.boolean().optional()
});

export type User = z.infer<typeof userSchema>;

export const mapToUser = (dbUser: PrismaUser) => {
  return userSchema.parse({
    ...dbUser,
    leagueIGN: dbUser.league_ign,
    elo: dbUser.elo,
    external_elo: dbUser.external_elo,
    autofillProtected: dbUser.autofill_protected
  });
};
