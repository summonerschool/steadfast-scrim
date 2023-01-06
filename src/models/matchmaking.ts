import { User } from '@prisma/client';

export type RolePool = User[];
export type Team = [User, User, User, User, User];
export type Pool = [RolePool, RolePool, RolePool, RolePool, RolePool];

export type Matchup = {
  eloDifference: number;
  team1: Team;
  team2: Team;
  offroleCount: number;
  leastFairLaneDiff: number;
};

export const ROLE_ORDER = {
  TOP: 0,
  JUNGLE: 1,
  MID: 2,
  BOT: 3,
  SUPPORT: 4
} as const;

export const ROLE_ORDER_TO_ROLE = ['TOP', 'JUNGLE', 'MID', 'BOT', 'SUPPORT'] as const;

export type GameSide = 'BLUE' | 'RED';

export type LobbyDetails = {
  teamNames: [string, string];
  voiceInvite: [string, string];
  eloDifference: number;
  offroleCount: number;
  autoFilledCount: number;
};
