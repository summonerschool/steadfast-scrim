import { MessageEmbed } from 'discord.js';
import { SlashCommand, CommandOptionType, CommandContext, SlashCreator, MessageOptions } from 'slash-create';
import { NotFoundError } from '../errors/errors';
import { queueService, scrimService } from '../services';
import { matchMessage } from '../messages/match';
import { initScrimService } from '../services/scrim-service';

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
    // TODO: Get queue by the user's server and guild in the future
    const queue = await queueService.getOrCreateQueueToGuild(ctx.guildID!!);

    switch (ctx.subcommands[0]) {
      case 'join': {
        try {
          const queuer = await queueService.joinQueue(ctx.user.id, queue.id);
          const matchmaking = await queueService.attemptMatchmaking(queue.id);
          console.log(matchmaking);
          if (!matchmaking.valid) {
            return { content: `<@${queuer.userID}> has joined the queue`, allowedMentions: { everyone: false } };
          }
          const scrim = await scrimService.createBalancedScrim(
            queue.id,
            matchmaking.queuers.map((p) => p.userID)
          );
          const embed = await matchMessage(scrim);
          return { embeds: [embed] };
        } catch (err) {
          if (err instanceof NotFoundError) {
            return err.message;
          } else {
            console.error(err);
          }
        }
        break;
      }
      case 'leave': {
        const queuer = await queueService.leaveQueue(ctx.user.id, queue.id);
        return { content: `<@${queuer.userID}> has left the queue`, allowedMentions: { everyone: false } };
      }
      case 'show': {
        const queueWithUsers = await queueService.fetchQueuers(queue);
        const mentions = queueWithUsers.inQueue.map((q) => `<@${q.userID}>`).join('\n');
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
