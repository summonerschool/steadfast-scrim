import type { SlashCommandSubcommandGroupBuilder } from 'discord.js';
import { SlashCommandBuilder } from 'discord.js';
import type { SlashCommand } from '../types';
import { queueEmbed as QueueEmbed } from '../components/queue';
import { MatchmakingStatus } from '../services/queue-service';
import { MatchAlreadyCreatedError, NoMatchupPossibleError } from '../errors/errors';
import { Region } from '@prisma/client';
import { queueService, userService } from '..';

const queueCommand = (subGroup: SlashCommandSubcommandGroupBuilder) =>
  subGroup
    .addSubcommand((sub) =>
      sub
        .setName('join')
        .setDescription('Queue up for an in-house game')
        .addBooleanOption((opt) => opt.setName('fill').setDescription('Queue up as fill'))
    )
    .addSubcommand((sub) => sub.setName('leave').setDescription('Leave the in-house queue'))
    .addSubcommand((sub) =>
      sub
        .setName('show')
        .addBooleanOption((opt) => opt.setName('detailed').setDescription('Show a detailed overview of the queue.'))
        .setDescription('Show users currently in queue')
    );

const queue: SlashCommand = {
  command: new SlashCommandBuilder()
    .setName('queue')
    .addSubcommandGroup((subGroup) =>
      queueCommand(subGroup.setName('euw').setDescription('Commands to interact with the queue for Europe West'))
    )
    .addSubcommandGroup((subGroup) =>
      queueCommand(subGroup.setName('euw_high_elo').setDescription('Commands to interact with the high elo queue for Europe West'))
    )
    .addSubcommandGroup((subGroup) =>
      queueCommand(subGroup.setName('na').setDescription('Commands to interact with the queue for North America'))
    )
    .addSubcommandGroup((subGroup) =>
      queueCommand(subGroup.setName('na_high_elo').setDescription('Commands to interact with the high elo queue for North America'))
    )
    .setDescription('A queue for joining in-house games'),
  execute: async (interaction) => {
    // const [commandGroup, command] = ctx.subcommands;
    const subCommandGroup = interaction.options.getSubcommandGroup();
    const subCommand = interaction.options.getSubcommand();
    const guildId = interaction.guildId;
    const userId = interaction.user.id;
    if (!guildId) {
      throw new Error('Could not retrieve discord server id');
    }
    if (!subCommandGroup) {
      throw new Error('Could not determine region');
    }
    const region = Region[subCommandGroup.toUpperCase() as keyof typeof Region];

    try {
      if (subCommand === 'show') {
        const detailed = interaction.options.getBoolean('detailed');
        const users = [...queueService.getQueue(guildId, region).values()];
        return {
          embeds: [QueueEmbed(users, 'show', userId, region, !!detailed)]
        };
      }
      switch (subCommand) {
        case 'join': {
          const isFill = interaction.options.getBoolean('fill');
          const user = await userService.getUserProfile(userId);
          const queuers = queueService.joinQueue(user, guildId, region, !!isFill);
          const status = queueService.attemptMatchCreation(guildId, region);
          if (status === MatchmakingStatus.NOT_ENOUGH_PLAYERS) {
            return {
              embeds: [QueueEmbed(queuers, 'join', interaction.user.id, region)]
            };
          }
          if (MatchmakingStatus.VALID_MATCH) {
            await interaction.deferReply();
            const embed = await queueService.createMatch(guildId, region);
            return { embeds: [embed] };
          }
          break;
        }
        case 'leave': {
          const users = queueService.leaveQueue(userId, guildId, region);
          const embed = QueueEmbed(users, 'leave', userId, region);
          return { embeds: [embed] };
        }
        default:
          return { content: 'no such command exists' };
      }
    } catch (err) {
      if (err instanceof NoMatchupPossibleError || err instanceof MatchAlreadyCreatedError) {
        return { content: err.message };
      } else if (err instanceof Error) {
        return { content: err.message, ephemeral: true };
      } else {
        console.error(err);
      }
    }
  }
};

export default queue;
