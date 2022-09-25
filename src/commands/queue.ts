import { SlashCommand, CommandOptionType, CommandContext, SlashCreator, ApplicationCommandOption } from 'slash-create';
import { queueService, scrimService, userService } from '../services';
import { queueEmbed } from '../components/queue';
import { NoMatchupPossibleError } from '../errors/errors';
import { regionEnum, User } from '../entities/user';
import { MatchmakingStatus } from '../services/queue-service';

const startMatchmaking = async (users: User[], guildID: string) => {
  const { scrim, lobbyDetails } = await scrimService.createBalancedScrim(guildID, users[0].region, users);
  const matchEmbed = await scrimService.sendMatchDetails(scrim, users, lobbyDetails);
  return { embeds: [matchEmbed] };
};

const queueCommandOptions: ApplicationCommandOption[] = [
  {
    type: CommandOptionType.SUB_COMMAND,
    name: 'join',
    description: 'Queue up for an in-house game'
  },
  {
    type: CommandOptionType.SUB_COMMAND,
    name: 'leave',
    description: 'Leave the queue'
  },
  {
    type: CommandOptionType.SUB_COMMAND,
    name: 'show',
    description: 'Show users currently in queue',
    options: [
      {
        type: CommandOptionType.BOOLEAN,
        description: 'Show a detailed overview of the queue',
        name: 'detailed'
      }
    ]
  }
];

class QueueCommand extends SlashCommand {
  private timer: NodeJS.Timeout | undefined;
  constructor(creator: SlashCreator) {
    super(creator, {
      name: 'queue',
      description: 'A queue for joining in-house games',
      options: [
        {
          type: CommandOptionType.SUB_COMMAND_GROUP,
          name: 'euw',
          description: 'Commands to interact with the queue for Europe West',
          options: queueCommandOptions
        },
        {
          type: CommandOptionType.SUB_COMMAND_GROUP,
          name: 'na',
          description: 'Commands to interact with the queue for North America',
          options: queueCommandOptions
        }
      ]
    });
    this.filePath = __filename;
  }
  async run(ctx: CommandContext) {
    // returns the subcommand, option, and option value
    // TODO: Get queue by the user's server and guild in the future

    const guildID = ctx.guildID!!;
    const [commandGroup, command] = ctx.subcommands;
    const region = regionEnum.parse(commandGroup.toUpperCase());

    try {
      if (command === 'show') {
        const users = [...queueService.getQueue(guildID, region).values()];
        const embed = queueEmbed(users, 'show', ctx.user.id, region, ctx.options[commandGroup].show['detailed']);
        return {
          embeds: [embed as any],
          allowedMentions: { everyone: false }
        };
      }
      switch (command) {
        case 'join': {
          const user = await userService.getUserProfile(ctx.user.id);
          const queuers = queueService.joinQueue(user, guildID, region);
          const status = queueService.attemptMatchCreation(guildID, region);
          console.info({status})
          if (status === MatchmakingStatus.NOT_ENOUGH_PLAYERS) {
              const embed = queueEmbed(queuers, 'join', ctx.user.id, region);
              return { embeds: [embed as any], allowedMentions: { everyone: false } };
          }
          switch (status) {
            case MatchmakingStatus.UNEVEN_RANK_DISTRIBUTION: {
              // 5 min timer
              // TODO: move this to queue service
              if (this.timer === undefined) {
                this.timer = setTimeout(async () => {
                  const users = [...queueService.getQueue(guildID, region).values()];
                  const averageElo = users.reduce((prev, curr) => prev + curr.elo, 0) / users.length;
                  // Sort from Highest to Lowest.
                  const relevantUsers = users
                    .sort((a, b) => Math.abs(averageElo - a.elo) - Math.abs(averageElo - b.elo))
                    .slice(0, 10);
                  queueService.removeUserFromQueue(
                    guildID,
                    region,
                    relevantUsers.map((u) => u.id)
                  );
                  const players = await userService.getUsers(relevantUsers.map((u) => u.id));
                  const { embeds } = await startMatchmaking(players, guildID);
                  await ctx.send({ embeds: embeds as any });
                  this.timer = undefined;
                }, 1000 * 60 * 2);
                return {
                  content:
                    'Player(s) currently too far above/below average MMR for this game. If other players are not found in 5 minutes this match will continue'
                };
              }
            }
            case MatchmakingStatus.VALID_MATCH: {
              queueService.resetQueue(guildID, region);
              clearTimeout(this.timer);
              this.timer = undefined;
              const users = await userService.getUsers(queuers.map((u) => u.id));
              const averageElo = users.reduce((prev, curr) => prev + curr.elo, 0) / users.length;
              // Sort from Highest to Lowest.
              const relevantUsers = users
                .sort((a, b) => Math.abs(averageElo - a.elo) - Math.abs(averageElo - b.elo))
                .slice(0, 10);
              // Users who did not get into the game gets botoed
              users.slice(10).forEach(u => queueService.joinQueue(u, guildID, region))
              return startMatchmaking(relevantUsers, guildID);
            }
          }
        }
        case 'leave': {
          const users = queueService.leaveQueue(ctx.user.id, guildID, region);
          if (users.length < 10) {
            clearTimeout(this.timer)
            this.timer = undefined
          }
          const embed = queueEmbed(users, 'leave', ctx.user.id, region);
          return { embeds: [embed as any], allowedMentions: { everyone: false } };
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
