import dotenv from 'dotenv';
import { SlashCreator, FastifyServer, AWSLambdaServer } from 'slash-create';
import path from 'path';
import CatLoggr from 'cat-loggr/ts';
import HelloCommand from './commands/hello';
import QueueCommand from './commands/queue';
import { initQueueRepository } from './services/repo/queue-repository';
import { PrismaClient } from '@prisma/client';
import { initQueueService } from './services/queue-service';

let dotenvPath = path.join(process.cwd(), '.env');
if (path.parse(process.cwd()).name === 'dist') dotenvPath = path.join(process.cwd(), '..', '.env');

dotenv.config({ path: dotenvPath });

const logger = new CatLoggr().setLevel(process.env.COMMANDS_DEBUG === 'true' ? 'debug' : 'info');
const creator = new SlashCreator({
  applicationID: process.env.DISCORD_APP_ID,
  publicKey: process.env.DISCORD_PUBLIC_KEY,
  token: process.env.DISCORD_BOT_TOKEN,
  serverPort: parseInt(process.env.PORT, 10) || 8020,
  serverHost: '0.0.0.0'
});

creator.on('debug', (message) => logger.log(message));
creator.on('warn', (message) => logger.warn(message));
creator.on('error', (error) => logger.error(error));
creator.on('synced', () => logger.info('Commands synced!'));
creator.on('commandRun', (command, _, ctx) => {
  logger.info(`${ctx.user.username}#${ctx.user.discriminator} (${ctx.user.id}) ran command ${command.commandName}`);
});
creator.on('commandRegister', (command) => logger.info(`Registered command ${command.commandName}`));
creator.on('commandError', (command, error) => logger.error(`Command ${command.commandName}:`, error));

const server = creator.withServer(new FastifyServer()).registerCommands([HelloCommand, QueueCommand]);
server.startServer();

console.log(`Starting server at "localhost:${creator.options.serverPort}/interactions"`);
