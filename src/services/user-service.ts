import type {PrismaClient, User} from '@prisma/client';
import {NotFoundError} from '../errors/errors';
import type {SetupInput} from '../schemas/user';

export interface UserService {
  setUserProfile(id: string, input: SetupInput, elo: number): Promise<User>;
  updateElo(id: string, elo?: number, externalElo?: number): Promise<User>;
  setHighEloQueue(id: string, value: boolean): Promise<User>;
  getUserProfile(id: string): Promise<User>;
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

  async setHighEloQueue(id: string, value: boolean = true): Promise<User> {
    return await this.prisma.user.update({
      where: {id},
      data: {highElo: value}
    });
  }

  async getUserProfile(id: string): Promise<User> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundError(`User(<@${id}>) does not have a profile. Please use /setup`);
    return user;
  }

  async getUsers(ids: string[]): Promise<User[]> {
    return await this.prisma.user.findMany({ where: { id: { in: ids } } });
  }
}
