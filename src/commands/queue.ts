import {
  SlashCommand,
  CommandOptionType,
  CommandContext,
  SlashCreator,
  Message,
  ComponentType,
  ButtonStyle,
  MessageOptions
} from 'slash-create';
import { queueService, scrimService } from '../services';
import { queueEmbed } from '../components/queue';
import { NoMatchupPossibleError } from '../errors/errors';
import { User } from '../entities/user';

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
          const matchmaking = queueService.canCreateMatch(users);
          // TODO: Move this logic to service
          if (!matchmaking.valid) {
            if (matchmaking.roleCount != null) {
              const roles = matchmaking.roleCount;
              await ctx.defer();
              const btn = (await ctx.send({
                content: 'Role selection was not diverse enough. Would anyone like to fill?',
                components: [
                  {
                    type: ComponentType.ACTION_ROW,
                    components: [
                      {
                        type: ComponentType.BUTTON,
                        style: ButtonStyle.PRIMARY,
                        label: 'Fill',
                        custom_id: 'fill'
                      }
                    ]
                  }
                ]
              })) as Message;
              ctx.registerComponent('fill', async (btnCtx) => {
                const user = users.find((u) => u.id === btnCtx.user.id);
                let response: MessageOptions | null = null;
                if (!user) {
                  response = {
                    content: "You cannot fill in a match you're not queued up for",
                    ephemeral: true
                  };
                } else if (roles.get(user.main)!! - 1 < 2 || roles.get(user.secondary)!! - 1 < 2) {
                  response = {
                    content: 'You cannot queue up as fill due to the lack of players in one of your roles',
                    ephemeral: true
                  };
                } else {
                  (btn as Message).edit({ components: [] });
                  queueService.resetQueue(guildID);
                  const { embeds } = await startMatchmaking(
                    users.map((u) => (u.id === ctx.user.id ? { ...u, isFill: true } : u)),
                    guildID
                  );
                  response = {
                    embeds: [embeds as any]
                  };
                }
                btn.edit({ content: 'A user has chosen fill' });
                await ctx.send(response);
              });
            } else {
              console.log('RIP');
              const embed = queueEmbed(users, 'join', ctx.user.id);
              return { embeds: [embed as any], allowedMentions: { everyone: false } };
            }
          } else {
            queueService.resetQueue(guildID);
            return await startMatchmaking(users, guildID);
          }
          break;
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
