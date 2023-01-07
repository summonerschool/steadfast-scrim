import { PrismaClient, Rank, Region, Role, User } from '@prisma/client';
import { GuildMember, SlashCommandBuilder } from 'discord.js';
import { queueService, userService } from '..';
import { ProfileEmbed } from '../components/setup-feedback';
import { chance } from '../lib/chance';
import { SlashCommand } from '../types';

const createTestUser = (role: Role, secondary: Role, name: string, elo: number): User => ({
  id: chance.guid(),
  leagueIGN: name,
  rank: Rank.GOLD,
  region: Region.EUW,
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
    .addSubcommand((cmd) => cmd.setName('add-dummy-users').setDescription('creates and adds dummy users'))
    .addSubcommand((cmd) =>
      cmd
        .setName('remove-user')
        .setDescription('Removes a user from a queue')
        .addMentionableOption((opt) => opt.setName('user').setDescription('User to remove').setRequired(true))
    ),
  onlyAdmin: true,
  execute: async (interaction) => {
    const subCommand = interaction.options.getSubcommand();
    if (subCommand === 'add-dummy-users') {
      const prisma = new PrismaClient();
      let users = await prisma.user.findMany({
        where: { leagueIGN: { startsWith: 'test' } }
      });
      console.log(users);
      if (users.length === 0) {
        await prisma.user.createMany({
          data: notTwoOfEach
        });
        users = notTwoOfEach;
      }
      for (const user of users) {
        await queueService.joinQueue(user, interaction.guildId!!, user.region, false);
      }
      console.log(queueService.getQueue(interaction.guildId!!, 'EUW').size);
      return { content: 'added' };
    } else if (subCommand === 'remove-user') {
      const mentionable = interaction.options.getMentionable('user') as GuildMember | null;
      if (!mentionable) return { content: 'Not a real user ID' };
      const { user } = mentionable;
      queueService.removeUserFromQueue(interaction.guildId!!, 'EUW', [user.id]);
      queueService.removeUserFromQueue(interaction.guildId!!, 'NA', [user.id]);
      return { content: `<@${user.id}> removed from queue` };
    } else {
      const mentionable = interaction.options.getMentionable('user');
      const elo = interaction.options.getInteger('elo');
      const externalElo = interaction.options.getInteger('external_elo');
      if (!mentionable) return { content: 'Not a real user ID' };
      const member = mentionable as GuildMember;
      const user = await userService.updateElo(member.user.id, elo || undefined, externalElo || undefined);

      return { embeds: [ProfileEmbed(user)] };
    }
  }
};

export default admin;
