import { Player as PrismaPlayer, Scrim as PrismaScrim } from '@prisma/client';
import { chance } from '../../lib/chance';
import { mapToPlayer, mapToScrim } from '../scrim';

describe('Scrim entities', () => {
  it('Maps prisma player correctly', async () => {
    const data: PrismaPlayer = {
      user_id: '1',
      scrim_id: 1,
      role: 'JUNGLE',
      team: 'BLUE'
    };
    const player = mapToPlayer(data);
    const { user_id, role, team } = data;
    expect(player).toEqual({ userID: user_id, role, team });
  });

  it('Maps prisma scrim correctly', async () => {
    const players: PrismaPlayer[] = [
      {
        user_id: '1',
        scrim_id: 1,
        role: 'BOT',
        team: 'BLUE'
      },
      {
        user_id: '2',
        scrim_id: 1,
        role: 'SUPPORT',
        team: 'RED'
      },
      {
        user_id: '3',
        scrim_id: 1,
        role: 'JUNGLE',
        team: 'BLUE'
      }
    ];

    const scrim: PrismaScrim = {
      id: 1,
      lobby_creator_id: '1',
      queue_id: '1',
      status: 'LOBBY',
      voice_ids: []
    };
    const mapped = mapToScrim(scrim, players);
    expect(mapped.players.length).toEqual(3);
    expect(mapped.lobbyCreatorID).toEqual(scrim.lobby_creator_id);
    expect(mapped.queueID).toEqual(scrim.queue_id);
    expect(mapped.voiceIDs).toEqual(scrim.voice_ids);
  });
});
