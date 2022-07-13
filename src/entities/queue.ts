import { infer, z } from 'zod';
import { Queue as PrismaQueue, Queuer as PrismaQueuer, Rank, Role, Server } from '@prisma/client';

export const queuerSchema = z.object({
  userID: z.string(),
  popped: z.boolean(),
  queuedAt: z.date(),
  roles: z.array(z.nativeEnum(Role)).optional(),
  rank: z.nativeEnum(Rank).optional()
});

export const queueSchema = z.object({
  id: z.string().uuid(),
  guild: z.string(),
  inQueue: z.array(queuerSchema)
});

export type Queuer = z.infer<typeof queuerSchema>;
export type Queue = z.infer<typeof queueSchema>;

// todo: fix any here
export const mapToQueuer = (dbQueuer: any) =>
  queuerSchema.parse({
    userID: dbQueuer.user_id,
    popped: dbQueuer.popped,
    queuedAt: dbQueuer.queued_at,
    roles: dbQueuer.user.roles,
    rank: dbQueuer.user.rank
  });

export const mapToQueue = (dbQueue: PrismaQueue, dbQueuers: PrismaQueuer[]) => {
  const queuers = dbQueuers.map(mapToQueuer);
  return queueSchema.parse({
    id: dbQueue.id,
    guild: dbQueue.guild_id,
    inQueue: queuers
  });
};
