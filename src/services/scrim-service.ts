import { Matchup, Pool, Team } from '../entities/matchmaking';
import { Player, playerSchema, Scrim, gamesideEnum, GameSide } from '../entities/scrim';
import { roleEnum, ROLE_ORDER, User } from '../entities/user';
import { chance } from '../lib/chance';
import { ScrimRepository } from './repo/scrim-repository';
import { UserRepository } from './repo/user-repository';


export interface ScrimService {
  generateScoutingLink: (scrimID: number, team: GameSide) => Promise<string>;
  createBalancedScrim: (queueID: string, users: string[]) => Promise<Scrim>;
  randomTeambalance: (userIDs: string[]) => Promise<Player[]>;
  sortPlayerByTeam: (players: Player[]) => { RED: Player[]; BLUE: Player[] };
  isValidTeam: (players: Player[]) => boolean;
  getUserProfilesInScrim: (scrimID: number) => Promise<User[]>;
  canCreatePerfectMatchup: (users: User[]) => boolean;
  createMatchupNoAutofill: (users: User[]) => Matchup[];
  reportWinner: (scrim: Scrim, side: GameSide ) => Promise<boolean>;
}

export const initScrimService = (scrimRepo: ScrimRepository, userRepo: UserRepository) => {
  const TEAM_SIZE = 5;

  const service: ScrimService = {
    // Generates an opgg link for scouting purposes
    generateScoutingLink: async (scrimID, team) => {
      const users = await userRepo.getUsers({ player: { some: { scrim_id: scrimID, team: team } } });
      const summoners = encodeURIComponent(users.map((user) => user.leagueIGN).join(','));
      const server = users[0].region.toLocaleLowerCase();
      const link = `https://op.gg/multisearch/${server}?summoners=${summoners}`;
      return link;
    },
    getUserProfilesInScrim: async (scrimID: number) => {
      const users = await userRepo.getUsers({ player: { some: { scrim_id: scrimID } } });
      return users;
    },
    createBalancedScrim: async (queueID, users) => {
      // Create scrim from queue id and a list of player ids
      const players = await service.randomTeambalance(users);
      const scrim = await scrimRepo.createScrim(queueID, players);
      return scrim;
    },
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
    sortPlayerByTeam: (players) => {
      const red = players.filter((p) => p.team === 'RED');
      const blue = players.filter((p) => p.team === 'BLUE');
      return { RED: red, BLUE: blue };
    },
    // Checks if the team size is correct and that the team has 5 unique different roles.
    isValidTeam: (players: Player[]) => {
      if (players.length != TEAM_SIZE) {
        return false;
      }
      const roles = players.map((p) => p.role);
      return new Set(roles).size === roles.length;
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
    createMatchupNoAutofill: (users) => {
      const playerPool = calculatePlayerPool(users);
      const combinations = generateAllPossibleTeams(playerPool);
      const matchups = combinationsToMatchups(combinations);
      const sortedMatchups = matchups.sort((a,b) => a.eloDifference - b.eloDifference);
      return sortedMatchups
    },
    reportWinner: async (scrim, team) => {
      const updated = await scrimRepo.updateScrim({ ...scrim, winner: team });
      return updated === 1;
    }
  };
  return service;
};


// Puts every user into a pool based on role.
export const calculatePlayerPool = (users: User[], includeSecondary = false) => {
  const talentPool: Pool = [[], [], [], [], []];
  for (const user of users) {
    talentPool[ROLE_ORDER[user.main]].push(user);
  }
  // Adds top 5 players secondary role to the pool
  if (includeSecondary) {
    for (const user of users) {
      talentPool[ROLE_ORDER[user.secondary]].push(user);
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
      const next = lists[0][i]
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
    const team1 = firstHalf[i]
    const team2 = secondhalf[i]
    const eloDifference = calculateEloDifference(team1, team2)
    matchups.push({eloDifference, team1, team2})
  }
  return matchups;
};

// export const noCommonPlayers = (t1: User[], t2: User[]) => {
//   return !t1.some((player) => t2.includes(player));
// };

export const calculateEloDifference = (t1: Team, t2: Team) => {
  const elo1 = t1.reduce((prev, curr) => prev + (curr.elo || 0), 0);
  const elo2 = t2.reduce((prev, curr) => prev + (curr.elo || 0), 0);
  return Math.abs(elo1 - elo2);
};
