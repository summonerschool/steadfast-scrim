import { SlashCommandBuilder } from 'discord.js';
import type { SlashCommand } from '../types';
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
        .addIntegerOption((opt) =>
          opt
            .setName('division')
            .setRequired(true)
            .setDescription("What's your division, M, GMs and Challengers can pick whatever")
            .addChoices(...[1, 2, 3, 4].map((num) => ({ name: num.toString(), value: num })))
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
    switch (subCmd) {
      case 'show': {
        const user = await userService.getUserProfile(interaction.user.id);
        return {
          embeds: [ProfileEmbed(user)]
        };
      }
      case 'setup': {
        await interaction.deferReply();
        const options = retrieveOptions(interaction.options.data, SetupCommandInputSchema);
        const { ign, rank, main, secondary } = options;
        const division = interaction.options.getInteger('division', true);
        if (main === secondary) {
          return {
            content: 'Your main and secondary roles cannot be the same',
            ephemeral: true
          };
        }

        console.info(`${interaction.user.username}(${ign}) setup with the rank ${rank}`);

        // Only add division elo if rank is below Masters
        const divisionElo = ELO_TRANSLATION[rank] < 3200 ? (4 - division) * 50 : 0;

        const user = await userService.setUserProfile(
          interaction.user.id,
          options,
          ELO_TRANSLATION[rank] + divisionElo // Increase elo by 50 for each division after the first one
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
