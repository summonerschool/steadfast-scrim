import {
  SlashCommand,
  CommandOptionType,
  CommandContext,
  SlashCreator,
  ApplicationCommandOption,
  ComponentType,
  ButtonStyle,
  Message
} from 'slash-create';
import { queueService, userService } from '../services';
import { queueEmbed } from '../components/queue';
import { NoMatchupPossibleError } from '../errors/errors';
import { Region, regionEnum } from '../entities/user';
import { MatchmakingStatus } from '../services/queue-service';

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
  private voteTimer = new Map<string, NodeJS.Timeout>();
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
          switch (status) {
            case MatchmakingStatus.UNEVEN_RANK_DISTRIBUTION: {
              const key = `${guildID}_${region}`;
              const timer = this.voteTimer.get(key);
              const TIME_TO_MATCH = 1000 * 60 * 3;
              if (!timer) {
                await ctx.defer();
                const text =
                  'Player(s) currently too far above/below average MMR for this game. If other players are not found in 3 minutes, or the vote passes, this match will continue';
                const msg = (await ctx.send(text + `\n6 votes required to pop queue now.`, {
                  components: [
                    {
                      type: ComponentType.ACTION_ROW,
                      components: [
                        {
                          type: ComponentType.BUTTON,
                          style: ButtonStyle.PRIMARY,
                          label: 'Pop Queue Now',
                          custom_id: 'vote',
                          emoji: {
                            name: '🎈'
                          }
                        }
                      ]
                    }
                  ]
                })) as Message;
                setTimeout(async () => {
                  const embed = await queueService.createMatch(guildID, region);
                  await ctx.send({ embeds: [embed as any] });
                  await msg.edit({ content: '3 minutes has passed, creating match...', components: [] });
                }, TIME_TO_MATCH);

                const voted = new Map<string, boolean>();

                ctx.registerComponent(
                  'vote',
                  async (voteCtx) => {
                    const users = queueService.getQueue(guildID, region);
                    const userID = voteCtx.user.id;
                    if (voted.get(userID)) {
                      voteCtx.send({ content: 'You have already voted', ephemeral: true });
                    } else if (!users.get(userID)) {
                      voteCtx.send({ content: 'You are not a part of the queue', ephemeral: true });
                    } else {
                      const voteState = voted.set(userID, true);
                      const passVoteCount = [...voteState.values()].reduce((sum, curr) => sum + (curr ? 1 : 0), 0);
                      if (passVoteCount < 6) {
                        await voteCtx.editParent(text + `\n${6 - passVoteCount} votes required to pop queue now.`);
                      } else {
                        this.resetTimer(guildID, region);
                        await voteCtx.editParent({ content: 'Vote went through, creating match...', components: [] });
                        const embed = await queueService.createMatch(guildID, region);
                        await voteCtx.sendFollowUp({ embeds: [embed as any] });
                      }
                    }
                  },
                  TIME_TO_MATCH
                );
              }
              break;
            }
            case MatchmakingStatus.VALID_MATCH: {
              this.resetTimer(guildID, region);
              const embed = await queueService.createMatch(guildID, region);
              return { embeds: [embed as any] };
            }
          }
          break;
        }
        case 'leave': {
          const users = queueService.leaveQueue(ctx.user.id, guildID, region);
          if (users.length < 10) {
            this.resetTimer(guildID, region);
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

  private resetTimer(guildID: string, region: Region) {
    const key = `${guildID}_${region}`;
    clearTimeout(this.voteTimer.get(key));
    this.voteTimer.delete(key);
  }
}

export default QueueCommand;
