import { UserRepository } from '../repo/user-repository';
import { initScrimService } from '../scrim-service';
import { mockDeep } from 'jest-mock-extended';
import { chance } from '../../lib/chance';
import { Role, User, userSchema } from '../../entities/user';
import { ScrimRepository } from '../repo/scrim-repository';
import { initMatchmakingService } from '../matchmaking-service';
import { Player, Scrim } from '../../entities/scrim';
import { DiscordService } from '../discord-service';

const roleToPlayer = (role: Role): User =>
  userSchema.parse({
    id: chance.guid(),
    leagueIGN: chance.name({ full: false }),
    rank: 'GOLD',
    server: 'EUW',
    roles: [role]
  });

describe('ScrimService', () => {
  const scrimRepository = mockDeep<ScrimRepository>();
  const userRepository = mockDeep<UserRepository>();
  const discord = mockDeep<DiscordService>()
  const matchmakingService = initMatchmakingService();
  const scrimService = initScrimService(scrimRepository, userRepository, matchmakingService, discord);

  it('Creates a valid scouting link', async () => {
    const mockGetUsersResult: User[] = [...new Array(5)].map(() =>
      userSchema.parse({
        id: chance.guid(),
        leagueIGN: chance.first(),
        rank: 'IRON',
        region: 'EUW',
        main: 'JUNGLE',
        secondary: 'MID'
      })
    );
    const summoners = encodeURIComponent(mockGetUsersResult.map((user) => user.leagueIGN).join(','));
    const expected = `https://op.gg/multisearch/euw?summoners=${summoners}`;
    await expect(scrimService.generateScoutingLink(mockGetUsersResult)).resolves.toEqual(expected);
  });

  it('Gives the correct elo to winners/losers', async () => {
    const matchup = matchmakingService.startMatchmaking(twoOfEach)[0];
    const players = matchmakingService.matchupToPlayers(matchup, twoOfEach);
    const scrim: Scrim = {
      id: chance.integer(),
      winner: 'BLUE',
      status: 'STARTED',
      voiceIDs: [],
      players: players
    };

    userRepository.getUsers.mockResolvedValueOnce([...twoOfEach]);
    scrimService.addResultsToPlayerStats(scrim);

    const scrim2: Scrim = {
      id: chance.integer(),
      winner: 'RED',
      status: 'STARTED',
      voiceIDs: [],
      players: players
    };
    userRepository.getUsers.mockResolvedValueOnce([...twoOfEach]);
    scrimService.addResultsToPlayerStats(scrim2);
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
    elo: elo,
    wins: 0,
    losses: 0
  });

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
