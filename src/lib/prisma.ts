import { PrismaClient } from '@prisma/client'

let client: PrismaClient | undefined

export function getDefaultPrisma(): PrismaClient {
  if (!client) {
    client = new PrismaClient()
  }
  return client
}

export const prisma = getDefaultPrisma()

