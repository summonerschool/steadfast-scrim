import { SlashCommand, CommandOptionType, CommandContext } from "slash-create";

class HelloCommand extends SlashCommand {
  constructor(creator) {
    super(creator, {
      name: 'hello',
      description: 'Says hello to you.',
      options: [{
        type: CommandOptionType.STRING,
        name: 'food',
        description: 'What food do you like?'
      }]
    });

    this.filePath = __filename;
  }

  async run(ctx: CommandContext) {
    console.info(ctx.user.id)
    return ctx.options.food ? `You like ${ctx.options.food}? Nice!` : `Hello, ${ctx.user.id}(${ctx.user.username})!`;
  }
}

export default HelloCommand