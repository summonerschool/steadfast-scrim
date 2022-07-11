import { PrismaClient } from '@prisma/client';
import { mapToScrim, Player, Scrim } from '../../entities/scrim';
import { chance } from '../../lib/chance';

export interface ScrimRepository {
  createScrim: (queueID: string, players: Player[]) => Promise<Scrim>;
}

export const initScrimRepository = (prisma: PrismaClient) => {
  const repo: ScrimRepository = {
    createScrim: async (queueID, players) => {
      const playerData = players.map((player) => ({ user_id: player.userID, role: player.role, team: player.team }));
      const res = await prisma.scrim.create({
        data: {
          queue_id: queueID,
          players: {
            createMany: {
              data: playerData,
              skipDuplicates: true
            }
          },
          status: 'LOBBY',
          voice_ids: []
        },
        include: {
          players: true
        }
      });
      return mapToScrim(res, res.players);
    }
  };
  return repo;
};
