import { Rank, Region, Role } from '@prisma/client';
import { z } from 'zod';

export const SetupSchema = z.object({
  ign: z.string(),
  region: z.nativeEnum(Region),
  rank: z.nativeEnum(Rank),
  main: z.nativeEnum(Role),
  secondary: z.nativeEnum(Role)
});

export const MatchSchema = z.object({
  match_id: z.number(),
  status: z.enum(['BLUE', 'RED', 'REMAKE'])
});
