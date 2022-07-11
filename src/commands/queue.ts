import { SlashCommand, CommandOptionType, CommandContext, SlashCreator, MessageOptions } from 'slash-create';
import { NotFoundError } from '../errors/errors';
import { queueService, scrimService } from '../services';

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

    switch (ctx.subcommands[0]) {
      case 'join': {
        try {
          const queuer = await queueService.joinQueue(ctx.user.id, queue.id);
          const matchmaking = await queueService.attemptMatchmaking(queuer.queue_id);
          if (!matchmaking.valid) {
            return { content: `<@${queuer.player_id}> has joined the queue`, allowedMentions: { everyone: false } };
          }
          const scrim = await scrimService.createBalancedScrim(
            queuer.queue_id,
            matchmaking.queuers.map((p) => p.player_id)
          );
          return;
        } catch (err) {
          if (err instanceof NotFoundError) {
            return err.message;
          } else {
            console.error(err);
          }
        }
      }
      case 'leave': {
        const queuer = await queueService.leaveQueue(ctx.user.id, queue.id);
        return { content: `<@${queuer.player_id}> has left the queue`, allowedMentions: { everyone: false } };
      }
      case 'show': {
        const queuer = await queueService.showUsersInQueue(queue.id);
        const mentions = queuer.map((q) => `<@${q.player_id}>\n`);
        const message: MessageOptions = {
          content: `**In queue**\n${mentions}`,
          allowedMentions: { everyone: false },
          ephemeral: true
        };
        return message;
      }
      default:
        return 'no such command exists';
    }
  }
}

export default QueueCommand;
