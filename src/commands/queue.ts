import { SlashCommand, CommandOptionType, CommandContext, SlashCreator } from 'slash-create';
import { queueService, scrimService } from '../services';
import { matchMessage, showQueueMessage } from '../components/match-message';
import { client } from '..';
import { lobbyDetails } from '../components/lobby-details';

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
    switch (ctx.subcommands[0]) {
      case 'join': {
        try {
          const queuer = await queueService.joinQueue(ctx.user.id, guildID);
          const matchmaking = await queueService.attemptMatchmaking(guildID);
          console.log(matchmaking.valid);
          if (!matchmaking.valid) {
            return { content: `<@${queuer.userID}> has joined the queue`, allowedMentions: { everyone: false } };
          }
          const scrim = await scrimService.createBalancedScrim(
            guildID,
            matchmaking.queuers.map((p) => p.userID)
          );
          const draftURLs = await scrimService.createProdraftLobby(scrim.id);
          const opggBlue = await scrimService.generateScoutingLink(scrim.id, 'BLUE');
          const opggRed = await scrimService.generateScoutingLink(scrim.id, 'RED');

          const publicEmbed = matchMessage(scrim, opggBlue, opggRed, draftURLs.SPECTATOR.url);
          await ctx.send({
            embeds: [publicEmbed as any]
          });

          // Send DMs
          const userPromises = scrim.players
            .filter((p) => !p.userID.includes('-'))
            .map((p) => client.users.fetch(p.userID, { cache: false }));
          const discordUsers = await Promise.all(userPromises);
          const messagePromises = discordUsers.map(async (user) => {
            // remove the spectator url so people dont get confused
            const matchEmbed = matchMessage(scrim, opggBlue, opggRed);
            const gameEmbed = await lobbyDetails(scrim, user.id, draftURLs);
            return user.send({ embeds: [matchEmbed, gameEmbed] });
          });
          const msgs = await Promise.all(messagePromises);
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
