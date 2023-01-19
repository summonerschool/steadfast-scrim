import { SlashCommandBuilder } from 'discord.js';
import { SlashCommand } from '../types';
import { ProfileEmbed } from '../components/setup-feedback';
import { Rank, Role } from '@prisma/client';
import { capitalize, ELO_TRANSLATION } from '../utils/utils';
import { retrieveOptions } from '../helpers/retrieveOptions';
import { SetupCommandInputSchema } from '../schemas/user';
import { userService } from '..';

const rank = Object.entries(Rank).map(([key, val]) => ({ name: capitalize(key), value: val }));
const roles = Object.entries(Role).map(([key, val]) => ({
  name: capitalize(key),
  value: val
}));

const profile: SlashCommand = {
  command: new SlashCommandBuilder()
    .setName('profile')
    .setDescription('Inhouse Profile')
    .addSubcommand((cmd) => cmd.setName('show').setDescription('Show your own profile'))
    .addSubcommand((cmd) =>
      cmd
        .setName('setup')
        .setDescription('Setup a scrim profile')
        .addStringOption((opt) =>
          opt.setName('ign').setRequired(true).setDescription('Type your league of legends name')
        )
        .addStringOption((opt) =>
          opt
            .setName('region')
            .setRequired(true)
            .setDescription('What is your league region?')
            .setChoices({ name: 'Europe West', value: 'EUW' }, { name: 'North America', value: 'NA' })
        )
        .addStringOption((opt) =>
          opt
            .setName('rank')
            .setRequired(true)
            .setDescription("What's your approxmitely league rank if we cannot determine your rank?")
            .addChoices(...rank)
        )
        .addStringOption((opt) =>
          opt
            .setName('main')
            .setRequired(true)
            .setDescription('Pick your main role')
            .addChoices(...roles)
        )
        .addStringOption((opt) =>
          opt
            .setName('secondary')
            .setRequired(true)
            .setDescription('Pick your secondary role')
            .addChoices(...roles)
        )
    ),
  execute: async (interaction) => {
    const subCmd = interaction.options.getSubcommand();
    await interaction.deferReply();
    switch (subCmd) {
      case 'show': {
        const user = await userService.getUserProfile(interaction.user.id);
        return {
          embeds: [ProfileEmbed(user)]
        };
      }
      case 'setup': {
        const options = retrieveOptions(interaction.options.data, SetupCommandInputSchema);
        const { ign, region, rank, main, secondary } = options;
        if (main === secondary) {
          return {
            content: 'Your main and secondary roles cannot be the same',
            ephemeral: true
          };
        }

        console.info(`${interaction.user.username}(${ign}) setup with the rank ${rank}`);

        const rankInfo = await userService.fetchMyMMR(region, ign).catch(() => {
          return { rank: rank, elo: ELO_TRANSLATION[rank] };
        });
        const user = await userService.setUserProfile(
          interaction.user.id,
          options,
          rankInfo.elo
          // rankInfo.elo
        );
        return {
          embeds: [ProfileEmbed(user)]
        };
      }
      default:
        return { content: 'This command does not exist' };
    }
  }
};

export default profile;
