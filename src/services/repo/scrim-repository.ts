import { Prisma, PrismaClient, Role, Side, Status } from '@prisma/client';
import { mapToScrim, Player, Scrim } from '../../entities/scrim';
import { Region, User } from '../../entities/user';

export interface ScrimRepository {
  createScrim: (guildID: string, region: Region, players: Player[], voiceIDs: string[]) => Promise<Scrim>;
  updateScrim: (scrim: Scrim) => Promise<Scrim>;
  getScrims: (filter: Prisma.ScrimWhereInput) => Promise<Scrim[]>;
  getScrimByID: (scrimID: number) => Promise<Scrim | undefined>;
}

export const initScrimRepository = (prisma: PrismaClient) => {
  const repo: ScrimRepository = {
    createScrim: async (guildID, region, players, voiceIDs) => {
      const playerData = players.map((player) => ({
        user_id: player.userID,
        role: Role[player.role],
        side: Side[player.side],
        pregameElo: player.pregameElo
      }));
      const res = await prisma.scrim.create({
        data: {
          guildID: guildID,
          region: region,
          players: {
            createMany: {
              data: playerData,
              skipDuplicates: true
            }
          },
          status: Status.STARTED,
          voice_ids: voiceIDs
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
          voice_ids: scrim.voiceIDs,
          winner: scrim.winner && Side[scrim.winner]
        },
        where: {
          id: scrim.id
        }
      });
      return mapToScrim(res, []);
    },
    getScrims: async (filter) => {
      const scrims = await prisma.scrim.findMany({
        where: filter
      });
      return scrims.map((scrim) => mapToScrim(scrim, []));
    },
    getScrimByID: async (scrimID) => {
      const scrim = await prisma.scrim.findUnique({ where: { id: scrimID }, include: { players: true } });
      return scrim ? mapToScrim(scrim, scrim.players) : undefined;
    }
  };
  return repo;
};
