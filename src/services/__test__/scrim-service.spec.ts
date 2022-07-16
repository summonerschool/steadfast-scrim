import { UserRepository } from '../repo/user-repository';
import { calculateEloDifference, initScrimService } from '../scrim-service';
import { mockDeep } from 'jest-mock-extended';
import { chance } from '../../lib/chance';
import { Role, roleEnum, User, userSchema } from '../../entities/user';
import { ScrimRepository } from '../repo/scrim-repository';

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
  const scrimService = initScrimService(scrimRepository, userRepository);
  const ELO_TRANSLATION: { [key: string]: number } = {
    IRON: 400,
    BRONZE: 800,
    SILVER: 1200,
    GOLD: 1600,
    PLATINUM: 2000,
    DIAMOND: 2400,
    MASTER: 2800,
    GRANDMASTER: 2800,
    CHALLENGER: 3000
  };

  it('Randomly distributes roles and teams to 10 players', async () => {
    const userIDs = [...Array(10)].map(() => chance.integer({ min: 10 ** 7, max: 10 ** 8 }).toString());
    const players = await scrimService.randomTeambalance(userIDs);
    // Check if team each team is same size
    const teams = scrimService.sortPlayerByTeam(players);
    expect(scrimService.isValidTeam(teams.BLUE)).toBe(true);
    expect(scrimService.isValidTeam(teams.RED)).toBe(true);
    expect(teams.RED != teams.BLUE).toBe(true);
  });

  it('Creates a valid scouting link', async () => {
    const mockGetUsersResult: User[] = [...new Array(5)].map(() => ({
      id: chance.guid(),
      leagueIGN: chance.name(),
      rank: 'IRON',
      region: 'EUW',
      elo: 0,
      main: "JUNGLE",
      secondary: "MID"
    }));
    userRepository.getUsers.mockResolvedValueOnce(mockGetUsersResult);
    const summoners = encodeURIComponent(mockGetUsersResult.map((user) => user.leagueIGN).join(','));
    const expected = `https://op.gg/multisearch/euw?summoners=${summoners}`;
    await expect(scrimService.generateScoutingLink(1, 'RED')).resolves.toEqual(expected);
  });

  // it('perfect match', async () => {
  //   // makes of 2 of each role (10 in total)
  //   const roles = [...roleEnum.options, ...roleEnum.options];
  //   let users: User[] = roles.map((role) => ({
  //     id: chance.guid(),
  //     leagueIGN: chance.name(),
  //     rank: 'GOLD',
  //     server: 'EUW',
  //     roles: [role]
  //   }));
  //   const twoOfEachRole = scrimService.canCreatePerfectMatchup(users);
  //   expect(twoOfEachRole).toBe(true);
  // });

  it('creates perfect match', async () => {
    let tenUsers: User[] = users.map((user) => ({
      id: chance.guid(),
      leagueIGN:user.leagueIGN,
      rank: user.rank,
      region: 'EUW',
      main: user.main,
      secondary: user.secondary,
      elo: user.elo
    }));
    const matchups = scrimService.createMatchupNoAutofill(tenUsers)
    expect(Math.abs(calculateEloDifference(matchups[0][0], matchups[0][1]))).toEqual(37)
    
  });

  // it('hmm', async () => {
  //   scrimService.createMatchupNoAutofill(users);
  // });
});

const createTestUser = (role?: Role, name?: string, elo?: number) =>
  userSchema.parse({
    id: chance.guid(),
    leagueIGN: name || chance.name(),
    rank: 'GOLD',
    region: 'EUW',
    main: role,
    secondary: role == 'MID' ? "SUPPORT": "MID",
    elo: elo
  });

const users: User[] = [
  createTestUser('TOP', 'huzzle', 2100),
  createTestUser('TOP', 'rayann', 1821),
  createTestUser('JUNGLE', 'mika', 2400),
  createTestUser('JUNGLE', 'kharann', 1700),
  createTestUser('MID', 'zero', 1400),
  createTestUser('MID', 'yyaen', 1657),
  createTestUser('BOT', 'mo', 2400),
  createTestUser('BOT', 'z', 1900),
  createTestUser('SUPPORT', 'tikka', 1800),
  createTestUser('SUPPORT', 'zironic', 659)
];
