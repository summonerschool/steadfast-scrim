import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import Redis from 'ioredis';
import { env } from './env';
import { ApplicationClient } from './lib/client';
import { initDiscordService } from './services/discord-service';
import { MatchDetailServiceImpl } from './services/matchdetail-service';
import { initMatchmakingService } from './services/matchmaking-service';
import { initQueueService } from './services/queue-service';
import { initScrimService } from './services/scrim-service';
import { UserServiceImpl } from './services/user-service';

dotenv.config();

const admins = [
  '183908254210981888', // kharann,
  '164357764020305920', // Tikka
  '121980910059913216' // ricardo
];

export const client = new ApplicationClient(admins);

client.login(env.DISCORD_BOT_TOKEN);

const prisma = new PrismaClient();
export const redis = new Redis(env.REDIS_URL);

// Services
export const userService = new UserServiceImpl(prisma);
const matchmakingService = initMatchmakingService();
export const discordService = initDiscordService(client);
export const matchDetailService = new MatchDetailServiceImpl(prisma, redis, discordService);
export const scrimService = initScrimService(prisma, matchmakingService);
export const queueService = initQueueService(scrimService, discordService, matchDetailService);
