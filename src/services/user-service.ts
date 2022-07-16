import { User, userSchema } from '../entities/user';
import { NotFoundError } from '../errors/errors';
import { UserRepository } from './repo/user-repository';
import { RiotAPI, RiotAPITypes } from '@fightmegg/riot-api';
import fetch from 'node-fetch';
import { userService } from './index';
import { ELO_TRANSLATION } from '../utils/utils';

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
  fetchRiotUser: (server: RiotAPITypes.LoLRegion, league_ign: string) => Promise<RiotAPITypes.Summoner.SummonerDTO>
  fetchRiotRank: (
    server: RiotAPITypes.LoLRegion,
    summoner: RiotAPITypes.Summoner.SummonerDTO | string
  ) => Promise<{ elo: number; rank: string }>;
  fetchMyMMR: (server: string, leagueIGN: string) => Promise<{ elo: number; rank: string }>;
  // getUsersByScrim: (scrimID: string) => Promise<User[]>;
}

export const initUserService = (userRepo: UserRepository, rAPI: RiotAPI): UserService => {
  const service: UserService = {
    setUserProfile: async (id, leagueIGN, rank, region, main, secondary, elo?: number, external_elo?: number) => {
      const data = { id, leagueIGN, rank, region, main, secondary, elo, external_elo };
      console.log(data)
      const user = userSchema.parse(data);
      console.log(user)
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
    fetchRiotUser: async (server, league_ign) => {
      const summoner: RiotAPITypes.Summoner.SummonerDTO = await rAPI.summoner
        .getBySummonerName({
          region: server,
          summonerName: league_ign
        })
        .catch(() => {
          throw new NotFoundError(`League user not found, please verify details and try again.`);
        });

      return summoner;
    },
    fetchRiotRank: async (server, summoner) => {
      let rank = 'GOLD';
      let elo = ELO_TRANSLATION[rank];

      if (typeof summoner === 'string') {
        // summoner = await userService.fetchRiotUser(server, summoner);
      }

      // const entries = await rAPI.league
      //   .getEntriesBySummonerId({
      //     region: server,
      //     summonerId: summoner.id
      //   })
      //   .catch(() => {
      //     throw new NotFoundError(`League user not found, please verify details and try again.`);
      //   });

      // if (entries.length) {
      //   const entry = entries[0];
      //   rank = entry.tier;
      //   elo = ELO_TRANSLATION[rank];
      // }

      return {
        rank: rank,
        elo: elo
      };
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
    // getUsersByScrim: async (scrimID) => {
    //   // get IDS from a game
    //   return;
    // }
  };
  return service;
};
