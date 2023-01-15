import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import { env } from './env';
import { ApplicationClient } from './lib/client';
import { initDiscordService } from './services/discord-service';
import { initMatchmakingService } from './services/matchmaking-service';
import { initQueueService } from './services/queue-service';
import { initScrimService } from './services/scrim-service';
import { initUserService } from './services/user-service';

dotenv.config();

const admins = [
  '183908254210981888', // kharann,
  '164357764020305920' // Tikka
];

export const client = new ApplicationClient(admins);

client.login(env.DISCORD_BOT_TOKEN);

const prisma = new PrismaClient();

// Services
export const userService = initUserService(prisma);
const matchmakingService = initMatchmakingService();
export const discordService = initDiscordService(client);
export const scrimService = initScrimService(prisma, matchmakingService, discordService);
export const queueService = initQueueService(scrimService, discordService);
