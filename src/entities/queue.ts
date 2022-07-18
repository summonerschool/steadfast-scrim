import { infer, z } from 'zod';
import { Queue as PrismaQueue, Queuer as PrismaQueuer, Rank, Role } from '@prisma/client';
import { regionEnum } from './user';

export const queuerSchema = z.object({
  userID: z.string(),
  popped: z.boolean(),
  queuedAt: z.date(),
  roles: z.array(z.nativeEnum(Role)).optional(),
  rank: z.nativeEnum(Rank).optional()
});

export const queueSchema = z.object({
  guildID: z.string(),
  region: regionEnum,
  inQueue: z.array(queuerSchema)
});

export type Queuer = z.infer<typeof queuerSchema>;
export type Queue = z.infer<typeof queueSchema>;

// todo: fix any here
export const mapToQueuer = (dbQueuer: PrismaQueuer) =>
  queuerSchema.parse({
    userID: dbQueuer.user_id,
    popped: dbQueuer.popped,
    queuedAt: dbQueuer.queued_at
  });
