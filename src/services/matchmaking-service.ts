import { Matchup, Pool, Team } from '../entities/matchmaking';
import { Player, playerSchema } from '../entities/scrim';
import { ROLE_ORDER, User } from '../entities/user';
import { chance } from '../lib/chance';

export interface MatchmakingService {
  randomTeambalance: (userIDs: string[]) => Promise<Player[]>;
  canCreatePerfectMatchup: (users: User[]) => boolean;
  matchmakeUsers: (users: User[]) => Matchup[];
}

export const initMatchmakingService = () => {
  const service: MatchmakingService = {
    randomTeambalance: async (userIDs) => {
      const roles = {
        BLUE: chance.shuffle(Object.values(playerSchema.shape.role.enum)),
        RED: chance.shuffle(Object.values(playerSchema.shape.role.enum))
      };
      const users = chance.shuffle(Object.values(userIDs));

      const players = users.map((id, i) => {
        const team = i > 4 ? 'BLUE' : 'RED';
        return playerSchema.parse({
          userID: id,
          role: roles[team].pop(),
          team: team
        });
      });
      return players;
    },
    canCreatePerfectMatchup: (users) => {
      // checks if we have a perfect match
      const mainRoles = new Map<string, number>();
      for (const user of users) {
        // Initialize role at 0 if its not there
        mainRoles.set(user.main, (mainRoles.get(user.main) || 0) + 1);
      }
      let twoOfEach = true;
      for (let count of mainRoles.values()) {
        if (count != 2) {
          twoOfEach = false;
          break;
        }
      }
      return twoOfEach;
    },
    matchmakeUsers: (users) => {
      let playerPool = calculatePlayerPool(users, service.canCreatePerfectMatchup(users));
      const combinations = generateAllPossibleTeams(playerPool);
      const matchups = combinationsToMatchups(combinations);
      const sortedMatchups = matchups.sort((a, b) => a.eloDifference - b.eloDifference);
      return sortedMatchups;
    }
  };
  return service;
};

// Probably needs adjustments
const OFFROLE_PENALTY: { [key in User['rank']]: number } = {
  IRON: 200,
  BRONZE: 200,
  SILVER: 200,
  GOLD: 200,
  PLATINUM: 150,
  DIAMOND: 100,
  MASTER: 100,
  GRANDMASTER: 100,
  CHALLENGER: 100
};

// Puts every user into a pool based on role.
export const calculatePlayerPool = (users: User[], includeSecondary = false) => {
  const talentPool: Pool = [[], [], [], [], []];
  for (const user of users) {
    talentPool[ROLE_ORDER[user.main]].push(user);
  }
  if (includeSecondary) {
    const poolSizes = talentPool.map((rp) => rp.length);
    for (const user of users) {
      const index = ROLE_ORDER[user.secondary];
      if (poolSizes[index] < 2) {
        talentPool[index].push({ ...user, elo: OFFROLE_PENALTY[user.rank] });
      }
    }
  }
  return talentPool;
};

// Generates all possible teams.
export const generateAllPossibleTeams = (pool: User[][]) => {
  const combinations: Team[] = [];
  // generates every team combination, very inefficent
  const combine = (lists: User[][], acum: User[]) => {
    const last = lists.length === 1;
    for (let i in lists[0]) {
      const next = lists[0][i];
      if (acum.includes(next)) {
        return;
      }
      const item = [...acum, next];
      if (last) combinations.push(item as Team);
      else combine(lists.slice(1), item);
    }
  };
  combine(pool, []);
  return combinations;
};

export const combinationsToMatchups = (combinations: Team[]) => {
  const half = combinations.length / 2;
  const firstHalf = combinations.slice(0, half);
  const secondhalf = combinations.slice(half).reverse();
  const matchups: Matchup[] = [];
  for (let i = 0; i < half; i++) {
    const team1 = firstHalf[i];
    const team2 = secondhalf[i];
    const eloDifference = calculateEloDifference(team1, team2);
    matchups.push({ eloDifference, team1, team2 });
  }
  return matchups;
};

export const calculateEloDifference = (t1: Team, t2: Team) => {
  const elo1 = t1.reduce((prev, curr) => prev + (curr.elo || 0), 0);
  const elo2 = t2.reduce((prev, curr) => prev + (curr.elo || 0), 0);
  return Math.abs(elo1 - elo2);
};
