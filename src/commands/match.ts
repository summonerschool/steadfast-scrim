import {
  SlashCommand,
  CommandOptionType,
  CommandContext,
  SlashCreator,
  AutocompleteContext,
  AutocompleteChoice
} from 'slash-create';
import { scrimService } from '../services';

class MatchCommand extends SlashCommand {
  constructor(creator: SlashCreator) {
    super(creator, {
      name: 'match',
      description: 'Says hello to you.',
      options: [
        {
          type: CommandOptionType.INTEGER,
          name: 'match_id',
          description: 'The number on your game',
          required: true,
          autocomplete: true
        },
        {
          type: CommandOptionType.STRING,
          name: 'status',
          description: 'w for win, l for loss and r for remake',
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
    console.info(ctx.user.id);
    return ctx.options.food ? `You like ${ctx.options.food}? Nice!` : `Hello, ${ctx.user.id}(${ctx.user.username})!`;
  }

  async autocomplete(ctx: AutocompleteContext): Promise<AutocompleteChoice[]> {
    const availableScrims = await scrimService.getIncompleteScrims(ctx.user.id);
    return availableScrims.map((scrim) => ({ name: `#${scrim.id}`, value: scrim.id }));
  }
}

export default MatchCommand;
