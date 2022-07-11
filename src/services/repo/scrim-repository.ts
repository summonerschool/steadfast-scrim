import { PrismaClient, Scrim } from '@prisma/client';
import { Player } from '../../entities/scrim';
import { chance } from '../../lib/chance';

export interface ScrimRepository {
  createScrim: (queueID: string, players: Player[]) => Promise<Scrim>;
}

const initScrimRepopository = (prisma: PrismaClient) => {
  const repo: ScrimRepository = {
    createScrim: async (queueID, players) => {
      const playerData = players.map((player) => ({ user_id: player.userID, role: player.role, team: player.team }));
      const scrim = await prisma.scrim.create({
        data: {
          queue_id: queueID,
          lobby_creator_id: chance.pickone(players).userID,
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
      return scrim;
    }
  };
  return repo;
};
