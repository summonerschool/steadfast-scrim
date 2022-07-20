export interface SummonerResponse {
  profileIconId: number;
  name: string;
  puuid: string;
  summonerLevel: number;
  revisionDate: number;
  id: string;
  accountId: string;
}

export interface LeagueEntry {
  leagueId: string;
  summonerId: string;
  summonerName: string;
  queueType: string;
  tier: string;
  rank: string;
  leaguePoints: number;
  wins: number;
  losses: number;
  hotStreak: boolean;
  veteran: boolean;
  freshBlood: boolean;
  inactive: boolean;
}

export interface ProdraftResponse {
  auth: [string, string];
  id: string;
  champions: string[];
  // dont care
  game: object;
}

interface DraftEntry {
  url: string;
  name: string;
}
export interface ProdraftURLs {
  RED: DraftEntry;
  BLUE: DraftEntry;
  SPECTATOR: DraftEntry;
}

interface MMREntry {
  avg: number;
  closestRank: string;
}

export interface WhatIsMyMMRResponse {
  ranked: MMREntry;
  normal: MMREntry;
  ARAM: MMREntry;
}
