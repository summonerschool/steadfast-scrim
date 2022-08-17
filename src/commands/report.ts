// import { SlashCommand, CommandOptionType, CommandContext, SlashCreator } from 'slash-create';

// class ReportCommand extends SlashCommand {
//   constructor(creator: SlashCreator) {
//     super(creator, {
//       name: 'report',
//       description: 'Reports player to mod team.',
//       options: [
//         {
//           type: CommandOptionType.USER,
//           name: 'username',
//           description: 'Mention user who you would like to report.'
//         }
//       ]
//     });

//     this.filePath = __filename;
//   }

//   async run(ctx: CommandContext) {
//     console.info(ctx.user.id);
//     console.log(ctx.options.username);
//     //    To do: Send message to mod mail or channel for mods.
//   }
// }

// export default ReportCommand;
