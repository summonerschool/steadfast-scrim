import { z } from 'zod';
import { formatErrors } from './helpers/retrieveOptions';

const envSchema = z.object({
  DISCORD_BOT_TOKEN: z.string(),
  DISCORD_APP_ID: z.string(),
  DISCORD_CLIENT_SECRET: z.string(),
  DISCORD_DEVELOPMENT_GUILD_ID: z.string().optional(),
  DISCORD_VOICE_CATEGORY_ID: z.string(),
  DISCORD_COMMAND_CHANNEL_ID: z.string(),
  DISCORD_DISCUSSION_CHANNEL_ID: z.string(),
  CURRENT_SEASON: z.coerce.number(),
  REDIS_URL: z.string()
});

const res = envSchema.safeParse({
  DISCORD_BOT_TOKEN: process.env.DISCORD_BOT_TOKEN,
  DISCORD_APP_ID: process.env.DISCORD_APP_ID,
  DISCORD_CLIENT_SECRET: process.env.DISCORD_CLIENT_SECRET,
  DISCORD_DEVELOPMENT_GUILD_ID: process.env.DISCORD_DEVELOPMENT_GUILD_ID,
  DISCORD_VOICE_CATEGORY_ID: process.env.DISCORD_VOICE_CATEGORY_ID,
  DISCORD_COMMAND_CHANNEL_ID: process.env.DISCORD_COMMAND_CHANNEL_ID,
  DISCORD_DISCUSSION_CHANNEL_ID: process.env.DISCORD_DISCUSSION_CHANNEL_ID,
  CURRENT_SEASON: process.env.CURRENT_SEASON,
  REDIS_URL: process.env.REDIS_URL
});
if (!res.success) {
  throw new Error(`Invalid input❌\n${formatErrors(res.error.format())}`);
}

export const env = res.data;
