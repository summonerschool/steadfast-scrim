import { APIInteractionDataResolvedGuildMember, GuildMember, SlashCommandBuilder, User } from 'discord.js';
import { ProfileEmbed } from '../components/setup-feedback';
import { userService } from '../services';
import { SlashCommand } from '../types';

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
    ),
  onlyAdmin: true,
  execute: async (interaction) => {
    const mentionable = interaction.options.getMentionable('user');
    const elo = interaction.options.getInteger('elo');
    const externalElo = interaction.options.getInteger('external_elo');
    if (!mentionable) return { content: 'Not a real user ID' };
    const member = mentionable as GuildMember;
    const user = await userService.updateElo(member.user.id, elo || undefined, externalElo || undefined);

    return { embeds: [ProfileEmbed(user)] };
  }
};

export default admin;
