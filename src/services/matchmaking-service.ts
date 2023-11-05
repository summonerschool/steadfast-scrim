import type { User, Side, Prisma, Rank } from '@prisma/client';
import { Role } from '@prisma/client';
import { NoMatchupPossibleError } from '../errors/errors';
import { chance } from '../lib/chance';
import type { Matchup, Pool, Team } from '../models/matchmaking';
import { ROLE_ORDER, ROLE_ORDER_TO_ROLE } from '../models/matchmaking';

export interface MatchmakingService {
  startMatchmaking: (users: User[], fillers?: string[]) => [Matchup, Matchup];
  matchupToPlayers: (matchup: Matchup, fillers: string[]) => Omit<Prisma.PlayerCreateManyInput, 'scrimId'>[];
  attemptFill: (users: User[], queuedFill?: string[]) => { users: User[]; fillers: string[] };
}

// Generate a pool
// Calculate the possible teams
// Find the best matchup
export const initMatchmakingService = () => {
  const service: MatchmakingService = {
    startMatchmaking: (users, fillers = []) => {
      const playerPool = calculatePlayerPool(users, fillers);
      const combinations = generateAllPossibleTeams(playerPool);
      // team vs team with elo difference. The players are sorted by their ID within the team
      const res = findBestMatchup(combinations, users);
      if (!res.valid) {
        throw new NoMatchupPossibleError('No matchups possible with the chosen roles.');
      }
      return [res.matchupByOffrole, res.matchupByElo];
    },
    matchupToPlayers: (matchup, fillers) => {
      const { team1, team2 } = matchup;
      // // Randomly assign ingame side to the teams
      const teams = chance.shuffle([team1, team2]);
      const userToPlayer =
        (side: Side) =>
        (user: User, i: number): Omit<Prisma.PlayerCreateManyInput, 'scrimId'> => {
          const role = Role[ROLE_ORDER_TO_ROLE[i]];
          const isOffRole = user.secondary === Role[role];
          return {
            userId: user.id,
            side: side,
            role,
            pregameElo: isOffRole ? user.elo + OFFROLE_PENALTY[user.rank] : user.elo,
            isOffRole,
            isAutoFill: fillers.includes(user.id)
          };
        };

      return [...teams[0].map(userToPlayer('BLUE')), ...teams[1].map(userToPlayer('RED'))];
    },
    attemptFill: (queuers, queuedFill) => {
      const fillers = queuedFill || [];
      const ROLE_COUNT = 10;
      const PLAYER_COUNT = 10;
      // Randomize, but let autofill protected people come first
      const users = chance.shuffle(queuers).sort((a, b) => {
        if (a.autofillProtected && b.autofillProtected) return 0;
        else if (a.autofillProtected && !b.autofillProtected) return -1;
        else if (!a.autofillProtected && b.autofillProtected) return 1;
        else return 0;
      });
      // create graph of players
      const graph = [];
      for (const user of users) {
        const row = [...new Array(ROLE_COUNT)].map(() => false);
        row[ROLE_ORDER[user.main]] = true;
        row[ROLE_ORDER[user.secondary]] = true;
        row[ROLE_ORDER[user.main] + 5] = true;
        row[ROLE_ORDER[user.secondary] + 5] = true;
        graph.push(row);
      }

      // Availaible roles
      const matchRoles = [...new Array(ROLE_COUNT)].map(() => -1);
      let result = 0;
      for (let u = 0; u < PLAYER_COUNT; u++) {
        const seen = [...new Array(ROLE_COUNT)].map(() => false);
        if (bpm(graph, u, seen, matchRoles)) {
          result++;
        }
      }
      console.info({ result, matchRoles });
      if (result === PLAYER_COUNT) {
        return { users, fillers };
      }

      const seen = [...new Array(PLAYER_COUNT)].map(() => false);
      for (let i = 0; i < matchRoles.length; i++) {
        if (matchRoles[i] > -1) seen[matchRoles[i]] = true;
      }
      for (let i = 0; i < matchRoles.length; i++) {
        if (matchRoles[i] === -1) {
          const uIndex = seen.findIndex((val) => val == false);
          matchRoles[i] = uIndex;
          seen[uIndex] = true;
          console.log(`User(${users[uIndex].leagueIGN}) has been autofilled`);
          fillers.push(users[uIndex].id);
        }
      }
      return { users, fillers };
    }
  };
  return service;
};

export const OFFROLE_PENALTY: { [key in Rank]: number } = {
  IRON: 100,
  BRONZE: 150,
  SILVER: 200,
  GOLD: 250,
  PLATINUM: 250,
  EMERALD: 250,
  DIAMOND: 225,
  MASTER: 200,
  GRANDMASTER: 150,
  CHALLENGER: 100
};
// Puts every user into a pool based on role.
export const calculatePlayerPool = (users: User[], fillers: string[]) => {
  const talentPool: Pool = [[], [], [], [], []];
  for (const user of users) {
    talentPool[ROLE_ORDER[user.main]].push(user);
  }
  console.log(talentPool.map((p) => p.map((u) => u.leagueIGN)));
  if (talentPool.some((rp) => rp.length < 2)) {
    for (const user of users) {
      const elo = user.elo - OFFROLE_PENALTY[user.rank];
      if (fillers.includes(user.id)) {
        talentPool.forEach((p) => {
          if (!p.some((u) => u.id === user.id)) {
            p.push({ ...user, elo });
          }
        });
      } else {
        const index = ROLE_ORDER[user.secondary];
        const pool = talentPool[index];
        if (!pool.some((u) => u.id === user.id)) {
          pool.push({ ...user, elo });
        }
      }
    }
  }
  console.log(talentPool.map((p) => p.map((u) => u.leagueIGN)));
  return talentPool;
};

