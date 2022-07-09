import { SlashCommand, CommandOptionType, ComponentType, TextInputStyle } from 'slash-create';

class SetupCommand extends SlashCommand {
  constructor(creator) {
    super(creator, {
      name: 'setup',
      description: 'First time setup'
    });

    this.filePath = __filename;
  }

  async run(ctx) {
    const data = {
      rank: null,
      server: null,
      role: null
    };

    await ctx.defer();
    await ctx.send('Please fill in all the options below', {
      components: [
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
              options: [
                {
                  label: 'Iron',
                  value: 'IRON'
                },
                {
                  label: 'Bronze',
                  value: 'BRONZE'
                },
                {
                  label: 'Silver',
                  value: 'SILVER'
                },
                {
                  label: 'Gold',
                  value: 'GOLD'
                },
                {
                  label: 'Platinum',
                  value: 'PLATINUM'
                },
                {
                  label: 'Diamond',
                  value: 'DIAMOND'
                },
                {
                  label: 'Master',
                  value: 'MASTER'
                },
                {
                  label: 'Grandmaster',
                  value: 'GRANDMASTER'
                },
                {
                  label: 'Challenger',
                  value: 'CHALLENGER'
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
      data.server = selectCtx.values.join(', ');
      await followup.edit(command.followUpMsg(data));
    });

    ctx.registerComponent('rank', async (selectCtx) => {
      data.rank = selectCtx.values.join(', ');
      await followup.edit(command.followUpMsg(data));
    });

    ctx.registerComponent('role', async (selectCtx) => {
      data.role = selectCtx.values.join(', ');
      const test = command.followUpMsg(data);
      await followup.edit(test);
    });
  }

  followUpMsg(data) {
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
