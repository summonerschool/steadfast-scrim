import { Role, User, userSchema } from '../../entities/user';
import { chance } from '../../lib/chance';
import { initMatchmakingService } from '../matchmaking-service';

describe('MatchmakingService', () => {
  const matchmakingService = initMatchmakingService();
  it('creates', async () => {
    console.log(matchmakingService.startMatchmaking(users));
    expect(true).toBe(true);
  });
});
const createTestUser = (role?: Role, secondary?: Role, name?: string, elo?: number) =>
  userSchema.parse({
    id: chance.guid(),
    leagueIGN: name || chance.name(),
    rank: 'GOLD',
    region: 'EUW',
    main: role,
    secondary: secondary ? secondary : secondary == 'MID' ? 'SUPPORT' : 'MID',
    elo: elo
  });

// const users: User[] = [
//   createTestUser('TOP', 'MID', 'huzzle', 2100),
//   createTestUser('JUNGLE', 'TOP', 'zero', 1400),
//   createTestUser('MID', 'JUNGLE', 'rayann', 1821),
//   createTestUser('MID', 'JUNGLE', 'mika', 2400),
//   createTestUser('MID', 'JUNGLE', 'mo', 2400),
//   createTestUser('MID', 'JUNGLE', 'zironic', 659),
//   createTestUser('SUPPORT', 'BOT', 'kharann', 1700),
//   createTestUser('SUPPORT', 'BOT', 'yyaen', 1657),
//   createTestUser('SUPPORT', 'BOT', 'z', 1900),
//   createTestUser('SUPPORT', 'BOT', 'tikka', 1800)
// ];

const users: User[] = [
  createTestUser('TOP', 'MID', 'huzzle', 2100),
  createTestUser('MID', 'TOP', 'zero', 1400),
  createTestUser('TOP', 'JUNGLE', 'rayann', 1821),
  createTestUser('JUNGLE', 'JUNGLE', 'mika', 2400),
  createTestUser('BOT', 'JUNGLE', 'mo', 2400),
  createTestUser('BOT', 'SUPPORT', 'zironic', 659),
  createTestUser('JUNGLE', 'BOT', 'kharann', 1700),
  createTestUser('MID', 'BOT', 'yyaen', 1657),
  createTestUser('BOT', 'BOT', 'z', 1900),
  createTestUser('SUPPORT', 'BOT', 'tikka', 1800)
];
