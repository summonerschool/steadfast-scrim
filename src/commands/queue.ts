import { SlashCommand, CommandOptionType, CommandContext, SlashCreator, MessageOptions } from 'slash-create';
import { queueService } from '../services';

class QueueCommand extends SlashCommand {
  constructor(creator: SlashCreator) {
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
        },
        {
          type: CommandOptionType.SUB_COMMAND,
          name: 'show',
          description: 'Show queue'
        }
      ]
    });
    this.filePath = __filename;
  }
  async run(ctx: CommandContext) {
    // returns the subcommand, option, and option value
    const queue = await queueService.getOrCreateQueueToGuild(ctx.guildID!!);
    if (ctx.subcommands[0] === 'join') {
      const count = await queueService.joinQueue(ctx.user.id, queue.id);
      return `A player joined. ${count} players currently in queue`;
    } else if (ctx.subcommands[0] === 'leave') {
      const count = await queueService.leaveQueue(ctx.user.id, queue.id);
      return `A player left. ${count} players currently in queue`;
    } else if (ctx.subcommands[0] === 'show') {
      const queued = await queueService.showQueuedUsers(queue.id);
      console.log(ctx.users);
      const mentions = queued.map((q) => `<@${q.player_id}>`);
      const message: MessageOptions = {
        content: `${mentions} are in queue`,
        allowedMentions: { everyone: false }
      };
      return message;
    } else {
      return 'no such command exists';
    }
  }
}

export default QueueCommand;
