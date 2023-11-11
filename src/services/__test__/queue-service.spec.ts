import type { User } from '@prisma/client';
import { mockDeep } from 'jest-mock-extended';
import type { DiscordService } from '../discord-service';
import type { MatchDetailService } from '../matchdetail-service';
import { initQueueService } from '../queue-service';
import type { ScrimService } from '../scrim-service';

describe('QueueService', () => {
  const scrimService = mockDeep<ScrimService>();
  const discordService = mockDeep<DiscordService>();
  const matchDetailService = mockDeep<MatchDetailService>();
  const queueService = initQueueService(scrimService, discordService, matchDetailService);
  const user: User = {
    id: '202f86f2-778a-481e-922c-b7bb0022bde0',
    leagueIGN: 'DaKing',
    rank: 'GOLD',
    region: 'EUW',
    main: 'TOP',
    secondary: 'MID',
    elo: 1600,
    wins: 0,
    losses: 0,
    externalElo: 0,
    highElo: false,
    autofillProtected: false,
    registeredAt: new Date()
  };
  beforeEach(() => {
    queueService.resetQueue('guild1', 'EUW');
  });

  it('lets a user join the queue', () => {
    const queue = queueService.joinQueue(user, 'guild1', 'EUW', false);
    expect(queue[0]).toEqual({ ...user, queuedAsFill: false });
  });

  it('retrieves the correct queue size', () => {
    const pre = queueService.getQueue('guild1', 'EUW');
    expect(pre.size).toEqual(0);
    const joined = queueService.joinQueue(user, 'guild1', 'EUW', false);
    const post = queueService.getQueue('guild1', 'EUW');
    expect(joined).toEqual([...post.values()]);
  });

  it('lets a user leave queue', () => {
    const queue = queueService.joinQueue(user, 'guild1', 'EUW', false);
    const leaves = queueService.leaveQueue(user.id, 'guild1', 'EUW');
    expect(queue.length).toEqual(1);
    expect(leaves.length).toEqual(0);
  });
});
