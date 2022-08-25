import { Role, User, userSchema } from '../../entities/user';
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
    const users = matchmakingService.attemptFill(fail)
    expect(users.length).toEqual(10);
  });
});

const fail: User[] = [
  {
    id: '183908254210981888',
    leagueIGN: 'kharann',
    main: 'JUNGLE',
    rank: 'GOLD',
    region: 'EUW',
    secondary: 'MID',
    wins: 2,
    losses: 0,
    elo: 2086,
    external_elo: 2000
  },
  {
    id: '164357764020305920',
    leagueIGN: 'Tikka Masala',
    rank: 'GOLD',
    region: 'EUW',
    main: 'TOP',
    secondary: 'BOT',
    wins: 8,
    losses: 4,
    elo: 2157,
    external_elo: 2000
  },
  {
    id: '717686953524330587',
    leagueIGN: 'Kazzara',
    main: 'BOT',
    secondary: 'MID',
    rank: 'GOLD',
    region: 'EUW',
    wins: 0,
    losses: 1,
    elo: 1605,
    external_elo: 1663
  },
  {
    id: '134168788718452736',
    leagueIGN: 'koreanhypetrain',
    main: 'JUNGLE',
    secondary: 'TOP',
    wins: 1,
    losses: 5,
    rank: 'GOLD',
    region: 'EUW',
    elo: 2042,
    external_elo: 2208
  },
  {
    id: '270437177186320385',
    leagueIGN: 'aapathes',
    main: 'JUNGLE',
    secondary: 'TOP',
    wins: 5,
    losses: 4,
    elo: 2592,
    rank: 'GOLD',
    region: 'EUW',
    external_elo: 2400
  },
  {
    id: '91423469811531776',
    leagueIGN: 'Stasko',
    main: 'TOP',
    secondary: 'JUNGLE',
    wins: 2,
    rank: 'GOLD',
    region: 'EUW',
    losses: 5,
    elo: 1914,
    external_elo: 2000
  },
  {
    id: '396669041655152650',
    leagueIGN: 'Darkleynad777',
    main: 'TOP',
    secondary: 'BOT',
    wins: 6,
    rank: 'GOLD',
    region: 'EUW',
    losses: 3,
    elo: 1270,
    external_elo: 1200
  },
  {
    id: '766404374766288926',
    leagueIGN: 'LAMPOST MALONE',
    main: 'TOP',
    secondary: 'JUNGLE',
    wins: 3,
    rank: 'GOLD',
    region: 'EUW',
    losses: 0,
    elo: 2088,
    external_elo: 2000
  },
  {
    id: '199898480024485888',
    leagueIGN: 'AA Cancels',
    main: 'BOT',
    secondary: 'TOP',
    wins: 4,
    losses: 7,
    elo: 2007,
    rank: 'GOLD',
    region: 'EUW',
    external_elo: 2070
  },
  {
    id: '105780609393139712',
    leagueIGN: 'smack enjoyer',
    main: 'TOP',
    secondary: 'JUNGLE',
    wins: 2,
    losses: 3,
    elo: 2072,
    rank: 'GOLD',
    region: 'EUW',
    external_elo: 2098
  }
];

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
  createTestUser('JUNGLE', 'MID', 'huzzle2', 2100),
  createTestUser('SUPPORT', 'MID', 'huzzle3', 2100),
  createTestUser('TOP', 'MID', 'huzzle4', 2100),
  createTestUser('TOP', 'MID', 'huzzle5', 2100),
  createTestUser('MID', 'JUNGLE', 'rayann1', 1821),
  createTestUser('MID', 'JUNGLE', 'rayann2', 1821),
  createTestUser('MID', 'JUNGLE', 'rayann3', 1821),
  createTestUser('MID', 'JUNGLE', 'rayann4', 1821),
  createTestUser('MID', 'JUNGLE', 'rayann5', 1821)
];
