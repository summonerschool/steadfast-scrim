import { SlashCommand, CommandOptionType, CommandContext, SlashCreator } from 'slash-create';
import { queueService, scrimService } from '../services';
import { matchMessage, showQueueMessage } from '../components/match-message';
import { client } from '..';
import { lobbyDetails } from '../components/lobby-details';

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

    const guildID = ctx.guildID!!;
    switch (ctx.subcommands[0]) {
      case 'join': {
        try {
          const queuer = await queueService.joinQueue(ctx.user.id, guildID);
          const matchmaking = await queueService.attemptMatchmaking(guildID);
          console.log(matchmaking);
          if (!matchmaking.valid) {
            return { content: `<@${queuer.userID}> has joined the queue`, allowedMentions: { everyone: false } };
          }
          const scrim = await scrimService.createBalancedScrim(
            guildID,
            matchmaking.queuers.map((p) => p.userID)
          );
          const embed = await matchMessage(scrim);
          await ctx.send({
            embeds: [embed as any]
          });

          const userPromises = scrim.players
            .filter((p) => !p.userID.includes('-'))
            .map((p) => client.users.fetch(p.userID, { cache: false }));
          const discordUsers = await Promise.all(userPromises);
          const messagePromises = discordUsers.map(async (user) => {
            const embed2 = await lobbyDetails(scrim, user.id);
            return user.send({ embeds: [embed, embed2] });
          });
          const msgs = await Promise.all(messagePromises);
          console.log(msgs)
        } catch (err) {
          if (err instanceof Error) {
            return err.message;
          } else {
            console.error(err);
          }
        }
        break;
      }
      case 'leave': {
        const queuer = await queueService.leaveQueue(ctx.user.id, guildID);
        return { content: `<@${queuer.userID}> has left the queue`, allowedMentions: { everyone: false } };
      }
      case 'show': {
        const queueWithUsers = await queueService.getUsersInQueue(guildID);
        const embed = await showQueueMessage(queueWithUsers.inQueue);
        return await ctx.send('', {
          embeds: [embed as any],
          allowedMentions: { everyone: false },
          ephemeral: false
        });
      }
      default:
        return 'no such command exists';
    }
  }
}

export default QueueCommand;