// Generates all possible teams.
export const generateAllPossibleTeams = (pool: User[][]) => {
  const combinations: Team[] = [];
  // generates every team combination, very inefficent
  const combine = (lists: User[][], acum: User[]) => {
    const last = lists.length === 1;
    for (const i in lists[0]) {
      const next = lists[0][i];
      const item = [...acum, next];
      const users = item.map((u) => u.id);
      // No team can consist the same player
      if (last && new Set(users).size === users.length) combinations.push(item as Team);
      else combine(lists.slice(1), item);
    }
  };
  combine(pool, []);
  return combinations;
};

export const findBestMatchup = (
  combinations: Team[],
  users: User[]
): { valid: true; matchupByElo: Matchup; matchupByOffrole: Matchup } | { valid: false } => {
  let bestMatchupByOffroleCount: Matchup | undefined = undefined;
  let bestMatchupByEloDiff: Matchup | undefined = undefined;

  const getOffroleCount = createCountOffroleHandler(users);

  for (let i = 0; i < combinations.length; i++) {
    const team = combinations[i];
    for (let j = i; j < combinations.length; j++) {
      const enemy = combinations[j];
      // check if the teams share players
      const noSharedPlayers = !team.some((player) => enemy.some((p) => player.id == p.id));

      if (noSharedPlayers) {
        const eloDifference = calculateEloDifference(team, enemy);
        const offroleCount = getOffroleCount(enemy) + getOffroleCount(team);
        const leastFairLaneDiff = getHighestLaneDiff(team, enemy);

        const matchup = { team1: team, team2: enemy, eloDifference, offroleCount, leastFairLaneDiff };
        // if no best matchups have been set yet, set it right away
        if (!bestMatchupByEloDiff || !bestMatchupByOffroleCount) {
          bestMatchupByEloDiff = matchup;
          bestMatchupByOffroleCount = matchup;
          break;
        }
        // offrole > elo diff > lanediff
        bestMatchupByOffroleCount = [bestMatchupByOffroleCount, matchup]
          .sort(compareLaneDiff)
          .sort(compareElodifference)
          .sort(compareOffrole)[0];
        // Elo diff > offrole > lanediff
        bestMatchupByEloDiff = [bestMatchupByEloDiff, matchup]
          .sort(compareLaneDiff)
          .sort(compareOffrole)
          .sort(compareElodifference)[0];
      }
    }
  }

  if (!bestMatchupByOffroleCount || !bestMatchupByEloDiff) {
    return { valid: false };
  }
  console.info(
    `Matchup by offrole: ${matchupToString(bestMatchupByOffroleCount)}\nMatchup by elo: ${matchupToString(
      bestMatchupByEloDiff
    )}`
  );

  return { valid: true, matchupByOffrole: bestMatchupByOffroleCount, matchupByElo: bestMatchupByEloDiff };
};

const compareOffrole = (m1: Matchup, m2: Matchup) => {
  if (m1.offroleCount < m2.offroleCount) {
    return -1;
  } else if (m1.offroleCount === m2.offroleCount) {
    return 0;
  } else {
    return 1;
  }
};

const compareElodifference = (m1: Matchup, m2: Matchup) => {
  if (m1.eloDifference < m2.eloDifference) {
    return -1;
  } else if (m1.eloDifference === m2.eloDifference) {
    return 0;
  } else {
    return 1;
  }
};

const compareLaneDiff = (m1: Matchup, m2: Matchup) => {
  if (m1.leastFairLaneDiff < m2.leastFairLaneDiff) {
    return -1;
  } else if (m1.leastFairLaneDiff === m2.leastFairLaneDiff) {
    return 0;
  } else {
    return 1;
  }
};

const createCountOffroleHandler = (initialUsers: User[]) => (team: Team) => {
  let counter = 0;
  for (const u of team) {
    const user = initialUsers.find((initial) => initial.id === u.id);
    // The user is on offrole if they have less elo than the initial one
    if (user && user.elo > u.elo) {
      counter += 1;
    }
  }
  return counter;
};

const getHighestLaneDiff = (t1: Team, t2: Team) => {
  let highestDiff = 0;
  for (let i = 0; i < 5; i++) {
    const diff = Math.abs(t1[i].elo - t2[i].elo);
    if (diff > highestDiff) highestDiff = diff;
  }
  return highestDiff;
};

export const calculateEloDifference = (t1: Team, t2: Team) => {
  const elo1 = t1.reduce((prev, curr) => prev + (curr.elo || 0), 0);
  const elo2 = t2.reduce((prev, curr) => prev + (curr.elo || 0), 0);
  return Math.abs(elo1 - elo2);
};

const matchupToString = (matchup: Matchup) => {
  return `
  Elo Difference: ${matchup.eloDifference}
  Lane fair lane: ${matchup.leastFairLaneDiff}
  ${matchup.team1.map((p) => p.leagueIGN).join(', ')} vs ${matchup.team2.map((p) => p.leagueIGN).join(', ')}
  ${matchup.team1.map((p) => p.elo)} vs ${matchup.team2.map((p) => p.elo)}
  `;
};

const bpm = (bpGraph: boolean[][], u: number, seen: boolean[], matchRoles: number[]): boolean => {
  for (let v = 0; v < 10; v++) {
    if (bpGraph[u][v] && !seen[v]) {
      seen[v] = true;
      if (matchRoles[v] < 0 || bpm(bpGraph, matchRoles[v], seen, matchRoles)) {
        matchRoles[v] = u;
        return true;
      }
    }
  }
  return false;
};
