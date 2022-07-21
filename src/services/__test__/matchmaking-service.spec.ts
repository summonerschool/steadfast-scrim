import { Role, User, userSchema } from '../../entities/user';
import { NoMatchupPossibleError } from '../../errors/errors';
import { chance } from '../../lib/chance';
import { initMatchmakingService } from '../matchmaking-service';

describe('MatchmakingService', () => {
  const matchmakingService = initMatchmakingService();
  test('Matchmake a valid main-role only group of players', () => {
    const matchups = matchmakingService.startMatchmaking(twoOfEach);
    const matchup = matchups[0];
    expect(matchup.eloDifference).toEqual(37);
    const players = matchmakingService.matchupToPlayers(matchup, twoOfEach);
    const ids = players.map((p) => p.userID);
    // No duplicate users
    expect(ids.length).toEqual(new Set(ids).size);
  });
  test('Matchmake a matchup that requires secondary role', () => {
    const matchups = matchmakingService.startMatchmaking(notTwoOfEach);
    const matchup = matchups[0];
    expect(matchup.eloDifference).toEqual(119);
    const players = matchmakingService.matchupToPlayers(matchup, notTwoOfEach);
    const ids = players.map((p) => p.userID);
    // No duplicate users
    expect(ids.length).toEqual(new Set(ids).size);
  });

  test('No matchups possible', () => {
    expect(() => matchmakingService.startMatchmaking(invalid)).toThrowError(NoMatchupPossibleError);
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

const notTwoOfEach: User[] = [
  createTestUser('TOP', 'MID', 'huzzle', 2100),
  createTestUser('JUNGLE', 'TOP', 'zero', 1400),
  createTestUser('MID', 'JUNGLE', 'rayann', 1821),
  createTestUser('MID', 'JUNGLE', 'mika', 2400),
  createTestUser('MID', 'JUNGLE', 'mo', 2400),
  createTestUser('MID', 'JUNGLE', 'zironic', 659),
  createTestUser('BOT', 'SUPPORT', 'z', 1900),
  createTestUser('BOT', 'SUPPORT', 'tikka', 1800),
  createTestUser('SUPPORT', 'BOT', 'yyaen', 1657),
  createTestUser('SUPPORT', 'BOT', 'kharann', 1700)
];

const twoOfEach: User[] = [
  createTestUser('TOP', 'MID', 'huzzle', 2100),
  createTestUser('MID', 'TOP', 'zero', 1400),
  createTestUser('TOP', 'JUNGLE', 'rayann', 1821),
  createTestUser('JUNGLE', 'JUNGLE', 'mika', 2400),
  createTestUser('BOT', 'JUNGLE', 'mo', 2400),
  createTestUser('SUPPORT', 'BOT', 'zironic', 659),
  createTestUser('JUNGLE', 'BOT', 'kharann', 1700),
  createTestUser('MID', 'BOT', 'yyaen', 1657),
  createTestUser('BOT', 'BOT', 'z', 1900),
  createTestUser('SUPPORT', 'BOT', 'tikka', 1800)
];

const invalid: User[] = [
  createTestUser('TOP', 'MID', 'huzzle1', 2100),
  createTestUser('TOP', 'MID', 'huzzle2', 2100),
  createTestUser('TOP', 'MID', 'huzzle3', 2100),
  createTestUser('TOP', 'MID', 'huzzle4', 2100),
  createTestUser('TOP', 'MID', 'huzzle5', 2100),
  createTestUser('MID', 'JUNGLE', 'rayann1', 1821),
  createTestUser('MID', 'JUNGLE', 'rayann2', 1821),
  createTestUser('MID', 'JUNGLE', 'rayann3', 1821),
  createTestUser('MID', 'JUNGLE', 'rayann4', 1821),
  createTestUser('MID', 'JUNGLE', 'rayann5', 1821)
];
