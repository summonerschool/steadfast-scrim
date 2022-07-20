import { Prisma, PrismaClient, Role, Side, Status } from '@prisma/client';
import { mapToScrim, Player, Scrim } from '../../entities/scrim';

export interface ScrimRepository {
  createScrim: (queueID: string, players: Player[]) => Promise<Scrim>;
  updateScrim: (scrim: Scrim) => Promise<number>;
  getScrims: (filter: Prisma.ScrimWhereInput) => Promise<Scrim[]>;
}

export const initScrimRepository = (prisma: PrismaClient) => {
  const repo: ScrimRepository = {
    createScrim: async (queueID, players) => {
      const playerData = players.map((player) => ({
        user_id: player.userID,
        role: Role[player.role],
        side: Side[player.side]
      }));
      const res = await prisma.scrim.create({
        data: {
          queue_id: queueID,
          players: {
            createMany: {
              data: playerData,
              skipDuplicates: true
            }
          },
          status: Status.STARTED,
          voice_ids: []
        },
        include: {
          players: true
        }
      });
      return mapToScrim(res, res.players);
    },
    updateScrim: async (scrim) => {
      const res = await prisma.scrim.update({
        data: {
          status: scrim.status,
          queue_id: scrim.queueID,
          voice_ids: scrim.voiceIDs,
          winner: scrim.winner && Side[scrim.winner]
        },
        where: {
          id: scrim.id
        }
      });
      return res ? 1 : 0;
    },
    getScrims: async (filter) => {
      const scrims = await prisma.scrim.findMany({
        where: filter
      });
      console.log(scrims);
      return scrims.map((scrim) => mapToScrim(scrim, []));
    }
  };
  return repo;
};
