import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

(async () => {
  await prisma.queuer.updateMany({
    data: { popped: false }
  });
})();
