import { SlashCommand, CommandOptionType } from 'slash-create';

class QueueCommand extends SlashCommand {
  constructor(creator) {
    super(creator, {
      name: 'queue',
      description: 'Queue',
      options: [
        {
          type: CommandOptionType.SUB_COMMAND,
          name: 'join',
          description: 'Here is the first sub command'
        },
        {
          type: CommandOptionType.SUB_COMMAND,
          name: 'leave',
          description: 'Leave the thingie'
        }
      ]
    });
    this.filePath = __filename;
  }
  async run(ctx) {
    // returns the subcommand, option, and option value
    return 'Go and touch grass you loser';
  }
}

export default QueueCommand;
