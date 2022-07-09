import { SlashCommand, CommandOptionType, CommandContext } from 'slash-create';
import { queueService } from '../services';

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
  async run(ctx: CommandContext) {
    // returns the subcommand, option, and option value
    const queue = await queueService.getOrCreateQueueToGuild(ctx.guildID);
    if (ctx.subcommands[0] === 'join') {
      const count = await queueService.joinQueue(ctx.user.id, queue.id);
      return `A player joined. ${count} players currently in queue`;
    } else if (ctx.subcommands[0] === 'leave') {
      const count = await queueService.leaveQueue(ctx.user.id, queue.id);
      return `A player left. ${count} players currently in queue`;
    }
    return 'No such subcommand';
  }
}

export default QueueCommand;
