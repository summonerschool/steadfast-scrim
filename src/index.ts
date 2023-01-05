import dotenv from 'dotenv';
import { ApplicationClient } from './lib/client';

dotenv.config();

const admins = [
  '183908254210981888', // kharann,
  '164357764020305920' // Tikka
];

const client = new ApplicationClient(admins);

client.login(process.env.DISCORD_BOT_TOKEN);
