import { RiotAPI, RiotAPITypes } from '@fightmegg/riot-api';
import { PrismaClient } from '@prisma/client';
import { initMatchmakingService } from './matchmaking-service';
import { initQueueService } from './queue-service';
import { initQueueRepository } from './repo/queue-repository';
import { initScrimRepository } from './repo/scrim-repository';
import { initUserRepository } from './repo/user-repository';
import { initScrimService } from './scrim-service';
import { initUserService } from './user-service';

// Clients
const prisma = new PrismaClient();
const config: RiotAPITypes.Config = { debug: true };
const rAPI = new RiotAPI(process.env.RIOT_API_KEY!!, config);
// Repositories
const queueRepo = initQueueRepository(prisma);
const userRepo = initUserRepository(prisma);
const scrimRepo = initScrimRepository(prisma);
// Services
export const userService = initUserService(userRepo, rAPI);
const matchmakingService = initMatchmakingService()
export const scrimService = initScrimService(scrimRepo, userRepo, matchmakingService);
export const queueService = initQueueService(queueRepo, userRepo);
