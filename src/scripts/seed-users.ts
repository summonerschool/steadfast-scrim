import { Prisma, PrismaClient } from '@prisma/client';
import { chance } from '../lib/chance';

const prisma = new PrismaClient();

const users: Prisma.UserCreateManyInput[] = [...new Array(9)].map(() => ({
  id: chance.guid(),
  league_ign: chance.name(),
  rank: 'SILVER',
  server: 'EUW'
}));

const queued: Prisma.QueuerCreateManyInput[] = users.map(({ id }) => ({
  queue_id: '6e39f3c5-e4cf-4966-b15f-a02340240a4e',
  user_id: id,
  popped: false
}));

(async () => {
  await prisma.user.createMany({ data: users });
  await prisma.queuer.createMany({ data: queued });
})();
