import { SlashCommand, CommandOptionType, CommandContext, SlashCreator, MessageOptions } from 'slash-create';
import { NotFoundError } from '../errors/errors';
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
      try {
        const queuer = await queueService.joinQueue(ctx.user.id, queue.id);
        return { content: `<@${queuer.player_id}> has joined the queue`, allowedMentions: { everyone: false } };
      } catch (err) {
        if (err instanceof NotFoundError) {
          return err.message;
        } else {
          console.error(err);
        }
      }
    } else if (ctx.subcommands[0] === 'leave') {
      const queuer = await queueService.leaveQueue(ctx.user.id, queue.id);
      return { content: `<@${queuer.player_id}> has left the queue`, allowedMentions: { everyone: false } };
    } else if (ctx.subcommands[0] === 'show') {
      const queuer = await queueService.showUsersInQueue(queue.id);
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
