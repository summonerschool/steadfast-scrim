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
import capitalize from 'capitalize';
import { POSITION_EMOJI_TRANSLATION, RANK_IMAGE_TRANSLATION, SERVER_TO_RIOT_PLATFORM } from '../utils/utils'; // TODO: fix

const rank = Object.entries(Rank).map(([key, val]) => ({ label: val, value: key }));
const roles = Object.entries(Role).map(([key, val]) => ({ label: capitalize(val), value: key }));

class SetupCommand extends SlashCommand {
  private rank: string | undefined = undefined;
  private server: string | undefined = undefined;
  private ign: string = '';
  private discord_id: string = '';
  private roles: string[] | undefined = undefined;

  constructor(creator: SlashCreator) {
    super(creator, {
      name: 'setup',
      description: 'First time setup',
      options: [
        {
          type: CommandOptionType.STRING,
          name: 'ign',
          required: true,
          description: 'Type your league in-game name'
        }
      ]
    });

    this.filePath = __filename;
  }

  async run(ctx: CommandContext) {
    this.discord_id = ctx.user.id;
    this.ign = ctx.options.ign;

    await ctx.defer(true);

    await ctx.send('Please fill in all the options below', {
      ephemeral: true,
      components: [
        // { TODO: THIS IS BUGGED CURRENTLY, WONT LET ME ADD A TEXT INPUT DIRECT
        //   type: ComponentType.ACTION_ROW,
        //   components: [
        //     {
        //       type: ComponentType.TEXT_INPUT,
        //       custom_id: 'link',
        //       label: 'Choose a server',
        //       style: TextInputStyle.SHORT
        //     }
        //   ]
        // },
        {
          type: ComponentType.ACTION_ROW,
          components: [
            {
              type: ComponentType.SELECT,
              custom_id: 'server',
              placeholder: 'Choose a server',
              min_values: 1,
              max_values: 1,
              options: [
                {
                  label: 'EUW',
                  value: 'EUW',
                  description: 'Europe West'
                },
                {
                  label: 'NA',
                  value: 'NA',
                  description: 'North America'
                }
              ]
            }
          ]
        },
        {
          type: ComponentType.ACTION_ROW,
          components: [
            {
              type: ComponentType.SELECT,
              custom_id: 'rank',
              placeholder: 'Choose your rank',
              min_values: 1,
              max_values: 1,
              options: rank
            }
          ]
        },
        {
          type: ComponentType.ACTION_ROW,
          components: [
            {
              type: ComponentType.SELECT,
              custom_id: 'role',
              placeholder: 'Choose your roles',
              min_values: 1,
              max_values: 5,
              options: roles
            }
          ]
        }
      ]
    });

    const followup = await ctx.sendFollowUp('Awaiting replies...', {
      ephemeral: true
    });

    ctx.registerComponent('server', async (selectCtx) => {
      this.server = selectCtx.values.join(', ');
      await userService.fetchRiotUser(SERVER_TO_RIOT_PLATFORM[this.server], this.ign).catch(() => {
        followup.edit(':x: **League user not found, please check correct server or try /setup command again.**');
        return;
      });
      await followup.edit(':white_check_mark:   **League username found, awaiting replies...**');
      await this.submitSetup(followup, selectCtx);
    });

    ctx.registerComponent('rank', async (selectCtx) => {
      this.rank = selectCtx.values.join(', ');
      await this.submitSetup(followup, selectCtx);
    });

    ctx.registerComponent('role', async (selectCtx) => {
      this.roles = selectCtx.values;
      await this.submitSetup(followup, selectCtx);
    });
  }

  async submitSetup(followup: Message, ctx: ComponentContext) {
    if (!(this.server && this.rank && this.roles && this.ign)) {
      return;
    }

    // Format text for the embed
    const rankInfo = await userService.fetchMyMMR(this.server, this.ign).catch(async () => {
      return await userService.fetchRiotRank(SERVER_TO_RIOT_PLATFORM[this.server || 'EUW'], this.ign);
    });

    const roles_to_image = this.roles.map((x) => {
      // return `![${x}](${POSITION_IMAGE_TRANSLATION[x]})`;
      return `${POSITION_EMOJI_TRANSLATION[x]}`;
    });

    // setup is complete here, show them the info and confirm button
    await followup.edit('', {
      embeds: [
        {
          title: `Scrim Player Setup`,
          description: `<@${this.discord_id}>`,
          color: 0x000,
          thumbnail: {
            url: `${RANK_IMAGE_TRANSLATION[this.rank]}`
          },
          fields: [
            {
              name: `League IGN`,
              value: `${this.ign}`,
              inline: false
            },
            {
              name: `Server`,
              value: `${this.server}`,
              inline: true
            },
            {
              name: `Rank`,
              value: `${capitalize(this.rank)}`,
              inline: true
            },
            {
              name: `Roles`,
              value: `${roles_to_image.join(', ')}`,
              inline: true
            },
            {
              name: `Estimated Elo`,
              value: `${rankInfo.elo}`,
              inline: true
            }
            // {
            //   name: `OP.GG`,
            //   value: `[OP.GG](https://op.gg/summoners/${this.server}/${encodeURI(this.ign)})`,
            //   inline: true
            // }
          ]
        }
      ],
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

    ctx.registerComponentFrom(followup.id, 'confirm_setup', async (selectCtx) => {
      console.log('confirm');
      if (!(this.server && this.rank && this.roles && this.ign)) {
        return;
      }
      const user = await userService.setUserProfile(this.discord_id, this.ign, this.rank, this.server, this.roles);
      await followup.delete();

      // TODO : DELETE THE EPHEMERAL AND SEND THE EMBED AS A MESSSAGE SO EVERYONE CAN SEE NEW PLAYERS?
      // await ctx.editOriginal('');
      // await ctx.delete(followup.id);
    });

    ctx.registerComponentFrom(followup.id, 'cancel_setup', async (selectCtx) => {
      console.log('cancel');
      // await ctx.delete(followup.id);
    });
  }
}

export default SetupCommand;
