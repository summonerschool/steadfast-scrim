import {
  AutocompleteInteraction,
  ClientEvents,
  CommandInteraction,
  InteractionReplyOptions,
  Message,
  PermissionResolvable,
  SlashCommandBuilder,
  SlashCommandSubcommandsOnlyBuilder
} from 'discord.js';
import { ApplicationClient } from './lib/client';

export interface SlashCommand {
  command: SlashCommandBuilder | SlashCommandSubcommandsOnlyBuilder;
  execute: (interaction: CommandInteraction) => Promise<InteractionReplyOptions | undefined>;
  autocomplete?: (interaction: AutocompleteInteraction) => void;
  cooldown?: number; // seconds
}
export interface Event {
  name: keyof ClientEvents;
  run: (client: ApplicationClient, ...args: any[]) => void;
}

export interface Command {
  name: string;
  execute: (message: Message, args: Array<string>) => void;
  permissions: Array<PermissionResolvable>;
  aliases: Array<string>;
  cooldown?: number;
}

interface GuildOptions {
  prefix: string;
}
