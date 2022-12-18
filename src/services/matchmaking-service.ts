import { Matchup, Pool, Team } from '../entities/matchmaking';
import { GameSide, Player } from '../entities/scrim';
import { Role, ROLE_ORDER, User } from '../entities/user';
import { NoMatchupPossibleError } from '../errors/errors';
import { chance } from '../lib/chance';

export interface MatchmakingService {
  startMatchmaking: (users: User[], prioritizeElo?: boolean) => [Matchup, Matchup];
  matchupToPlayers: (matchup: Matchup, users: User[], randomSide?: boolean) => Player[];
  attemptFill: (users: User[]) => User[];
}

export const initMatchmakingService = () => {
  const service: MatchmakingService = {
    startMatchmaking: (users, prioritizeElo = false) => {
      const playerPool = calculatePlayerPool(users);
      const combinations = generateAllPossibleTeams(playerPool);
      // team vs team with elo difference. The players are sorted by their ID within the team
      const res = findBestMatchup(combinations, users, prioritizeElo);
      if (!res.valid) {
        throw new NoMatchupPossibleError('No matchups possible with the chosen roles.');
      }
      return [res.matchupByOffrole, res.matchupByElo];
    },
    matchupToPlayers: (matchup, users, randomSide = true) => {
      const { team1, team2 } = matchup;
      // // Randomly assign ingame side to the teams
      const teams = randomSide ? chance.shuffle([team1, team2]) : [team1, team2];
      const blueTeam = teamToPlayers(teams[0], 'BLUE', users);
      const redTeam = teamToPlayers(teams[1], 'RED', users);
      return [...blueTeam, ...redTeam];
    },
    attemptFill: (queuers) => {
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
        return users;
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
          users[uIndex] = { ...users[uIndex], secondary: ROLE_ORDER[i < 5 ? i : i - 5] as Role, isFill: true };
        }
      }
      return users;
    }
  };
  return service;
};

const teamToPlayers = (team: Team, side: GameSide, users: User[]) => {
  const players: Player[] = team.map((player, i) => {
    const user: User = users.find((u) => u.id == player.id)!!;
    return { userID: user.id, role: ROLE_ORDER[i] as Role, side: side, pregameElo: user.elo };
  });
  return players;
};

// Probably needs adjustments
export const OFFROLE_PENALTY: { [key in User['rank']]: number } = {
  IRON: 100,
  BRONZE: 200,
  SILVER: 250,
  GOLD: 300,
  PLATINUM: 350,
  DIAMOND: 300,
  MASTER: 250,
  GRANDMASTER: 200,
  CHALLENGER: 150
};

// Puts every user into a pool based on role.
export const calculatePlayerPool = (users: User[]) => {
  const talentPool: Pool = [[], [], [], [], []];
  for (const user of users) {
    talentPool[ROLE_ORDER[user.main]].push(user);
  }
  if (talentPool.some((rp) => rp.length < 2)) {
    for (const user of users) {
      const index = ROLE_ORDER[user.secondary];
      const elo = user.elo - OFFROLE_PENALTY[user.rank];
      talentPool[index].push({ ...user, elo });
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
  users: User[],
  prioritizeElo?: boolean
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
  console.info({
    offroleCountMatchup: matchupToString(bestMatchupByOffroleCount),
    elodiffMatchup: matchupToString(bestMatchupByEloDiff)
  });

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
