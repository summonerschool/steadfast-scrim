import { Rank, Role } from '@prisma/client';
import {
  ButtonStyle,
  CommandContext,
  CommandOptionType,
  ComponentContext,
  ComponentType,
  Message,
  SlashCommand,
  SlashCreator
} from 'slash-create';
import { userService } from '../services';
// @ts-ignore
import { capitalize, ELO_TRANSLATION, POSITION_EMOJI_TRANSLATION } from '../utils/utils';
import { SetupFeedbackEmbed } from '../components/setup-feedback';
import { regionEnum } from '../entities/user';

const rank = Object.entries(Rank).map(([key, val]) => ({ name: capitalize(key), value: val }));
const roles = Object.entries(Role).map(([key, val]) => ({
  name: capitalize(key),
  value: val
}));

class SetupCommand extends SlashCommand {
  private rank: string | undefined = undefined;
  private server: string | undefined = undefined;
  private ign: string = '';
  private discord_id: string = '';
  private roles: string[] | undefined = undefined;

  constructor(creator: SlashCreator) {
    super(creator, {
      name: 'setup',
      description: 'Setup a player profile for in-house games',
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
            { name: 'Europe West', value: 'EUW' },
            { name: 'North America', value: 'NA' }
          ]
        },
        {
          type: CommandOptionType.STRING,
          name: 'rank',
          required: true,
          description: 'What is your current rank on your main?',
          choices: rank
        },
        {
          type: CommandOptionType.STRING,
          name: 'main',
          required: true,
          description: 'Choose the role you main',
          choices: roles
        },
        {
          type: CommandOptionType.STRING,
          name: 'secondary',
          required: true,
          description: 'Choose your secondary role',
          choices: roles
        }
      ]
    });

    this.filePath = __filename;
  }

  async run(ctx: CommandContext) {
    const { ign, rank, region, main, secondary } = ctx.options;

    console.info(rank);
    const rankInfo = await userService.fetchMyMMR(region, ign).catch(() => {
      return userService.fetchExternalUserMMR(regionEnum.parse(region), ign);
    });
    console.info('external rank is ' + rankInfo.rank);
    const user = await userService.setUserProfile(
      ctx.user.id,
      ign,
      rank,
      region,
      main,
      secondary,
      ELO_TRANSLATION[rank],
      rankInfo.elo
    );
    return {
      embeds: [SetupFeedbackEmbed(user)],
      ephemeral: true
    };
    // this.discord_id = ctx.user.id;
    // this.ign = ctx.options.ign;

    // await ctx.defer(true);
    // await ctx.send('Please fill in all the options below', {
    //   ephemeral: true,
    //   components: [
    //     // { TODO: THIS IS BUGGED CURRENTLY, WONT LET ME ADD A TEXT INPUT DIRECT
    //     //   type: ComponentType.ACTION_ROW,
    //     //   components: [
    //     //     {
    //     //       type: ComponentType.TEXT_INPUT,
    //     //       custom_id: 'link',
    //     //       label: 'Choose a server',
    //     //       style: TextInputStyle.SHORT
    //     //     }
    //     //   ]
    //     // },
    //     {
    //       type: ComponentType.ACTION_ROW,
    //       components: [
    //         {
    //           type: ComponentType.SELECT,
    //           custom_id: 'server',
    //           placeholder: 'Choose a server',
    //           min_values: 1,
    //           max_values: 1,
    //           options: [
    //             {
    //               label: 'EUW',
    //               value: 'EUW',
    //               description: 'Europe West'
    //             },
    //             {
    //               label: 'NA',
    //               value: 'NA',
    //               description: 'North America'
    //             }
    //           ]
    //         }
    //       ]
    //     },
    //     {
    //       type: ComponentType.ACTION_ROW,
    //       components: [
    //         {
    //           type: ComponentType.SELECT,
    //           custom_id: 'rank',
    //           placeholder: 'Choose your rank',
    //           min_values: 1,
    //           max_values: 1,
    //           options: rank
    //         }
    //       ]
    //     },
    //     {
    //       type: ComponentType.ACTION_ROW,
    //       components: [
    //         {
    //           type: ComponentType.SELECT,
    //           custom_id: 'role',
    //           placeholder: 'Choose your roles',
    //           min_values: 1,
    //           max_values: 5,
    //           options: roles
    //         }
    //       ]
    //     }
    //   ]
    // });

    // const followup = await ctx.sendFollowUp('Awaiting replies...', {
    //   ephemeral: true
    // });

    // ctx.registerComponent('server', async (selectCtx) => {
    //   this.server = selectCtx.values.join(', ');
    //   await userService.fetchRiotUser(SERVER_TO_RIOT_PLATFORM[this.server], this.ign).catch(() => {
    //     followup.edit(':x: **League user not found, please check correct server or try /setup command again.**');
    //     return;
    //   });
    //   await followup.edit(':white_check_mark:   **League username found, awaiting replies...**');
    //   await this.submitSetup(followup, selectCtx);
    // });

    // ctx.registerComponent('rank', async (selectCtx) => {
    //   this.rank = selectCtx.values.join(', ');
    //   await this.submitSetup(followup, selectCtx);
    // });

    // ctx.registerComponent('role', async (selectCtx) => {
    //   this.roles = selectCtx.values;
    //   await this.submitSetup(followup, selectCtx);
    // });
  }

  async submitSetup(followup: Message, ctx: ComponentContext) {
    if (!(this.server && this.rank && this.roles && this.ign)) {
      return;
    }

    // Format text for the embed
    const rankInfo = await userService.fetchMyMMR(this.server, this.ign).catch(() => {
      return userService.fetchExternalUserMMR(regionEnum.parse(this.server), this.ign);
    });

    // const roles_to_image = this.roles.map((x) => {
    //   // return `![${x}](${POSITION_IMAGE_TRANSLATION[x]})`;
    //   return `${POSITION_EMOJI_TRANSLATION[x]}`;
    // });

    // setup is complete here, show them the info and confirm button
    await followup.edit('', {
      embeds: [],
      components: [
        {
          type: ComponentType.ACTION_ROW,
          components: [
            {
              type: ComponentType.BUTTON,
              label: `Confirm`,
              custom_id: 'confirm_setup',
              style: ButtonStyle.PRIMARY
            },
            {
              type: ComponentType.BUTTON,
              label: `Cancel`,
              custom_id: 'cancel_setup',
              style: ButtonStyle.DESTRUCTIVE
            }
          ]
        }
      ]
    });

    ctx.registerComponentFrom(followup.id, 'confirm_setup', async () => {
      if (!(this.server && this.rank && this.roles && this.ign)) {
        return;
      }

      try {
        await userService.setUserProfile(
          this.discord_id,
          this.ign,
          this.rank,
          this.server,
          this.roles[0],
          this.roles[1],
          ELO_TRANSLATION[this.rank],
          ELO_TRANSLATION[this.rank]
        );
      } catch (e) {
        console.log(e);
        await followup.edit(':x: An error occurred, please try to run setup again.', {
          embeds: [],
          components: []
        });
        await ctx.editOriginal('** **', {
          embeds: [],
          components: []
        });
        return;
      }

      await followup.edit(':white_check_mark: Successfully registered', {
        embeds: [],
        components: []
      });

      await ctx.editOriginal('** **', {
        embeds: [],
        components: []
      });
    });

    ctx.registerComponentFrom(followup.id, 'cancel_setup', async () => {
      await followup.edit(':x: Cancelled by the user, please run /setup again.', {
        embeds: [],
        components: []
      });
      await ctx.editOriginal('** **', {
        embeds: [],
        components: []
      });
    });
  }
}

export default SetupCommand;
