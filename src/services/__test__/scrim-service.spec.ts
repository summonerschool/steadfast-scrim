import { initUserRepository, UserRepository } from '../repo/user-repository';
import { generateAllPossibleTeams, initScrimService, noCommonPlayers, removeDuplicates } from '../scrim-service';
import { mockDeep } from 'jest-mock-extended';
import { chance } from '../../lib/chance';
import { Role, roleEnum, User, userSchema } from '../../entities/user';
import { ScrimRepository } from '../repo/scrim-repository';
import { Rank } from '@prisma/client';

const roleToPlayer = (role: Role): User =>
  userSchema.parse({
    id: chance.guid(),
    leagueIGN: chance.name(),
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
      server: 'EUW',
      roles: []
    }));
    userRepository.getUsers.mockResolvedValueOnce(mockGetUsersResult);
    const summoners = encodeURIComponent(mockGetUsersResult.map((user) => user.leagueIGN).join(','));
    const expected = `https://op.gg/multisearch/euw?summoners=${summoners}`;
    await expect(scrimService.generateScoutingLink(1, 'RED')).resolves.toEqual(expected);
  });

  it('perfect match', async () => {
    // makes of 2 of each role (10 in total)
    const roles = [...roleEnum.options, ...roleEnum.options];
    let users: User[] = roles.map((role) => ({
      id: chance.guid(),
      leagueIGN: chance.name(),
      rank: 'GOLD',
      server: 'EUW',
      roles: [role]
    }));
    const twoOfEachRole = scrimService.canCreatePerfectMatchup(users);
    expect(twoOfEachRole).toBe(true);
  });

  it('creates perfect match', async () => {
    let tenUsers: User[] = [...roleEnum.options, ...roleEnum.options].map((role) => ({
      id: chance.guid(),
      leagueIGN: chance.name(),
      rank: 'GOLD',
      server: 'EUW',
      roles: [role]
    }));
    const blue = tenUsers.slice(0, 5);
    let red = tenUsers.slice(5, 10);
    expect(noCommonPlayers(blue, red)).toBe(true);
    red = [...red.slice(0, 4), blue[0]];
    expect(noCommonPlayers(blue, red)).toBe(false);
  });

  it('hmm', async () => {
    const pool: Role[][] = [
      ['TOP', 'TOP'],
      ['JUNGLE', 'JUNGLE'],
      ['MID', 'MID'],
      ['BOT', 'BOT'],
      ['SUPPORT', 'SUPPORT']
    ];
    let i = 0;
    const elos = [2100, 1821, 2400, 1700, 1400, 1657, 2400, 1900, 1800, 659];
    const playerPool: User[][] = pool.map((rolePool) =>
      rolePool.map((role) => {
        const user = roleToPlayer(role);
        user.elo = elos[i];
        i += 1;
        return user;
      })
    );

    const combinations = generateAllPossibleTeams(playerPool);
    removeDuplicates(combinations);
  });
});
