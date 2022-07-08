import { PrismaClient } from '@prisma/client';

interface QueueRepository {
  addUserToQueue: (userID: string) => void;
}

const initQueueRepository = (client: PrismaClient) => {
  const repo: QueueRepository = {
    addUserToQueue: (userID) => {
    }
  };
  return repo;
};
