import { SlashCommand, CommandOptionType, CommandContext, SlashCreator } from 'slash-create';
import { discordService, queueService, scrimService } from '../services';
import { queueEmbed } from '../components/queue';
import { chance } from '../lib/chance';

class QueueCommand extends SlashCommand {
  constructor(creator: SlashCreator) {
    super(creator, {
      name: 'queue',
      description: 'A queue for joining in-house games',
      options: [
        {
          type: CommandOptionType.SUB_COMMAND,
          name: 'join',
          description: 'Join a queue'
        },
        {
          type: CommandOptionType.SUB_COMMAND,
          name: 'leave',
          description: 'Leave the queue'
        },
        {
          type: CommandOptionType.SUB_COMMAND,
          name: 'show',
          description: 'Show users currently in queue'
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
          const users = await queueService.joinQueue(ctx.user.id, guildID);
          const matchmaking = queueService.canCreateMatch(guildID);
          if (!matchmaking.valid) {
            const embed = queueEmbed(users, 'join', ctx.user.id);
            return { embeds: [embed as any], allowedMentions: { everyone: false } };
          }

          const { scrim, lobbyDetails } = await scrimService.createBalancedScrim(
            guildID,
            users[0].region,
            matchmaking.users
          );
          const details = await scrimService.retrieveMatchDetails(scrim, users, lobbyDetails.teamNames);
          const players = scrim.players.filter((p) => !p.userID.includes('-'));

          const blueIDs = players.filter((p) => p.side === 'BLUE').map((p) => p.userID);
          const redIDs = players.filter((p) => p.side === 'RED').map((p) => p.userID);

          const directMsg = await Promise.all([
            discordService.sendMatchDirectMessage(blueIDs, {
              embeds: [details.MATCH, details.BLUE],
              content: lobbyDetails.voiceInvite[0]
            }),
            discordService.sendMatchDirectMessage(redIDs, {
              embeds: [details.MATCH, details.RED],
              content: lobbyDetails.voiceInvite[1]
            })
          ]);
          console.log(`${directMsg[0] + directMsg[1]} DMs have been sent`);
          return { embeds: [details.MATCH.addFields({ name: 'Draft', value: 'Spectate Draft' })] };
        }
        case 'leave': {
          const users = queueService.leaveQueue(ctx.user.id, guildID);
          const embed = queueEmbed(users, 'leave', ctx.user.id);
          return { embeds: [embed as any], allowedMentions: { everyone: false } };
        }
        case 'show': {
          const users = queueService.getUsersInQueue(guildID);
          const embed = queueEmbed(users, 'show', ctx.user.id);
          return {
            embeds: [embed as any],
            allowedMentions: { everyone: false }
          };
        }
        default:
          return 'no such command exists';
      }
    } catch (err) {
      if (err instanceof Error) {
        return { content: err.message, ephemeral: true };
      } else {
        console.error(err);
      }
    }
  }
}

export default QueueCommand;
