import dotenv from 'dotenv';
import { ApplicationClient } from './lib/client';

dotenv.config();

const client = new ApplicationClient();
client.migrate();

client.login(process.env.DISCORD_BOT_TOKEN);
