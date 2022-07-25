import { PrismaClient } from '@prisma/client';
import { initMatchmakingService } from './matchmaking-service';
import { initQueueService } from './queue-service';
import { initScrimRepository } from './repo/scrim-repository';
import { initUserRepository } from './repo/user-repository';
import { initScrimService } from './scrim-service';
import { initUserService } from './user-service';

// Clients
const prisma = new PrismaClient();
// Repositories
export const userRepo = initUserRepository(prisma);
const scrimRepo = initScrimRepository(prisma);
// Services
export const userService = initUserService(userRepo);
const matchmakingService = initMatchmakingService();
export const scrimService = initScrimService(scrimRepo, userRepo, matchmakingService);
export const queueService = initQueueService(userRepo);
