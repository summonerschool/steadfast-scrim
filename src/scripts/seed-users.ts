import { Prisma, PrismaClient } from '@prisma/client';
import { Chance } from 'chance';
import { roleEnum } from '../entities/user';

const prisma = new PrismaClient();
const chance = new Chance('best-seed');

const users: Prisma.UserCreateManyInput[] = [...new Array(9)].map(() => ({
  id: chance.guid(),
  league_ign: chance.name(),
  rank: 'SILVER',
  region: 'EUW',
  main: chance.pickone(roleEnum.options),
  secondary: chance.pickone(roleEnum.options),
  elo: chance.integer({ min: 500, max: 2500 })
}));

const queued: Prisma.QueuerCreateManyInput[] = users.map(({ id }) => ({
  queue_id: '826232163082698794',
  user_id: id,
  popped: false
}));

(async () => {
  await prisma.user.createMany({ data: users });
  await prisma.queuer.createMany({ data: queued });
})();
