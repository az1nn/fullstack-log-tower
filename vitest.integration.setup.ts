import { PrismaClient } from '@prisma/client'

export async function setup() {
  if (!process.env.DATABASE_URL) return
  const prisma = new PrismaClient()
  try {
    await prisma.$executeRawUnsafe('TRUNCATE TABLE "Log" RESTART IDENTITY CASCADE;')
  } catch {
  } finally {
    await prisma.$disconnect()
  }
}

export async function teardown() {}
