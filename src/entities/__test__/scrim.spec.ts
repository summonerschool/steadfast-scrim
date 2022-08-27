import { Player as PrismaPlayer, Scrim as PrismaScrim } from '@prisma/client';
import { mapToPlayer, mapToScrim } from '../scrim';

describe('Scrim entities', () => {
  it('Maps prisma player correctly', async () => {
    const data: PrismaPlayer = {
      user_id: '1',
      scrim_id: 1,
      role: 'JUNGLE',
      side: 'BLUE',
      pregameElo: 1600
    };
    const player = mapToPlayer(data);
    const { user_id, role, side, pregameElo } = data;
    expect(player).toEqual({ userID: user_id, role, side, pregameElo });
  });

  it('Maps prisma scrim correctly', async () => {
    const players: PrismaPlayer[] = [
      {
        user_id: '1',
        scrim_id: 1,
        role: 'BOT',
        side: 'BLUE',
        pregameElo: 1600
      },
      {
        user_id: '2',
        scrim_id: 1,
        role: 'SUPPORT',
        side: 'RED',
        pregameElo: 1600
      },
      {
        user_id: '3',
        scrim_id: 1,
        role: 'JUNGLE',
        side: 'BLUE',
        pregameElo: 1600
      }
    ];

    const scrim: PrismaScrim = {
      id: 1,
      status: 'STARTED',
      voice_ids: [],
      winner: null,
      guildID: '',
      region: 'EUW'
    };
    const mapped = mapToScrim(scrim, players);
    expect(mapped.players.length).toEqual(3);
    expect(mapped.voiceIDs).toEqual(scrim.voice_ids);
  });
});
