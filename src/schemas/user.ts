import { Rank, Region, Role } from '@prisma/client';
import { z } from 'zod';

export const SetupCommandInputSchema = z.object({
  ign: z.string(),
  region: z.nativeEnum(Region),
  rank: z.nativeEnum(Rank),
  main: z.nativeEnum(Role),
  secondary: z.nativeEnum(Role)
});

export type SetupInput = z.infer<typeof SetupCommandInputSchema>;

export const MatchCommandInputSchema = z.object({
  id: z.number(),
  status: z.enum(['WIN', 'LOSS', 'REMAKE'])
});

export type MatchInput = z.infer<typeof MatchCommandInputSchema>;
