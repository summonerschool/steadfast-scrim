import { NotFoundError } from '../errors/errors';
import { WhatIsMyMMRResponse } from '../models/external';
import axios from 'axios';
import { ELO_TRANSLATION } from '../utils/utils';
import { SetupInput } from '../schemas/user';
import { PrismaClient, User } from '@prisma/client';

export interface UserService {
  setUserProfile: (id: string, input: SetupInput, elo: number) => Promise<User>;
  updateElo: (id: string, elo?: number, externalElo?: number) => Promise<User>;
  getUserProfile: (id: string) => Promise<User>;
  fetchMyMMR: (server: string, leagueIGN: string) => Promise<{ elo: number; rank: string | null }>;
  getUsers: (ids: string[]) => Promise<User[]>;
}

export const initUserService = (prisma: PrismaClient): UserService => {
  const service: UserService = {
    setUserProfile: async (id, input, elo) => {
      const { ign, ...user } = input;
      const res = await prisma.user.upsert({
        where: { id: id },
        create: { id, elo, externalElo: elo, leagueIGN: ign, ...user },
        update: { leagueIGN: input.ign, ...user }
      });
      return res;
    },
    updateElo: async (id, elo, externalElo) => {
      if (!elo && !externalElo) throw new Error('You must provide at least one type of elo');
      const user = await prisma.user.update({
        where: { id },
        data: { elo, externalElo: externalElo }
      });
      return user;
    },
    getUserProfile: async (id) => {
      const user = await prisma.user.findUnique({ where: { id } });
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
      const elo = mymmr.ranked.avg || ELO_TRANSLATION[rank];

      return {
        rank: rank,
        elo: elo
      };
    },
    getUsers: async (ids) => {
      return await prisma.user.findMany({ where: { id: { in: ids } } });
    }
  };
  return service;
};
