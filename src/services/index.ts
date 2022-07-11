import { PrismaClient } from '@prisma/client';
import { initQueueService } from './queue-service';
import { initQueueRepository } from './repo/queue-repository';
import { initScrimRepository } from './repo/scrim-repository';
import { initUserRepository } from './repo/user-repository';
import { initScrimService } from './scrim-service';
import { initUserService } from './user-service';

// Clients
const prisma = new PrismaClient();
// Repositories
const queueRepo = initQueueRepository(prisma);
const userRepo = initUserRepository(prisma);
const scrimRepo = initScrimRepository(prisma);
// Services
export const userService = initUserService(userRepo);
export const scrimService = initScrimService(scrimRepo, userRepo);
export const queueService = initQueueService(queueRepo, userRepo);
