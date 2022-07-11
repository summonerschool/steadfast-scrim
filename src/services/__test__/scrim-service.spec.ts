import { UserRepository } from '../repo/user-repository';
import { initScrimService } from '../scrim-service';
import { mockDeep } from 'jest-mock-extended';
import { chance } from '../../lib/chance';
import { User } from '../../entities/user';

describe('ScrimService', () => {
  const userRepository = mockDeep<UserRepository>();
  const scrimService = initScrimService(userRepository);

  it('Randomly distributes roles and teams to 10 players', async () => {
    const userIDs = [...Array(10)].map(() => chance.integer({ min: 10 ** 7, max: 10 ** 8 }).toString());
    const players = await scrimService.randomTeambalance(userIDs);
    // Check if team each team is same size
    const blueTeam = players.filter((player) => player.team === 'BLUE');
    const redTeam = players.filter((player) => player.team === 'RED');
    expect(blueTeam.length).toEqual(redTeam.length);
    // Check if roles are equally distributed
    const blueRoles = blueTeam.map((player) => player.role);
    const redRoles = redTeam.map((player) => player.role);
    expect(new Set(blueRoles).size).toEqual(blueRoles.length);
    expect(new Set(redRoles).size).toEqual(redRoles.length);
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
    const expected = `https://euw.op.gg/multisearch/euw?summoners=${summoners}`;
    await expect(scrimService.generateScoutingLink(1, 'RED')).resolves.toEqual(expected);
  });
});
