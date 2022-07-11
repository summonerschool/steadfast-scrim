import { Player as PrismaPlayer } from '@prisma/client';
import { mapToPlayer } from '../scrim';

describe('Scrim entities', () => {
  it('Maps prisma player correctly', async () => {
    const data: PrismaPlayer = {
      user_id: '1',
      scrim_id: 1,
      role: 'JUNGLE',
      team: 'BLUE'
    };
    const player = mapToPlayer(data);
    const { user_id, scrim_id, role, team } = data;
    expect(player).toEqual({ userID: user_id, role, team });
  });
});
