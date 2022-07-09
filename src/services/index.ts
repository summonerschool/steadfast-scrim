import { PrismaClient } from '@prisma/client';
import { initQueueService } from './queue-service';
import { initQueueRepository } from './repo/queue-repository';
import { initUserRepository } from './repo/user-repository';
import { initUserService } from './user-service';

// Clients
const prisma = new PrismaClient();
// Repositories
const queueRepo = initQueueRepository(prisma);
const userRepo = initUserRepository(prisma);
// Services
export const queueService = initQueueService(queueRepo);
export const userService = initUserService(userRepo);
