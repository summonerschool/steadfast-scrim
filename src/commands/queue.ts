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
      const queuer = await queueService.joinQueue(ctx.user.id, queue.id);
      return `@<${queuer.player_id}> has joined the queue`;
    } else if (ctx.subcommands[0] === 'leave') {
      const queuer = await queueService.leaveQueue(ctx.user.id, queue.id);
      return `@<${queuer.player_id}> has left the queue`;
    } else if (ctx.subcommands[0] === 'show') {
      const queuer = await queueService.showUsersInQueue(queue.id);
      console.log(ctx.users);
      const mentions = queuer.map((q) => `<@${q.player_id}>\n`);
      const message: MessageOptions = {
        content: `**In queue**\n${mentions}`,
        allowedMentions: { everyone: false },
        ephemeral: true
      };
      return message;
    } else {
      return 'no such command exists';
    }
  }
}

export default QueueCommand;
