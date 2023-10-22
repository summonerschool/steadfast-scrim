import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import Redis from 'ioredis';
import { env } from './env';
import { ApplicationClient } from './lib/client';
import { DiscordServiceImpl } from './services/discord-service';
import { MatchDetailServiceImpl } from './services/matchdetail-service';
import { initMatchmakingService } from './services/matchmaking-service';
import { QueueServiceImpl } from './services/queue-service';
import { ScrimServiceImpl } from './services/scrim-service';
import { UserServiceImpl } from './services/user-service';

dotenv.config();

const admins = [
  '183908254210981888', // kharann,
  '164357764020305920' // Tikka
];

export const client = new ApplicationClient(admins);

client.login(env.DISCORD_BOT_TOKEN);

const prisma = new PrismaClient();
export const redis = new Redis(env.REDIS_URL);

// Services
export const userService = new UserServiceImpl(prisma);
const matchmakingService = initMatchmakingService();
export const discordService = new DiscordServiceImpl(client);
export const matchDetailService = new MatchDetailServiceImpl(prisma, redis, discordService);
export const scrimService = new ScrimServiceImpl(prisma, matchmakingService);
export const queueService = new QueueServiceImpl(redis, scrimService, discordService, matchDetailService);
