import { rankEnum, Region, User, userSchema } from '../entities/user';
import { NotFoundError } from '../errors/errors';
import { UserRepository } from './repo/user-repository';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import { LeagueEntry, SummonerResponse } from '../entities/riot';
import { ELO_TRANSLATION, RIOT_SERVERS } from '../utils/utils';
dotenv.config();

export interface UserService {
  setUserProfile: (
    id: string,
    leagueIGN: string,
    rank: string,
    server: string,
    main: string,
    secondary: string,
    elo?: number,
    external_elo?: number
  ) => Promise<User>;
  setUserElo: (id: string, elo: number, external_elo?: number | undefined) => Promise<User>;
  getUserProfile: (id: string) => Promise<User>;
  fetchMyMMR: (server: string, leagueIGN: string) => Promise<{ elo: number; rank: string }>;
  fetchExternalUserMMR: (region: Region, leagueIGN: string) => Promise<{ elo: number; rank: string }>;
}

export const initUserService = (userRepo: UserRepository): UserService => {
  const service: UserService = {
    setUserProfile: async (id, leagueIGN, rank, region, main, secondary, elo?: number, external_elo?: number) => {
      const data = { id, leagueIGN, rank, region, main, secondary, elo, external_elo };
      const user = userSchema.parse(data);
      return userRepo.upsertUser(user);
    },
    setUserElo: async (id, elo, external_elo) => {
      const data = { id, elo, external_elo };

      if (!external_elo) {
        delete data.external_elo;
      }

      const user = userSchema.parse(data);
      return userRepo.upsertUser(user);
    },
    getUserProfile: async (id) => {
      const user = await userRepo.getUserByID(id);
      if (!user) throw new NotFoundError(`User(<@${id}>) does not have a profile. Please use /setup`);
      return user;
    },
    fetchExternalUserMMR: async (region: Region, leagueIGN: string) => {
      try {
        const SUMMONER_API_URL = new URL(
          `https://${
            RIOT_SERVERS[region]
          }.api.riotgames.com/lol/summoner/v4/summoners/by-name/${leagueIGN.toLowerCase()}`
        );
        console.log(SUMMONER_API_URL);
        const RIOT_KEY = process.env.RIOT_API_KEY!!;
        const summonerResponse = await fetch(SUMMONER_API_URL, {
          headers: {
            'X-Riot-Token': RIOT_KEY
          }
        });
        const summoner: SummonerResponse = await summonerResponse.json();
        const LEAGUE_API_URL = new URL(
          `https://${RIOT_SERVERS[region]}.api.riotgames.com/lol/league/v4/entries/by-summoner/${summoner.id}`
        );
        const leagueResponse = await fetch(LEAGUE_API_URL, {
          headers: {
            'X-Riot-Token': RIOT_KEY
          }
        });
        const rankedInfo: LeagueEntry[] = await leagueResponse.json();
        const rankedSolo = rankedInfo.find((entry) => entry.queueType === 'RANKED_SOLO_5x5');
        console.log(rankedSolo);
        if (!rankedSolo) {
          return { elo: ELO_TRANSLATION['GOLD'], rank: 'GOLD' };
        }
        let elo = ELO_TRANSLATION[rankedSolo.tier];
        return { elo, rank: rankedSolo.rank };
      } catch (e) {
        console.log(e);
        return { elo: ELO_TRANSLATION['GOLD'], rank: 'GOLD' };
      }
    },
    fetchMyMMR: async (server, leagueIGN) => {
      let rank: string;

      const mymmr = await fetch(`https://${server}.whatismymmr.com/api/v1/summoner?name=${leagueIGN}`)
        .then((response) => response.json())
        .catch(() => {
          throw new NotFoundError(`user rank not found, please verify details and try again.`);
        });

      if (mymmr.error) {
        throw new NotFoundError(mymmr.error.message);
      }

      const elo = mymmr.ranked.avg || mymmr.normal.avg || mymmr.aram.avg || 0; // TODO: set some defaults ???

      rank = mymmr.ranked.closestRank || mymmr.normal.closestRank || mymmr.aram.closestRank || '';
      rank = rank.split(' ')[0].toUpperCase();

      return {
        rank: rank,
        elo: elo
      };
    }
  };
  return service;
};
