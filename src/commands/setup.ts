import { Rank } from '@prisma/client';
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
import capitalize from 'capitalize';

const roles = Object.entries(Rank).map(([key, val]) => ({ label: val, value: key }));

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
              options: roles
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
              options: [
                {
                  label: 'Top',
                  value: 'TOP'
                },
                {
                  label: 'Jungle',
                  value: 'JUNGLE'
                },
                {
                  label: 'Mid',
                  value: 'MID'
                },
                {
                  label: 'Bot',
                  value: 'BOT'
                },
                {
                  label: 'Support',
                  value: 'SUPPORT'
                }
              ]
            }
          ]
        }
      ]
    });

    const followup = await ctx.sendFollowUp('Awaiting replies...', {
      ephemeral: true
    });

    ctx.registerComponent('server', async (selectCtx) => {
      // TODO VERIFY VALID USERNAME + SERVER COMBO HERE, FAIL IF NOT
      this.server = selectCtx.values.join(', ');
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
    const rankImage = userService.getUserRankImage(this.rank);

    // setup is complete here, show them the info and confirm button
    await followup.edit('', {
      embeds: [
        {
          title: `Scrim Player Setup - <@${this.discord_id}>`, // TODO: RENDER THIS AS @
          color: 0x000,
          thumbnail: {
            url: `${rankImage}`
          },
          fields: [
            {
              name: `League IGN`,
              value: `${this.ign}`,
              inline: false
            },
            {
              name: `Server`,
              value: `${capitalize(this.server)}`,
              inline: true
            },
            {
              name: `Rank`,
              value: `${capitalize(this.rank)}`,
              inline: true
            },
            {
              name: `Roles`,
              value: `${capitalize.words(this.roles?.join(', '))}`,
              inline: false
            },
            {
              name: `OP.GG`,
              value: `[OP.GG](https://op.gg/summoners/${this.server}/${this.ign})`
            }
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
      await followup.delete();
      // await ctx.editOriginal('');
      // await ctx.delete(followup.id);
    });

    ctx.registerComponentFrom(followup.id, 'cancel_setup', async (selectCtx) => {
      console.log('cancel');
      // await ctx.delete(followup.id);
    });

    // const user = await userService.setUserProfile(this.discord_id, this.ign, this.rank, this.server, this.roles);
  }

  // async followUpMsg(ctx) {
  //   if (this.server && this.rank && this.roles) {
  //   } else {
  //     return 'fail';
  //   }
  // }
}

export default SetupCommand;
