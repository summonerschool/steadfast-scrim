import { Matchup, Pool, Team } from '../entities/matchmaking';
import { GameSide, Player } from '../entities/scrim';
import { ROLE_ORDER, User } from '../entities/user';
import { NoMatchupPossibleError } from '../errors/errors';
import { chance } from '../lib/chance';

export interface MatchmakingService {
  startMatchmaking: (users: User[]) => { players: Player[]; eloDifference: number };
}

export const initMatchmakingService = () => {
  const service: MatchmakingService = {
    startMatchmaking: (users) => {
      let playerPool = calculatePlayerPool(users);
      let combinations = generateAllPossibleTeams(playerPool);
      // team vs team with elo difference. The players are sorted by their ID within the team
      let res = generateMatchups(combinations, users);
      if (!res.valid) {
        throw new NoMatchupPossibleError('0 matchups possible');
      }
      const { team1, team2, eloDifference } = res.matchup;
      // // Randomly assign ingame side to the teams
      const teams = chance.shuffle([team1, team2]);
      const blueTeam = teamToPlayers(teams[0], 'BLUE', users);
      const redTeam = teamToPlayers(teams[1], 'RED', users);
      return { players: [...blueTeam, ...redTeam], eloDifference };
    }
  };
  return service;
};

const teamToPlayers = (team: Team, side: GameSide, users: User[]) => {
  const players: Player[] = team.map((player) => {
    const user = users.find((u) => u.id == player.id)!!;
    const isOnOffrole = user.elo > player.elo;
    return { userID: user.id, role: isOnOffrole ? user.secondary : user.main, side: side };
  });
  return players;
};

// Probably needs adjustments
const OFFROLE_PENALTY: { [key in User['rank']]: number } = {
  IRON: 200,
  BRONZE: 200,
  SILVER: 200,
  GOLD: 200,
  PLATINUM: 200,
  DIAMOND: 200,
  MASTER: 200,
  GRANDMASTER: 200,
  CHALLENGER: 200
};

// Puts every user into a pool based on role.
export const calculatePlayerPool = (users: User[], includeSecondary = false) => {
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

export const generateMatchups = (
  combinations: Team[],
  users: User[]
): { valid: true; matchup: Matchup } | { valid: false } => {
  let bestLeastOffroleMatchup: Matchup | undefined = undefined;
  let bestEloFairMatchup: Matchup | undefined = undefined;

  const getOffroleCount = createCountOffroleHandler(users);
  for (let i = 0; i < combinations.length; i++) {
    const team = combinations[i];
    for (let j = i; j < combinations.length; j++) {
      const enemy = combinations[j];
      // check if there exist a
      const eloDifference = calculateEloDifference(team, enemy);
      const noSharedPlayers = !team.some((player) => enemy.some((p) => player.id == p.id));
      const offroleCount = getOffroleCount(enemy) + getOffroleCount(team);

      // If the current offrole count is lower, replace the current best matchup
      // If the current offrole count is equal/lower and the elo difference is better, replace the matchup
      // Both teams needs to not share any common enemies
      if (noSharedPlayers) {
        const matchup = { team1: team, team2: enemy, eloDifference, offroleCount };
        // if no best matchups have been set yet, set it right away
        if (!bestEloFairMatchup || !bestLeastOffroleMatchup) {
          bestEloFairMatchup = matchup;
          bestLeastOffroleMatchup = matchup;
          break;
        }
        // TODO: holyshit clean this up
        if (offroleCount < bestLeastOffroleMatchup.offroleCount) {
          bestLeastOffroleMatchup = matchup;
        } else if (offroleCount == bestLeastOffroleMatchup.offroleCount) {
          if (eloDifference < bestLeastOffroleMatchup.eloDifference) {
            bestLeastOffroleMatchup = matchup;
          } else if (eloDifference == bestLeastOffroleMatchup.eloDifference) {
            if (hasFairerLaneMatchups(matchup, bestLeastOffroleMatchup)) bestLeastOffroleMatchup = matchup;
          }
        }

        if (eloDifference <= bestEloFairMatchup.eloDifference) {
          if (eloDifference == bestEloFairMatchup.eloDifference) {
            if (hasFairerLaneMatchups(matchup, bestEloFairMatchup)) bestEloFairMatchup = matchup;
          } else {
            bestEloFairMatchup = matchup;
          }
        }
      }
    }
  }
  if (!bestLeastOffroleMatchup) {
    return { valid: false };
  }
  console.info(matchupToString(bestLeastOffroleMatchup));
  console.info(matchupToString(bestEloFairMatchup!!));
  return { valid: true, matchup: bestLeastOffroleMatchup };
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

const gethighestLaneDiff = (m: Matchup) => {
  let highestDiff = 0;
  for (let i = 0; i < 5; i++) {
    const diff = Math.abs(m.team1[i].elo - m.team2[i].elo);
    if (diff > highestDiff) highestDiff = diff;
  }
  return highestDiff;
};

const hasFairerLaneMatchups = (m1: Matchup, m2: Matchup) => {
  const m1diff = gethighestLaneDiff(m1);
  const m2diff = gethighestLaneDiff(m2);
  return m1diff < m2diff;
};

const matchupToString = (matchup: Matchup) => {
  return `
  Elo Difference: ${matchup.eloDifference}\n
  Lane fair lane: ${gethighestLaneDiff(matchup)}\n
  ${matchup.team1.map((p) => p.leagueIGN).join(', ')} vs ${matchup.team2.map((p) => p.leagueIGN).join(', ')}\n
  ${matchup.team1.map((p) => p.elo)} vs ${matchup.team2.map((p) => p.elo)}
  `;
};

export const calculateEloDifference = (t1: Team, t2: Team) => {
  const elo1 = t1.reduce((prev, curr) => prev + (curr.elo || 0), 0);
  const elo2 = t2.reduce((prev, curr) => prev + (curr.elo || 0), 0);
  return Math.abs(elo1 - elo2);
};
