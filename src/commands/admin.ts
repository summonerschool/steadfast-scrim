import type { Role, User } from '@prisma/client';
import { PrismaClient, Rank, Region } from '@prisma/client';
import type { GuildMember } from 'discord.js';
import { SlashCommandBuilder } from 'discord.js';
import { queueService, scrimService, userService } from '..';
import { ProfileEmbed } from '../components/setup-feedback';
import { chance } from '../lib/chance';
import type { SlashCommand } from '../types';

const createTestUser = (role: Role, secondary: Role, name: string, elo: number): User => ({
  id: chance.guid(),
  leagueIGN: name,
  rank: Rank.GOLD,
  region: Region.EUW,
  highElo: false,
  main: role,
  secondary: secondary,
  elo: elo,
  externalElo: elo,
  autofillProtected: false,
  losses: 0,
  wins: 0,
  registeredAt: new Date()
});

const notTwoOfEach: User[] = [
  createTestUser('TOP', 'MID', 'test1', 2100),
  createTestUser('JUNGLE', 'TOP', 'test2', 1400),
  createTestUser('MID', 'JUNGLE', 'test3', 1821),
  createTestUser('MID', 'JUNGLE', 'test5', 2400),
  createTestUser('MID', 'JUNGLE', 'test6', 659),
  createTestUser('BOT', 'SUPPORT', 'test7', 1900),
  createTestUser('BOT', 'SUPPORT', 'test8', 1800),
  createTestUser('SUPPORT', 'BOT', 'test9', 1657),
  createTestUser('SUPPORT', 'BOT', 'test10', 1700)
];
//
const admin: SlashCommand = {
  command: new SlashCommandBuilder()
    .setName('admin')
    .setDescription('A group of admin only commands')
    .addSubcommand((cmd) =>
      cmd
        .setName('update-elo')
        .setDescription('Updates the elo')
        .addMentionableOption((opt) => opt.setName('user').setDescription('User to update elo for').setRequired(true))
        .addIntegerOption((opt) => opt.setName('elo').setDescription('In-house elo (Steadfast Points)'))
        .addIntegerOption((opt) => opt.setName('external_elo').setDescription('League of Legends Elo'))
    )
    .addSubcommand((cmd) =>
      cmd
        .setName('high-elo')
        .setDescription('Adds/removes a user for high elo queue')
        .addMentionableOption((opt) => opt.setName('user').setDescription('User to enable/disable').setRequired(true))
        .addBooleanOption((opt) => opt.setName('allowed').setDescription('Enables/Disables user to highelo queue. Defaults TRUE'))
    )
    .addSubcommand((cmd) => cmd.setName('add-dummy-users').setDescription('creates and adds dummy users'))
    .addSubcommand((cmd) =>
      cmd
        .setName('remove-user')
        .setDescription('Removes a user from a queue')
        .addMentionableOption((opt) => opt.setName('user').setDescription('User to remove').setRequired(true))
    )
    .addSubcommand((cmd) =>
      cmd
        .setName('revert-game')
        .setDescription('Reverts the result of the last game')
        .addIntegerOption((opt) => opt.setName('match_id').setDescription('The game to revert').setRequired(true))
    )
    .setDefaultMemberPermissions(0),
  onlyAdmin: true,
  execute: async (interaction) => {
    const subCommand = interaction.options.getSubcommand();
    switch (subCommand) {
      case 'add-dummy-users': {
        await interaction.deferReply();
        const prisma = new PrismaClient();
        let users = await prisma.user.findMany({
          where: { leagueIGN: { startsWith: 'test' } },
          take: 9
        });
        if (users.length === 0) {
          await prisma.user.createMany({
            data: notTwoOfEach
          });
          users = notTwoOfEach;
        }
        for (const user of users) {
          await queueService.joinQueue(user, interaction.guildId!, user.region, false);
        }
        return { content: `Added ${users.length} to the queue` };
      }
      case 'remove-user': {
        const mentionable = interaction.options.getMentionable('user') as GuildMember | null;
        if (!mentionable) return { content: 'Not a real user ID' };
        const { user } = mentionable;
        queueService.removeUserFromQueue(interaction.guildId!, 'EUW', [user.id]);
        queueService.removeUserFromQueue(interaction.guildId!, 'NA', [user.id]);
        return { content: `<@${user.id}> removed from queue` };
      }
      case 'update-elo': {
        const mentionable = interaction.options.getMentionable('user');
        const elo = interaction.options.getInteger('elo');
        const externalElo = interaction.options.getInteger('external_elo');
        if (!mentionable) return { content: 'Not a real user ID' };
        const member = mentionable as GuildMember;
        const user = await userService.updateElo(member.user.id, elo || undefined, externalElo || undefined);
        const queue = queueService.getQueue(interaction.guildId!, user.region);
        const inQueue = queue.get(user.id);
        if (inQueue) {
          queue.set(user.id, user);
        }

        return { embeds: [ProfileEmbed(user)] };
      }
      case 'high-elo': {
        const mentionable = interaction.options.getMentionable('user');
        const value = interaction.options.getBoolean('allowed') ?? true;
        if (!mentionable) return { content: 'Not a real user ID' };
        const member = mentionable as GuildMember;
        const user = await userService.setHighEloQueue(member.user.id, value);
        return { content: `<@${user.id}> has been approved for high elo queue` };
      }
      case 'revert-game': {
        await interaction.deferReply();
        const id = interaction.options.getInteger('match_id', true);
        const latestMatch = await scrimService.revertGame(id);
        return {
          content: latestMatch
            ? `Match #${id} has been reverted`
            : `Match #${id} is not the latest played game. You can only revert the latest game played`
        };
      }
      default:
        return { content: 'no such command found' };
    }
  }
};

export default admin;
