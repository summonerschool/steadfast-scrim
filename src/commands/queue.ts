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
          if (status === MatchmakingStatus.NOT_ENOUGH_PLAYERS) {
            const embed = queueEmbed(queuers, 'join', ctx.user.id, region);
            return { embeds: [embed as any], allowedMentions: { everyone: false } };
          }
          const users = await userService.getUsers(queuers.map((u) => u.id));
          queueService.resetQueue(guildID, region);
          return startMatchmaking(users, guildID);
        }
        case 'leave': {
          const users = queueService.leaveQueue(ctx.user.id, guildID, region);
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
