import { User, userSchema } from '../entities/user';
import { NotFoundError } from '../errors/errors';
import { UserRepository } from './repo/user-repository';
import dotenv from 'dotenv';
import { WhatIsMyMMRResponse } from '../entities/external';
import axios from 'axios';
import { ELO_TRANSLATION } from '../utils/utils';
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
  fetchMyMMR: (server: string, leagueIGN: string) => Promise<{ elo: number; rank: string | null }>;
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
    fetchMyMMR: async (server, leagueIGN) => {
      const res = await axios.get<WhatIsMyMMRResponse | Error>(
        `https://${server.toLowerCase()}.whatismymmr.com/api/v1/summoner?name=${leagueIGN}`
      );

      if ('message' in res.data) {
        throw new NotFoundError(res.data.message);
      }
      const mymmr = res.data;

      const rank = mymmr.ranked.closestRank.split(' ')[0].toUpperCase();
      const elo = mymmr.ranked.avg || ELO_TRANSLATION[rank]; // TODO: set some defaults ???

      return {
        rank: rank,
        elo: elo
      };
    }
  };
  return service;
};
