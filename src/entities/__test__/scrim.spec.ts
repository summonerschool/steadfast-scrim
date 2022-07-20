import { Player as PrismaPlayer, Scrim as PrismaScrim } from '@prisma/client';
import { mapToPlayer, mapToScrim } from '../scrim';

describe('Scrim entities', () => {
  it('Maps prisma player correctly', async () => {
    const data: PrismaPlayer = {
      user_id: '1',
      scrim_id: 1,
      role: 'JUNGLE',
      side: 'BLUE'
    };
    const player = mapToPlayer(data);
    const { user_id, role, side } = data;
    expect(player).toEqual({ userID: user_id, role, side });
  });

  it('Maps prisma scrim correctly', async () => {
    const players: PrismaPlayer[] = [
      {
        user_id: '1',
        scrim_id: 1,
        role: 'BOT',
        side: 'BLUE'
      },
      {
        user_id: '2',
        scrim_id: 1,
        role: 'SUPPORT',
        side: 'RED'
      },
      {
        user_id: '3',
        scrim_id: 1,
        role: 'JUNGLE',
        side: 'BLUE'
      }
    ];

    const scrim: PrismaScrim = {
      id: 1,
      queue_id: '1',
      status: 'LOBBY',
      voice_ids: [],
      winner: null
    };
    const mapped = mapToScrim(scrim, players);
    expect(mapped.players.length).toEqual(3);
    expect(mapped.queueID).toEqual(scrim.queue_id);
    expect(mapped.voiceIDs).toEqual(scrim.voice_ids);
  });
});
