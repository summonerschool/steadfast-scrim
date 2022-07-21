import { z } from 'zod';
import { User, userSchema } from './user';

export const teamSchema = z.tuple([userSchema, userSchema, userSchema, userSchema, userSchema]);
export const matchupSchema = z.object({
  eloDifference: z.number().int(),
  team1: teamSchema,
  team2: teamSchema,
  offroleCount: z.number().int().default(0),
  leastFairLaneDiff: z.number().int().default(0)
});

export type RolePool = User[];
export type Team = [User, User, User, User, User];
export type Pool = [RolePool, RolePool, RolePool, RolePool, RolePool];
export type Matchup = z.infer<typeof matchupSchema>;
