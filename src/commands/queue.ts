import {
  SlashCommand,
  CommandOptionType,
  CommandContext,
  SlashCreator,
} from 'slash-create';
import { queueService, scrimService, userService } from '../services';
import { queueEmbed } from '../components/queue';
import { NoMatchupPossibleError } from '../errors/errors';
import { User } from '../entities/user';
import { MatchmakingStatus } from '../services/queue-service';

const startMatchmaking = async (users: User[], guildID: string) => {
  const { scrim, lobbyDetails } = await scrimService.createBalancedScrim(guildID, users[0].region, users);
  const matchEmbed = await scrimService.sendMatchDetails(scrim, users, lobbyDetails);
  return { embeds: [matchEmbed] };
};

class QueueCommand extends SlashCommand {
  constructor(creator: SlashCreator) {
    super(creator, {
      name: 'queue',
      description: 'A queue for joining in-house games',
      options: [
        {
          type: CommandOptionType.SUB_COMMAND,
          name: 'join',
          description: 'Join a queue for an inhouse-game'
        },
        {
          type: CommandOptionType.SUB_COMMAND,
          name: 'leave',
          description: 'Leave the queue',
        },
        {
          type: CommandOptionType.SUB_COMMAND,
          name: 'show',
          description: 'Show users currently in queue',
          options: [
            {
              type: CommandOptionType.BOOLEAN,
              name: "detailed",
              description: "Show a detailed list of the current queue",
              required: false,
            }
          ]
        }
      ]
    });
    this.filePath = __filename;
  }
  async run(ctx: CommandContext) {
    // returns the subcommand, option, and option value
    // TODO: Get queue by the user's server and guild in the future

    const guildID = ctx.guildID!!;
    try {
      switch (ctx.subcommands[0]) {
        case 'join': {
          const queuers = await queueService.joinQueue(ctx.user.id, guildID);
          // TODO: Move this logic to service
          const status = queueService.attemptMatchCreation(guildID);
          if (MatchmakingStatus.NOT_ENOUGH_PLAYERS) {
              const embed = queueEmbed(queuers, 'join', ctx.user.id);
              return { embeds: [embed as any], allowedMentions: { everyone: false } };
          }
          const users = await userService.getUsers(queuers.map(u => u.id))
          queueService.resetQueue(guildID)
          return startMatchmaking(users, guildID)
        }
        case 'leave': {
          const users = queueService.leaveQueue(ctx.user.id, guildID);
          const embed = queueEmbed(users, 'leave', ctx.user.id);
          return { embeds: [embed as any], allowedMentions: { everyone: false } };
        }
        case 'show': {
          const users = [...queueService.getQueue(guildID).values()];
          const embed = queueEmbed(users, 'show', ctx.user.id, ctx.options.show["detailed"]);
          return {
            embeds: [embed as any],
            allowedMentions: { everyone: false }
          };
        }
        default:
          return 'no such command exists';
      }
    } catch (err) {
      if (err instanceof NoMatchupPossibleError) {
        return { content: err.message };
      } else if (err instanceof Error) {
        return { content: err.message, ephemeral: true };
      } else {
        console.error(err);
      }
    }
  }
}

export default QueueCommand;
