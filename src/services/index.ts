import { PrismaClient } from '@prisma/client';
import { initQueueService } from './queue-service';
import { initQueueRepository } from './repo/queue-repository';

// Clients
const prisma = new PrismaClient();
// Repositories
const queueRepo = initQueueRepository(prisma);
// Services
export const queueService = initQueueService(queueRepo);
