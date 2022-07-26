import { SlashCommand, CommandOptionType, CommandContext, SlashCreator } from 'slash-create';

class VoiceCommand extends SlashCommand {
  constructor(creator: SlashCreator) {
    super(creator, {
      name: 'voice',
      description: 'Voice Channels',
      options: [
        {
          type: CommandOptionType.SUB_COMMAND,
          name: 'create',
          description: 'create voice channel'
        },
        {
          type: CommandOptionType.SUB_COMMAND,
          name: 'delete',
          description: 'delete voice channel'
        }
      ]
    });

    this.filePath = __filename;
  }

  async run(ctx: CommandContext) {
    if (ctx.subcommands[0] === 'create') {
      // TODO: MOVE THIS TO THE QUEUE POP ACTION -> STORE THE VOICE CHANNELS IDS IN THE SCRIM TABLE
    }
    return 'ok';
  }
}

export default VoiceCommand;
