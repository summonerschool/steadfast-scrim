import { Role, Status, Team, Scrim as PrismaScrim, Player as PrismaPlayer } from '@prisma/client';
import { z } from 'zod';

export const playerSchema = z.object({
  userID: z.string(),
  role: z.nativeEnum(Role),
  team: z.nativeEnum(Team)
});

export const scrimSchema = z.object({
  id: z.number().int(),
  status: z.nativeEnum(Status),
  voiceIDs: z.array(z.string()),
  players: z.array(playerSchema),
  queueID: z.string()
});

export type Player = z.infer<typeof playerSchema>;
export type Scrim = z.infer<typeof scrimSchema>;

export const mapToPlayer = (p: PrismaPlayer) => {
  return playerSchema.parse({
    role: p.role,
    userID: p.user_id,
    team: p.team
  });
};

export const mapToScrim = (dbScrim: PrismaScrim, dbPlayers: PrismaPlayer[]) => {
  const scrim = scrimSchema.parse({
    ...dbScrim,
    voiceIDs: dbScrim.voice_ids,
    queueID: dbScrim.queue_id,
    players: dbPlayers.map(mapToPlayer)
  });
  return scrim;
};
