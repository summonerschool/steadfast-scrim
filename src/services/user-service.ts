import type { PrismaClient, User } from '@prisma/client';
import axios from 'axios';
import { NotFoundError } from '../errors/errors';
import type { WhatIsMyMMRResponse } from '../models/external';
import type { SetupInput } from '../schemas/user';
import { ELO_TRANSLATION } from '../utils/utils';

export interface UserService {
  setUserProfile(id: string, input: SetupInput, elo: number): Promise<User>;
  updateElo(id: string, elo?: number, externalElo?: number): Promise<User>;
  getUserProfile(id: string): Promise<User>;
  fetchMyMMR(server: string, leagueIGN: string): Promise<{ rank: string; elo: number }>;
  getUsers(ids: string[]): Promise<User[]>;
}

export class UserServiceImpl implements UserService {
  constructor(private prisma: PrismaClient) {}

  async setUserProfile(id: string, input: SetupInput, elo: number): Promise<User> {
    const { ign, ...user } = input;
    const res = await this.prisma.user.upsert({
      where: { id: id },
      create: { id, elo, externalElo: elo, leagueIGN: ign, ...user },
      update: { leagueIGN: input.ign, ...user }
    });
    return res;
  }

  async updateElo(id: string, elo?: number, externalElo?: number): Promise<User> {
    if (!elo && !externalElo) throw new Error('You must provide at least one type of elo');
    const user = await this.prisma.user.update({
      where: { id },
      data: { elo, externalElo: externalElo }
    });
    return user;
  }

  async getUserProfile(id: string): Promise<User> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundError(`User(<@${id}>) does not have a profile. Please use /setup`);
    return user;
  }

  async fetchMyMMR(server: string, leagueIGN: string): Promise<{ rank: string; elo: number }> {
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
  }

  async getUsers(ids: string[]): Promise<User[]> {
    return await this.prisma.user.findMany({ where: { id: { in: ids } } });
  }
}
