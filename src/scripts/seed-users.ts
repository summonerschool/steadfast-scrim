import { PrismaClient } from '@prisma/client';
import { rankEnum, roleEnum, userSchema } from '../entities/user';
import { chance } from '../lib/chance';
import { queueService, userService } from '../services';
import { ELO_TRANSLATION } from '../utils/utils';

(async () => {
  const primary = ['TOP', 'JUNGLE', 'MID', 'BOT', 'SUPPORT', 'TOP', 'SUPPORT', 'MID', 'SUPPORT'];
  const secondary = ['MID', 'MID', 'TOP', 'MID', 'MID', 'MID', 'MID', 'TOP', 'MID'];

  const users = [...new Array(9)].map((_, i) => {
    const rank = chance.pickone(rankEnum.options);
    return userSchema.parse({
      id: chance.guid(),
      leagueIGN: `${chance.word({ length: 15 })}`,
      region: 'EUW',
      rank,
      main: primary[i],
      secondary: secondary[i],
      wins: chance.integer({ min: 0, max: 10 }),
      losses: chance.integer({ min: 0, max: 10 }),
      elo: ELO_TRANSLATION[rank],
      external_elo: ELO_TRANSLATION[rank]
    });
  });

  const prisma = new PrismaClient();
  const promises = users.map((u) =>
    prisma.user.upsert({
      where: { id: u.id, league_ign: u.leagueIGN },
      create: { ...u, league_ign: u.leagueIGN },
      update: {}
    })
  );
  const us = await Promise.all(promises);
  await Promise.all(us.map((u) => queueService.joinQueue(u.id, process.env.DEVELOPMENT_GUILD_ID!!)));
})();
