import { Status, Scrim as PrismaScrim, Player as PrismaPlayer } from '@prisma/client';
import { z } from 'zod';
import { roleEnum } from './user';

export const gamesideEnum = z.enum(['RED', 'BLUE']);

export type GameSide = z.infer<typeof gamesideEnum>;

export const playerSchema = z.object({
  userID: z.string(),
  role: roleEnum,
  side: gamesideEnum
});

export const scrimSchema = z.object({
  id: z.number().int(),
  status: z.nativeEnum(Status),
  voiceIDs: z.array(z.string()),
  players: z.array(playerSchema),
  queueID: z.string(),
  winner: gamesideEnum.optional()
});

export type Player = z.infer<typeof playerSchema>;
export type Scrim = z.infer<typeof scrimSchema>;

export const mapToPlayer = (p: PrismaPlayer) => {
  return playerSchema.parse({
    role: p.role,
    userID: p.user_id,
    side: p.side
  });
};

export const mapToScrim = (dbScrim: PrismaScrim, dbPlayers: PrismaPlayer[]) => {
  const scrim = scrimSchema.parse({
    ...dbScrim,
    voiceIDs: dbScrim.voice_ids,
    queueID: dbScrim.queue_id,
    players: dbPlayers.map(mapToPlayer),
    winner: dbScrim.winner || undefined
  });
  return scrim;
};

export interface ProdraftResponse {
  auth: [string, string];
  id: string;
  champions: string[];
  // dont care
  game: object;
}

interface DraftEntry {
  url: string;
  name: string;
}
export interface ProdraftURLs {
  RED: DraftEntry;
  BLUE: DraftEntry;
  SPECTATOR: DraftEntry;
}
