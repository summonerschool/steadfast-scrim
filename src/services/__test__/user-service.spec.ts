// import { Chance } from 'chance';
import { mockDeep } from 'jest-mock-extended';
import { User } from '../../entities/user';
import { UserRepository } from '../repo/user-repository';
import { initUserService } from '../user-service';

describe('UserService', () => {
  const userRepository = mockDeep<UserRepository>();
  const userService = initUserService(userRepository);
  // const chance = new Chance('UserService');

  it('Creates an user', async () => {
    const user: User = {
      id: 'user1',
      leagueIGN: 'kharann',
      rank: 'GOLD',
      region: 'EUW',
      main: 'JUNGLE',
      secondary: 'MID',
      elo: 0
    };
    userRepository.upsertUser.mockResolvedValueOnce(user);
    const res = userService.setUserProfile(
      user.id,
      user.leagueIGN,
      user.rank,
      user.region,
      user.main,
      user.secondary,
      1700,
      1700
    );
    console.log(res);
  });
});
