import { mockDeep } from 'jest-mock-extended';
import { User } from '../../entities/user';
import { DiscordService } from '../discord-service';
import { initQueueService } from '../queue-service';
import { ScrimService } from '../scrim-service';

describe('QueueService', () => {
  const scrimService = mockDeep<ScrimService>();
  const discordService = mockDeep<DiscordService>();
  scrimService.getActiveScrims.mockImplementation(() => []);
  const queueService = initQueueService(scrimService, discordService);
  const user: User = {
    id: '202f86f2-778a-481e-922c-b7bb0022bde0',
    leagueIGN: 'DaKing',
    rank: 'GOLD',
    region: 'EUW',
    main: 'TOP',
    secondary: 'MID',
    elo: 1600,
    wins: 0,
    losses: 0
  };
  beforeEach(() => {
    queueService.resetQueue('guild1', 'EUW');
  });

  it('lets a user join the queue', () => {
    const queue = queueService.joinQueue(user, 'guild1', 'EUW');
    expect(queue[0]).toEqual(user);
  });

  it('retrieves the correct queue size', () => {
    const pre = queueService.getQueue('guild1', 'EUW');
    expect(pre.size).toEqual(0);
    const joined = queueService.joinQueue(user, 'guild1', 'EUW');
    const post = queueService.getQueue('guild1', 'EUW');
    expect(joined).toEqual([...post.values()]);
  });

  it('lets a user leave queue', () => {
    const queue = queueService.joinQueue(user, 'guild1', 'EUW');
    const leaves = queueService.leaveQueue(user.id, 'guild1', 'EUW');
    expect(queue.length).toEqual(1);
    expect(leaves.length).toEqual(0);
  });
});
