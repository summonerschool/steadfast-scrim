import { infer, z } from 'zod';
import { Queue as PrismaQueue, Queuer as PrismaQueuer } from '@prisma/client';

export const queuerSchema = z.object({
  userID: z.string(),
  popped: z.boolean(),
  queuedAt: z.date()
});

export const queueSchema = z.object({
  id: z.string().uuid(),
  guild: z.string(),
  inQueue: z.array(queuerSchema)
});

export type Queuer = z.infer<typeof queuerSchema>;
export type Queue = z.infer<typeof queueSchema>;

export const mapToQueuer = (dbQueuer: PrismaQueuer) =>
  queuerSchema.parse({
    userID: dbQueuer.user_id,
    popped: dbQueuer.popped,
    queuedAt: dbQueuer.queued_at
  });

export const mapToQueue = (dbQueue: PrismaQueue, dbQueuers: PrismaQueuer[]) => {
  const queuers = dbQueuers.map(mapToQueuer);
  return queueSchema.parse({
    id: dbQueue.id,
    guild: dbQueue.guild_id,
    inQueue: queuers
  });
};
