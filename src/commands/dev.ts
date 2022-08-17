// import { PrismaClient } from '@prisma/client';
// import { SlashCommand, CommandOptionType, CommandContext, SlashCreator } from 'slash-create';
// import { rankEnum, userSchema } from '../entities/user';
// import { chance } from '../lib/chance';
// import { discordService, queueService, userService } from '../services';
// import { ELO_TRANSLATION } from '../utils/utils';

// class DevCommand extends SlashCommand {
//   constructor(creator: SlashCreator) {
//     super(creator, {
//       name: 'dev',
//       description: 'Voice Channels',
//       options: [
//         {
//           type: CommandOptionType.SUB_COMMAND,
//           name: 'seed',
//           description: 'make test users join'
//         },
//       ]
//     });

//     this.filePath = __filename;
//   }

//   async run(ctx: CommandContext) {
//     const ids = [
//       '56dae21d-9a40-4ffa-ab23-0364a7ce1208',
//       '346e3ad3-53d7-493d-be62-46ab79da2a0d',
//       'f4db232f-8560-4613-a8f8-fb10d8da1357',
//       '879b42d6-055d-4678-938c-8a12f931b65c',
//       '7af9aba4-c778-4156-86d4-6f54bbb830ee',
//       '45a00061-fe96-4482-864a-ad0f42ec347f',
//       '7537a256-ca19-4bc6-a458-9ca9c9dcbb89',
//       'e25c99ea-849e-455e-9891-ae09bc2e668c',
//       'c75794d4-5ef8-42c9-a09b-6a569f6b9e80'
//     ];
//     const primary = ['TOP', 'JUNGLE', 'MID', 'BOT', 'SUPPORT', 'TOP', 'SUPPORT', 'MID', 'SUPPORT'];
//     const secondary = ['MID', 'MID', 'TOP', 'MID', 'MID', 'MID', 'MID', 'TOP', 'MID'];
//     const users = [...new Array(9)].map((_, i) => {
//       const rank = chance.pickone(rankEnum.options);
//       return userSchema.parse({
//         id: ids[i],
//         leagueIGN: `${chance.word({ length: 15 })}`,
//         region: 'EUW',
//         rank,
//         main: primary[i],
//         secondary: secondary[i],
//         wins: chance.integer({ min: 0, max: 10 }),
//         losses: chance.integer({ min: 0, max: 10 }),
//         elo: ELO_TRANSLATION[rank],
//         external_elo: ELO_TRANSLATION[rank]
//       });
//     });

//     const prisma = new PrismaClient();
//     const promises = users.map((u) => {
//       const { leagueIGN, isFill, ...user } = u;
//       return prisma.user.upsert({
//         where: { id: u.id },
//         create: { ...user, league_ign: leagueIGN },
//         update: {}
//       });
//     });
//     const us = await Promise.all(promises);
//     const joins = await Promise.all(us.map((u) => queueService.joinQueue(u.id, process.env.DEVELOPMENT_GUILD_ID!!)));
//     return `${joins.length} has been added to queue`;
//   }
// }

// export default DevCommand;
