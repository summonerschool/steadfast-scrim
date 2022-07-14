import { initUserRepository, UserRepository } from '../repo/user-repository';
import { initScrimService } from '../scrim-service';
import { mockDeep } from 'jest-mock-extended';
import { chance } from '../../lib/chance';
import { roleEnum, User, userSchema } from '../../entities/user';
import { initScrimRepository, ScrimRepository } from '../repo/scrim-repository';
import { PrismaClient, Rank, Role, Server } from '@prisma/client';

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
    scrimService.matchmakeTwoEach(users);
    users[0].roles = ['MID'];
    const notTwoOfEach = scrimService.canCreatePerfectMatchup(users);
    expect(notTwoOfEach).toBe(false);
  });
  it('creates perfect match', async () => {
    const roles = [...roleEnum.options, ...roleEnum.options];
    console.log(roles)
    let users: User[] = roles.map((role) => ({
      id: chance.guid(),
      leagueIGN: chance.name(),
      rank: 'GOLD',
      server: 'EUW',
      roles: [role]
    }));
    users.
  });

  // it('hmm', async () => {
  //   const client = new PrismaClient();
  //   const ids = [...new Array(10)].map(() => chance.guid());
  //   const users = await client.user.createMany({
  //     data: ids.map((id) => ({
  //       id: id,
  //       league_ign: chance.name(),
  //       server: Server.EUW,
  //       rank: Rank.BRONZE,
  //       roles: [Role.JUNGLE]
  //     }))
  //   });
  //   const realS = initScrimRepository(client);
  //   const realU = initUserRepository(client);
  //   const realService = initScrimService(realS, realU);
  //   realService
  //     .createBalancedScrim('6e39f3c5-e4cf-4966-b15f-a02340240a4e', ids)
  //     .then((res) => console.log(res))
  //     .catch((err) => console.log(err));
  // });
});
