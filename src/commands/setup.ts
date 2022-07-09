import { Rank, Role } from '@prisma/client';
import { CommandContext, CommandOptionType, ComponentType, SlashCommand } from 'slash-create';
import { userService } from '../services';

const roles = Object.entries(Rank).map(([key, val]) => ({ label: val, value: key }));
console.log(roles);

class SetupCommand extends SlashCommand {
  private rank: string | undefined = undefined;
  private server: string | undefined = undefined;
  private role: string | undefined = undefined;

  constructor(creator) {
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
    console.log(ctx.options.ign);
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

    const followup = await ctx.sendFollowUp('Awaiting replies...');
    const command = this;

    const userID = ctx.user.id;
    const ign = ctx.options.ign;
    ctx.registerComponent('server', async (selectCtx) => {
      this.server = selectCtx.values.join(', ');
      await followup.edit(await command.followUpMsg(userID, ign));
    });

    ctx.registerComponent('rank', async (selectCtx) => {
      this.rank = selectCtx.values.join(', ');
      await followup.edit(await command.followUpMsg(userID, ign));
    });

    ctx.registerComponent('role', async (selectCtx) => {
      this.role = selectCtx.values.join(', ');
      const test = await command.followUpMsg(userID, ign);
      await followup.edit(test);
    });
  }

  async followUpMsg(discordID: string, leagueIGN: string) {
    let msg = 'You selected the following: \n';
    if (this.server) {
      msg += '\nServer: ' + this.server;
    }

    if (this.rank) {
      msg += '\nRank: ' + this.rank;
    }

    if (this.role) {
      msg += '\nRole: ' + this.role;
    }
    if (this.server && this.rank && this.role) {
      console.log('HELLO WORLD');
      await userService.registerUser(discordID, leagueIGN, this.rank, this.server, this.role);
    }
    return msg;
  }
}

export default SetupCommand;
