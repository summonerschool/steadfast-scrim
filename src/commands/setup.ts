import { Rank, Role } from '@prisma/client';
import { CommandContext, CommandOptionType, SlashCommand, SlashCreator } from 'slash-create';
import { userService } from '../services';
// @ts-ignore
import { capitalize, ELO_TRANSLATION } from '../utils/utils';
import { ProfileEmbed } from '../components/setup-feedback';

const rank = Object.entries(Rank).map(([key, val]) => ({ name: capitalize(key), value: val }));
const roles = Object.entries(Role).map(([key, val]) => ({
  name: capitalize(key),
  value: val
}));

class SetupCommand extends SlashCommand {
  constructor(creator: SlashCreator) {
    super(creator, {
      name: 'setup',
      description: 'Setup a player profile for the in-house games',
      options: [
        {
          type: CommandOptionType.STRING,
          name: 'ign',
          required: true,
          description: 'Type your league in-game name'
        },
        {
          type: CommandOptionType.STRING,
          name: 'region',
          required: true,
          description: 'What is your league region?',
          choices: [
            { name: 'Europe West', value: 'EUW' }
            // { name: 'North America', value: 'NA' }
          ]
        },
        {
          type: CommandOptionType.STRING,
          name: 'rank',
          required: true,
          description: 'Set a fall-back rank if we cannot determine your rank.',
          choices: rank
        },
        {
          type: CommandOptionType.STRING,
          name: 'main',
          required: true,
          description: 'Pick your main role',
          choices: roles
        },
        {
          type: CommandOptionType.STRING,
          name: 'secondary',
          required: true,
          description: 'Pick your secondary',
          choices: roles
        }
      ]
    });

    this.filePath = __filename;
  }

  async run(ctx: CommandContext) {
    const { ign, rank, region, main, secondary } = ctx.options;

    if (main === secondary) {
      console.log('someone tried to pick the same main and secondary role');
      return { content: 'Main and secondary role needs to be different', ephemeral: true };
    }

    const rankInfo = await userService.fetchMyMMR(region, ign).catch(() => {
      return { rank: rank, elo: ELO_TRANSLATION[rank] };
    });
    const user = await userService.setUserProfile(
      ctx.user.id,
      ign,
      rankInfo.rank,
      region,
      main,
      secondary,
      rankInfo.elo,
      rankInfo.elo
    );
    return {
      embeds: [ProfileEmbed(user)],
      ephemeral: true
    };
  }
}

export default SetupCommand;
