import { PrismaClient } from '@prisma/client';
import { initMatchmakingService } from './matchmaking-service';
import { initQueueService } from './queue-service';
import { initScrimRepository } from './repo/scrim-repository';
import { initUserRepository } from './repo/user-repository';
import { initScrimService } from './scrim-service';
import { initUserService } from './user-service';
import Discord, { GatewayIntentBits } from 'discord.js';
import { initDiscordService } from './discord-service';

const client = new Discord.Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.DirectMessages]
});

client.login(process.env.DISCORD_BOT_TOKEN).then(() => {});

// Clients
const prisma = new PrismaClient();
// Repositories
const userRepo = initUserRepository(prisma);
const scrimRepo = initScrimRepository(prisma);
// Services
export const userService = initUserService(userRepo);
const matchmakingService = initMatchmakingService();
export const discordService = initDiscordService(client);
export const scrimService = initScrimService(scrimRepo, userRepo, matchmakingService, discordService);
export const queueService = initQueueService(userRepo);
