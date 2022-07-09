import { CommandOptionType, ComponentType, SlashCommand } from 'slash-create';

enum Roles {
  IRON = 'Iron',
  BRONZE = 'Bronze',
  SILVER = 'Silver',
  GOLD = 'Gold',
  PLATINUM = 'Platinum',
  DIAMOND = 'Diamond',
  MASTER = 'Master',
  GRANDMASTER = 'Grandmaster',
  CHALLENGER = 'Challenger'
}

class SetupCommand extends SlashCommand {
  private user_data = {
    discord_id: null,
    league_ign: null,
    rank: null,
    server: null,
    role: null
  };

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

  async run(ctx) {
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
              options: Object.keys(Roles).map((key) => ({ label: Roles[key], value: key }))
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

    ctx.registerComponent('server', async (selectCtx) => {
      this.user_data.server = selectCtx.values.join(', ');
      await followup.edit(command.followUpMsg());
    });

    ctx.registerComponent('rank', async (selectCtx) => {
      this.user_data.rank = selectCtx.values.join(', ');
      await followup.edit(command.followUpMsg());
    });

    ctx.registerComponent('role', async (selectCtx) => {
      this.user_data.role = selectCtx.values.join(', ');
      const test = command.followUpMsg();
      await followup.edit(test);
    });
  }

  followUpMsg(data = this.user_data) {
    let msg = 'You selected the following: \n';
    if (data.server) {
      msg += '\nServer: ' + data.server;
    }

    if (data.rank) {
      msg += '\nRank: ' + data.rank;
    }

    if (data.role) {
      msg += '\nRole: ' + data.role;
    }

    return msg;
  }
}

export default SetupCommand;
