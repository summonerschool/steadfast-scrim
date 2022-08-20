import {
  SlashCommand,
  CommandOptionType,
  CommandContext,
  SlashCreator,
  AutocompleteContext,
  AutocompleteChoice
} from 'slash-create';
import { discordService, scrimService } from '../services';
import { capitalize } from '../utils/utils';

class MatchCommand extends SlashCommand {
  constructor(creator: SlashCreator) {
    super(creator, {
      name: 'match',
      description: 'Says hello to you.',
      options: [
        {
          type: CommandOptionType.INTEGER,
          name: 'match_id',
          description: 'The current match number',
          required: true,
          autocomplete: true
        },
        {
          type: CommandOptionType.STRING,
          name: 'status',
          description: 'Report if your team won or loss.',
          required: true,
          choices: [
            { name: 'win', value: 'WIN' },
            { name: 'loss', value: 'LOSS' },
            { name: 'remake', value: 'REMAKE' }
          ]
        }
      ]
    });

    this.filePath = __filename;
  }

  async run(ctx: CommandContext) {
    const { match_id, status } = ctx.options;
    const scrim = await scrimService.findScrim(match_id);
    const player = scrim.players.find((p) => p.userID === ctx.user.id)!;
    const deleted = await discordService.deleteVoiceChannels(ctx.guildID!!, scrim.voiceIDs);
    console.log(deleted);
    if (status === 'REMAKE') {
      // TODO REMAKE LOGIC
      const res = await scrimService.remakeScrim(scrim);
      return res
        ? `Match #${match_id} has been reported as a remake`
        : 'Could not remake match. Please contact a moderator';
    }
    const enemy = player.side == 'BLUE' ? 'RED' : 'BLUE';
    const winner = status == 'WIN' ? player.side : enemy;
    const success = await scrimService.reportWinner(scrim, winner);
    if (!success) {
      return 'Oops! Could not set winner of match';
    }
    return `${capitalize(winner)} has been registered as the winner ✅`;
  }

  async autocomplete(ctx: AutocompleteContext): Promise<AutocompleteChoice[]> {
    const availableScrims = await scrimService.getIncompleteScrims(ctx.user.id);
    return availableScrims.map((scrim) => ({ name: `#${scrim.id}`, value: scrim.id }));
  }
}

export default MatchCommand;
