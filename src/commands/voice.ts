// import { SlashCommand, CommandOptionType, CommandContext, SlashCreator } from 'slash-create';
// import { discordService } from '../services';

// class VoiceCommand extends SlashCommand {
//   constructor(creator: SlashCreator) {
//     super(creator, {
//       name: 'voice',
//       description: 'Voice Channels',
//       options: [
//         {
//           type: CommandOptionType.SUB_COMMAND,
//           name: 'create',
//           description: 'create voice channel'
//         },
//         {
//           type: CommandOptionType.SUB_COMMAND,
//           name: 'delete',
//           description: 'delete voice channel'
//         }
//       ]
//     });

//     this.filePath = __filename;
//   }

//   private idMap = new Map<string, string[]>();

//   async run(ctx: CommandContext) {
//     if (ctx.subcommands[0] === 'create') {
//       // TODO: MOVE THIS TO THE QUEUE POP ACTION -> STORE THE VOICE CHANNELS IDS IN THE SCRIM TABLE
//       const vcs = await discordService.createVoiceChannels(ctx.guildID!!, ['Team Blue Rat', 'Team Red Dog']);
//       const active = this.idMap.get(ctx.guildID!!) || [];
//       this.idMap.set(ctx.guildID!!, [...active, ...vcs.map((vc) => vc.id)]);
//     } else if (ctx.subcommands[0] === 'delete') {
//       await Promise.all(
//         [...this.idMap.entries()].map(([guildID, voiceIDs]) => discordService.deleteVoiceChannels(guildID, voiceIDs))
//       );
//       this.idMap.set(ctx.guildID!!, []);
//     }
//     return 'ok';
//   }
// }

// export default VoiceCommand;
